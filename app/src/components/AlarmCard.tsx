// Eén kaart per sensor (zie format/alarmGroups.ts): het nieuwste alarm, en hoe vaak het
// sinds wanneer gebeurde. "Gezien" bevestigt alle ongeziene alarmen van die sensor tegelijk.
import { useCallback, useState } from '@lynx-js/react';

import {
  AlarmStatus,
  type Alarm,
} from '../generated/restwell/v1/restwell_pb.js';
import type { AlarmGroup } from '../format/alarmGroups.js';
import { formatBuzzerCountdown } from '../format/buzzer.js';
import {
  alarmLabel,
  formatMetricValue,
  formatTime,
  metricLabel,
} from '../format/measurements.js';
import { acknowledgeAlarm } from '../grpc/acknowledgeAlarm.js';
import { errorMessage } from '../grpc/errors.js';
import { useNow } from '../hooks/useNow.js';

type AlarmCardProps = {
  group: AlarmGroup;
  onAcknowledged: (alarm: Alarm) => void;
};

type InputEvent = { detail: { value: string } };

function isUnseen(alarm: Alarm): boolean {
  return alarm.acknowledgedAtMs === undefined;
}

export function AlarmCard({ group, onAcknowledged }: AlarmCardProps) {
  const [initials, setInitials] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string>();
  const { latest } = group;
  const isActive = latest.status === AlarmStatus.ACTIVE;
  // Ook een opgelost alarm moet nog als gezien gemarkeerd worden, anders blijft het staan.
  const unseen = group.alarms.filter(isUnseen);
  // Telt af zolang niemand het alarm gezien heeft; daarna gaat de buzzer niet meer af.
  const buzzerCountdown = formatBuzzerCountdown(group.alarms, useNow());

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
    Promise.all(
      unseen.map((alarm) => acknowledgeAlarm(alarm.id, acknowledgedBy)),
    )
      .then((updated) => {
        for (const alarm of updated) if (alarm) onAcknowledged(alarm);
      })
      .catch((reason: unknown) => setError(errorMessage(reason)))
      .finally(() => setIsSending(false));
  }, [initials, isSending, onAcknowledged, unseen]);

  const occurrences =
    group.alarms.length > 1
      ? `${group.alarms.length}× sinds ${formatTime(group.firstStartedAtMs)}`
      : `sinds ${formatTime(latest.startedAtMs)}`;

  return (
    <view
      className={
        isActive ? 'Card AlarmCard AlarmCard--active' : 'Card AlarmCard'
      }
    >
      <view className="AlarmCard-header">
        <text className="AlarmCard-title">{latest.reason}</text>
        <text className="AlarmCard-status">{alarmLabel(latest)}</text>
      </view>
      <text className="AlarmCard-detail">
        {metricLabel(latest.metric)}:{' '}
        {formatMetricValue(latest.metric, latest.value)}
        {' · '}
        {occurrences}
      </text>
      {buzzerCountdown !== undefined && (
        <text className="AlarmCard-buzzer">{buzzerCountdown}</text>
      )}

      {unseen.length > 0 && (
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
      {latest.acknowledgedBy !== undefined && (
        <text className="AlarmCard-detail">
          Gezien door {latest.acknowledgedBy}
        </text>
      )}
      {error !== undefined && <text className="ErrorText">{error}</text>}
    </view>
  );
}
