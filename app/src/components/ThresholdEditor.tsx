// Eén drempel aanpassen: minimum, maximum en hoe lang een waarde buiten de grens mag blijven.
import { useCallback, useState } from '@lynx-js/react';

import {
  Metric,
  type Threshold,
} from '../generated/restwell/v1/restwell_pb.js';
import { metricLabel } from '../format/measurements.js';
import {
  parseThresholdInput,
  toThresholdInput,
  type ThresholdInput,
} from '../format/thresholdInput.js';
import { errorMessage } from '../grpc/errors.js';
import { updateThreshold } from '../grpc/updateThreshold.js';

const UNITS: Partial<Record<Metric, string>> = {
  [Metric.TEMPERATURE]: '°C',
  [Metric.HUMIDITY]: '%',
  [Metric.LIGHT]: 'ruwe waarde 0–1023',
};

type InputEvent = { detail: { value: string } };

type ThresholdEditorProps = {
  threshold: Threshold;
};

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function Field({ label, value, onChange }: FieldProps) {
  const onInput = useCallback(
    (event: InputEvent) => onChange(event.detail.value),
    [onChange],
  );
  return (
    <view className="ThresholdField">
      <text className="ThresholdField-label">{label}</text>
      {/* default-value: Lynx zet de beginwaarde maar één keer; daarna volgt bindinput. */}
      <input
        className="ThresholdField-input"
        default-value={value}
        type="digit"
        placeholder="geen"
        bindinput={onInput}
      />
    </view>
  );
}

export function ThresholdEditor({ threshold }: ThresholdEditorProps) {
  const [saved, setSaved] = useState(threshold);
  const [input, setInput] = useState<ThresholdInput>(() =>
    toThresholdInput(threshold),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const setField = useCallback(
    (field: keyof ThresholdInput) => (value: string) => {
      setInput((current) => ({ ...current, [field]: value }));
      setMessage(undefined);
    },
    [],
  );

  const onSave = useCallback(() => {
    // Netwerkcode in een tap-handler: alleen op de background thread (zie AlarmCard).
    'background only';
    if (isSaving) return;
    const result = parseThresholdInput(saved, input);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setIsSaving(true);
    setError(undefined);
    updateThreshold(result.threshold)
      .then((updated) => {
        if (updated) {
          setSaved(updated);
          setInput(toThresholdInput(updated));
        }
        setMessage('Opgeslagen');
      })
      .catch((reason: unknown) => setError(errorMessage(reason)))
      .finally(() => setIsSaving(false));
  }, [input, isSaving, saved]);

  const unit = UNITS[threshold.metric];

  return (
    <view className="Card">
      <text className="ThresholdEditor-title">
        {metricLabel(threshold.metric)}
        {unit ? ` (${unit})` : ''}
      </text>
      <view className="ThresholdEditor-fields">
        <Field label="Minimum" value={input.min} onChange={setField('min')} />
        <Field label="Maximum" value={input.max} onChange={setField('max')} />
        <Field
          label="Duur (s)"
          value={input.durationSec}
          onChange={setField('durationSec')}
        />
      </view>
      <text className="InfoText">
        Leeg = geen grens. Duur: hoe lang de waarde buiten de grens mag blijven
        voor er een alarm komt.
      </text>
      <view className="Button ThresholdEditor-save" bindtap={onSave}>
        <text className="Button-text">{isSaving ? 'Bezig…' : 'Opslaan'}</text>
      </view>
      {message !== undefined && <text className="OkText">{message}</text>}
      {error !== undefined && <text className="ErrorText">{error}</text>}
    </view>
  );
}
