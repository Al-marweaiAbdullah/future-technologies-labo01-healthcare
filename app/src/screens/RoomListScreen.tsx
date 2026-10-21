import type { Room } from '../generated/restwell/v1/restwell_pb.js';
import { RoomRow } from '../components/RoomRow.js';
import type { Rooms } from '../grpc/useRooms.js';

type RoomListScreenProps = {
  rooms: Rooms;
  onSelectRoom: (room: Room) => void;
};

export function RoomListScreen({
  rooms: { rooms, status, error, reload },
  onSelectRoom,
}: RoomListScreenProps) {
  return (
    <scroll-view className="Screen" scroll-orientation="vertical">
      <text className="Screen-title">Kamers</text>

      {status === 'loading' && <text className="InfoText">Kamers laden…</text>}

      {status === 'error' && (
        <view className="Card">
          <text className="ErrorText">{error}</text>
          <view className="Button Button--secondary" bindtap={reload}>
            <text className="Button-text">Opnieuw proberen</text>
          </view>
        </view>
      )}

      {status === 'ready' && rooms.length === 0 && (
        <text className="InfoText">Nog geen kamers op de Pi.</text>
      )}

      {rooms.map((room) => (
        <RoomRow key={room.id} room={room} onPress={() => onSelectRoom(room)} />
      ))}
    </scroll-view>
  );
}
