// De app: drie tabs onderaan (Home, Drempels, Alarmen). Home toont het kameroverzicht en per
// kamer een detailscherm; Drempels en Alarmen gelden voor één kamer, te kiezen bovenaan.
// Navigatie is gewoon state, daar is geen router voor nodig.
import { useCallback, useState } from '@lynx-js/react';

import './App.css';
import type { Room } from './generated/restwell/v1/restwell_pb.js';
import { AlarmHistoryScreen } from './screens/AlarmHistoryScreen.js';
import { PrototypeBanner } from './components/PrototypeBanner.js';
import { RoomDetailScreen } from './screens/RoomDetailScreen.js';
import { RoomListScreen } from './screens/RoomListScreen.js';
import { TabBar, type Tab } from './components/TabBar.js';
import { ThresholdScreen } from './screens/ThresholdScreen.js';
import { pickRoom } from './format/rooms.js';
import { useRooms } from './grpc/useRooms.js';

export function App() {
  const rooms = useRooms();
  const [tab, setTab] = useState<Tab>('home');
  // De kamer die op Home open staat; leeg is het kameroverzicht.
  const [openRoomId, setOpenRoomId] = useState<string>();
  // De kamer voor Drempels en Alarmen. Een kamer openen op Home kiest ze ook hier.
  const [selectedRoomId, setSelectedRoomId] = useState<string>();

  const openRoom = useCallback((room: Room) => {
    setOpenRoomId(room.id);
    setSelectedRoomId(room.id);
  }, []);
  const closeRoom = useCallback(() => setOpenRoomId(undefined), []);
  const selectRoom = useCallback(
    (room: Room) => setSelectedRoomId(room.id),
    [],
  );

  const openRoomDetail = rooms.rooms.find((room) => room.id === openRoomId);
  const selectedRoom = pickRoom(rooms.rooms, selectedRoomId);

  return (
    <view className="App">
      <PrototypeBanner />
      {tab === 'home' && openRoomDetail === undefined && (
        <RoomListScreen rooms={rooms} onSelectRoom={openRoom} />
      )}
      {tab === 'home' && openRoomDetail !== undefined && (
        <RoomDetailScreen room={openRoomDetail} onBack={closeRoom} />
      )}
      {tab === 'thresholds' && selectedRoom !== undefined && (
        <ThresholdScreen
          key={selectedRoom.id}
          rooms={rooms.rooms}
          room={selectedRoom}
          onSelectRoom={selectRoom}
        />
      )}
      {tab === 'alarms' && selectedRoom !== undefined && (
        <AlarmHistoryScreen
          key={selectedRoom.id}
          rooms={rooms.rooms}
          room={selectedRoom}
          onSelectRoom={selectRoom}
        />
      )}
      {tab !== 'home' && selectedRoom === undefined && (
        <view className="Screen">
          <text className="InfoText">
            {rooms.status === 'loading' ? 'Kamers laden…' : 'Geen kamers.'}
          </text>
        </view>
      )}
      <TabBar selected={tab} onSelect={setTab} />
    </view>
  );
}
