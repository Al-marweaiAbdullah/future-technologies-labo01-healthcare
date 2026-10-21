// Eén drempel aanpassen: minimum, maximum en hoe lang een waarde buiten de grens mag blijven.
// Bij licht ook de nachtrust: alleen dan geldt het lichtalarm, overdag mag het licht aan.
import { useCallback, useState } from '@lynx-js/react';

import {
  Metric,
  type Threshold,
} from '../generated/restwell/v1/restwell_pb.js';
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

// De standaardwaarden en hun bron (zie pi/src/db/README.md), als houvast bij het aanpassen.
const DEFAULT_HINTS: Partial<Record<Metric, string>> = {
  [Metric.TEMPERATURE]: 'Standaard 18–24 °C (WHO)',
  [Metric.HUMIDITY]: 'Standaard 30–60 % (EPA)',
  [Metric.LIGHT]: 'Standaard max 900, alarm na 60 s',
};

type InputEvent = { detail: { value: string } };

type ThresholdEditorProps = {
  threshold: Threshold;
  /** Na opslaan, zodat het scherm de nieuwe drempel onthoudt bij het wisselen van tab. */
  onSaved: (threshold: Threshold) => void;
};

type FieldProps = {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
};

function Field({ label, value, placeholder = 'geen', onChange }: FieldProps) {
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
        placeholder={placeholder}
        bindinput={onInput}
      />
    </view>
  );
}

export function ThresholdEditor({ threshold, onSaved }: ThresholdEditorProps) {
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
          onSaved(updated);
          setInput(toThresholdInput(updated));
        }
        setMessage('Opgeslagen');
      })
      .catch((reason: unknown) => setError(errorMessage(reason)))
      .finally(() => setIsSaving(false));
  }, [input, isSaving, onSaved, saved]);

  const unit = UNITS[threshold.metric];
  const defaultHint = DEFAULT_HINTS[threshold.metric];
  // Alleen licht heeft actieve uren (de nachtrust); de andere regels gelden altijd.
  const hasNightRest = threshold.metric === Metric.LIGHT;

  return (
    <view className="Card">
      <text className="ThresholdEditor-hint">
        {[unit, defaultHint].filter(Boolean).join(' · ')}
      </text>
      <view className="ThresholdEditor-fields">
        <Field label="Min" value={input.min} onChange={setField('min')} />
        <Field label="Max" value={input.max} onChange={setField('max')} />
        <Field
          label="Alarm na (s)"
          value={input.durationSec}
          placeholder="meteen"
          onChange={setField('durationSec')}
        />
      </view>

      {hasNightRest && (
        <view className="ThresholdEditor-night">
          <text className="ThresholdEditor-subtitle">Nachtrust</text>
          <view className="ThresholdEditor-fields">
            <Field
              label="Van (uur)"
              value={input.fromHour}
              placeholder="–"
              onChange={setField('fromHour')}
            />
            <Field
              label="Tot (uur)"
              value={input.toHour}
              placeholder="–"
              onChange={setField('toHour')}
            />
          </view>
          <text className="ThresholdEditor-hint">
            Alleen dan geeft licht een alarm.
          </text>
        </view>
      )}

      <view className="Button ThresholdEditor-save" bindtap={onSave}>
        <text className="Button-text">{isSaving ? 'Bezig…' : 'Opslaan'}</text>
      </view>
      {message !== undefined && <text className="OkText">{message}</text>}
      {error !== undefined && <text className="ErrorText">{error}</text>}
    </view>
  );
}
