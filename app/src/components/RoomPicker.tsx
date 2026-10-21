// Kiest de kamer waarvoor een tab (Drempels, Alarmen) geldt. Bij één kamer valt er niets te kiezen.
import type { Room } from '../generated/restwell/v1/restwell_pb.js';
import { Chip } from './Chip.js';

type RoomPickerProps = {
  rooms: Room[];
  selectedId: string;
  onSelect: (room: Room) => void;
};

export function RoomPicker({ rooms, selectedId, onSelect }: RoomPickerProps) {
  if (rooms.length < 2) return null;
  return (
    <view className="ChipRow">
      {rooms.map((room) => (
        <Chip
          key={room.id}
          label={room.name}
          isSelected={room.id === selectedId}
          onPress={() => onSelect(room)}
        />
      ))}
    </view>
  );
}
