import { formatAlarmCount } from '../format/measurements.js';
import type { RoomSummary } from '../grpc/useRooms.js';

type RoomRowProps = {
  summary: RoomSummary;
  onPress: () => void;
};

export function RoomRow({ summary, onPress }: RoomRowProps) {
  const hasAlarm = summary.openAlarmCount > 0;
  return (
    <view className="Card RoomRow" bindtap={onPress}>
      <view className={hasAlarm ? 'StatusDot StatusDot--alarm' : 'StatusDot'} />
      <view className="RoomRow-text">
        <text className="RoomRow-name">{summary.room.name}</text>
        <text
          className={
            hasAlarm ? 'RoomRow-status RoomRow-status--alarm' : 'RoomRow-status'
          }
        >
          {formatAlarmCount(summary.openAlarmCount)}
        </text>
      </view>
      <text className="RoomRow-chevron">›</text>
    </view>
  );
}
