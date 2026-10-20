// "Recente alarmen": elk alarm van de laatste 24 uur, ook opgeloste en geziene,
// zodat een afgehandeld alarm niet spoorloos uit de app verdwijnt.
import type { Alarm } from '../generated/restwell/v1/restwell_pb.js';
import { formatAlarmPeriod } from '../format/alarmHistory.js';
import { alarmLabel } from '../format/measurements.js';
import { useAlarmHistory } from '../grpc/useAlarmHistory.js';

const HOUR_MS = 60 * 60 * 1000;
const HISTORY_WINDOW_MS = 24 * HOUR_MS;
const MAX_ROWS = 20;

type AlarmHistorySectionProps = {
  roomId: string;
  /** Verandert bij elke alarmwijziging uit de live-stroom (zie alarmHistoryKey). */
  refreshKey: string;
};

function AlarmHistoryRow({ alarm }: { alarm: Alarm }) {
  const seenBy =
    alarm.acknowledgedBy === undefined
      ? ''
      : ` · gezien door ${alarm.acknowledgedBy}`;
  return (
    <view className="AlarmHistoryRow">
      <view className="AlarmCard-header">
        <text className="AlarmHistoryRow-title">{alarm.reason}</text>
        <text className="AlarmHistoryRow-status">{alarmLabel(alarm)}</text>
      </view>
      <text className="AlarmCard-detail">
        {formatAlarmPeriod(alarm)}
        {seenBy}
      </text>
    </view>
  );
}

export function AlarmHistorySection({
  roomId,
  refreshKey,
}: AlarmHistorySectionProps) {
  const history = useAlarmHistory(roomId, HISTORY_WINDOW_MS, refreshKey);
  const shown = history.alarms.slice(0, MAX_ROWS);
  const hiddenCount = history.alarms.length - shown.length;

  return (
    <view className="Card">
      {history.status === 'loading' && (
        <text className="InfoText">Alarmen laden…</text>
      )}
      {history.status === 'error' && (
        <text className="ErrorText">{history.error}</text>
      )}
      {history.status === 'ready' && history.alarms.length === 0 && (
        <text className="InfoText">Geen alarmen in de laatste 24 uur.</text>
      )}
      {shown.map((alarm) => (
        <AlarmHistoryRow key={String(alarm.id)} alarm={alarm} />
      ))}
      {hiddenCount > 0 && (
        <text className="InfoText">{`en ${hiddenCount} oudere`}</text>
      )}
    </view>
  );
}
