import type { Room } from '../generated/restwell/v1/restwell_pb.js';
import { formatAlarmCount, formatTemperature } from '../format/measurements.js';
import { useRoomLive } from '../grpc/useRoomLive.js';

type RoomRowProps = {
  room: Room;
  onPress: () => void;
};

// Elke rij luistert live naar haar kamer, zodat een nieuw alarm meteen rood kleurt.
export function RoomRow({ room, onPress }: RoomRowProps) {
  const live = useRoomLive(room.id);
  const hasAlarm = live.alarms.length > 0;
  const temperature = live.reading
    ? ` · ${formatTemperature(live.reading.temperatureC)}`
    : '';

  return (
    <view className="Card RoomRow" bindtap={onPress}>
      <view className={hasAlarm ? 'StatusDot StatusDot--alarm' : 'StatusDot'} />
      <view className="RoomRow-text">
        <text className="RoomRow-name">{room.name}</text>
        <text
          className={
            hasAlarm ? 'RoomRow-status RoomRow-status--alarm' : 'RoomRow-status'
          }
        >
          {formatAlarmCount(live.alarms.length)}
          {temperature}
        </text>
      </view>
      <text className="RoomRow-chevron">›</text>
    </view>
  );
}
