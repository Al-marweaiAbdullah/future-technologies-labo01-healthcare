// De app: een kameroverzicht en per kamer een detailscherm. Navigatie is gewoon state:
// er zijn maar twee schermen, daar is geen router voor nodig.
import { useCallback, useState } from '@lynx-js/react';

import './App.css';
import type { Room } from './generated/restwell/v1/restwell_pb.js';
import { PrototypeBanner } from './components/PrototypeBanner.js';
import { RoomDetailScreen } from './screens/RoomDetailScreen.js';
import { RoomListScreen } from './screens/RoomListScreen.js';

export function App() {
  const [selectedRoom, setSelectedRoom] = useState<Room>();

  const onBack = useCallback(() => setSelectedRoom(undefined), []);

  return (
    <view className="App">
      <PrototypeBanner />
      {selectedRoom ? (
        <RoomDetailScreen room={selectedRoom} onBack={onBack} />
      ) : (
        <RoomListScreen onSelectRoom={setSelectedRoom} />
      )}
    </view>
  );
}
