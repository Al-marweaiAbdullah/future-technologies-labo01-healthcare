// De app: een kameroverzicht, per kamer een detailscherm, en een scherm om de drempels aan
// te passen. Navigatie is gewoon state: er zijn maar drie schermen, daar is geen router voor nodig.
import { useCallback, useState } from '@lynx-js/react';

import './App.css';
import type { Room } from './generated/restwell/v1/restwell_pb.js';
import { PrototypeBanner } from './components/PrototypeBanner.js';
import { RoomDetailScreen } from './screens/RoomDetailScreen.js';
import { RoomListScreen } from './screens/RoomListScreen.js';
import { ThresholdScreen } from './screens/ThresholdScreen.js';

type Screen =
  | { name: 'rooms' }
  | { name: 'room'; room: Room }
  | { name: 'thresholds'; room: Room };

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'rooms' });

  const showRooms = useCallback(() => setScreen({ name: 'rooms' }), []);
  const showRoom = useCallback(
    (room: Room) => setScreen({ name: 'room', room }),
    [],
  );
  const showThresholds = useCallback(
    (room: Room) => setScreen({ name: 'thresholds', room }),
    [],
  );

  return (
    <view className="App">
      <PrototypeBanner />
      {screen.name === 'rooms' && <RoomListScreen onSelectRoom={showRoom} />}
      {screen.name === 'room' && (
        <RoomDetailScreen
          room={screen.room}
          onBack={showRooms}
          onEditThresholds={() => showThresholds(screen.room)}
        />
      )}
      {screen.name === 'thresholds' && (
        <ThresholdScreen
          room={screen.room}
          onBack={() => showRoom(screen.room)}
        />
      )}
    </view>
  );
}
