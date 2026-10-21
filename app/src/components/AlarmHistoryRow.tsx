import type { Alarm } from '../generated/restwell/v1/restwell_pb.js';
import { formatAlarmPeriod } from '../format/alarmHistory.js';
import { alarmLabel } from '../format/measurements.js';

export function AlarmHistoryRow({ alarm }: { alarm: Alarm }) {
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
        {formatAlarmPeriod(alarm, true)}
        {seenBy}
      </text>
    </view>
  );
}
