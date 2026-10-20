import { useCallback, useState } from '@lynx-js/react';

import {
  AlarmStatus,
  type Alarm,
} from '../generated/restwell/v1/restwell_pb.js';
import {
  alarmLabel,
  formatMetricValue,
  formatTime,
  metricLabel,
} from '../format/measurements.js';
import { acknowledgeAlarm } from '../grpc/acknowledgeAlarm.js';
import { errorMessage } from '../grpc/errors.js';

type AlarmCardProps = {
  alarm: Alarm;
  onAcknowledged: (alarm: Alarm) => void;
};

type InputEvent = { detail: { value: string } };

export function AlarmCard({ alarm, onAcknowledged }: AlarmCardProps) {
  const [initials, setInitials] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string>();
  const isActive = alarm.status === AlarmStatus.ACTIVE;
  // Ook een opgelost alarm moet nog als gezien gemarkeerd worden, anders blijft het staan.
  const isUnseen = alarm.acknowledgedAtMs === undefined;

  const onInput = useCallback((event: InputEvent) => {
    setInitials(event.detail.value);
  }, []);

  const onAcknowledge = useCallback(() => {
    // Tap-handlers blijven anders ook op de main thread staan, en dan laadt client.ts daar,
    // waar geen fetch bestaat. Zo verwijdert ReactLynx deze code uit de main thread.
    'background only';
    if (isSending) return;
    const acknowledgedBy = initials.trim();
    if (acknowledgedBy === '') {
      setError('Vul je initialen in');
      return;
    }
    setIsSending(true);
    setError(undefined);
    acknowledgeAlarm(alarm.id, acknowledgedBy)
      .then((updated) => {
        if (updated) onAcknowledged(updated);
      })
      .catch((reason: unknown) => setError(errorMessage(reason)))
      .finally(() => setIsSending(false));
  }, [alarm.id, initials, isSending, onAcknowledged]);

  return (
    <view
      className={
        isActive ? 'Card AlarmCard AlarmCard--active' : 'Card AlarmCard'
      }
    >
      <view className="AlarmCard-header">
        <text className="AlarmCard-title">{alarm.reason}</text>
        <text className="AlarmCard-status">{alarmLabel(alarm)}</text>
      </view>
      <text className="AlarmCard-detail">
        {metricLabel(alarm.metric)}:{' '}
        {formatMetricValue(alarm.metric, alarm.value)}
        {' · sinds '}
        {formatTime(alarm.startedAtMs)}
      </text>

      {isUnseen && (
        <view className="AlarmCard-actions">
          <input
            className="AlarmCard-input"
            placeholder="Initialen"
            maxlength={6}
            bindinput={onInput}
          />
          <view className="Button" bindtap={onAcknowledge}>
            <text className="Button-text">
              {isSending ? 'Bezig…' : 'Gezien'}
            </text>
          </view>
        </view>
      )}
      {alarm.acknowledgedBy !== undefined && (
        <text className="AlarmCard-detail">
          Gezien door {alarm.acknowledgedBy}
        </text>
      )}
      {error !== undefined && <text className="ErrorText">{error}</text>}
    </view>
  );
}
