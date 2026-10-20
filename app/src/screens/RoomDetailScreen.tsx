import { useCallback, useState } from '@lynx-js/react';

import type { Alarm, Room } from '../generated/restwell/v1/restwell_pb.js';
import { AlarmCard } from '../components/AlarmCard.js';
import { MeasurementRow } from '../components/MeasurementRow.js';
import {
  formatHumidity,
  formatLight,
  formatMotion,
  formatSound,
  formatTemperature,
  formatTime,
} from '../format/measurements.js';
import { useLatestReading } from '../grpc/useLatestReading.js';
import { useRoomLive, type RoomLiveStatus } from '../grpc/useRoomLive.js';

type RoomDetailScreenProps = {
  room: Room;
  onBack: () => void;
};

const LIVE_STATUS_LABELS: Record<RoomLiveStatus, string> = {
  connecting: 'Verbinden…',
  live: 'Live',
  closed: 'Verbinding gesloten',
  error: 'Geen live-verbinding',
};

export function RoomDetailScreen({ room, onBack }: RoomDetailScreenProps) {
  const live = useRoomLive(room.id);
  const latestReading = useLatestReading(room.id);
  // Alarmen die hier net als gezien gemarkeerd zijn, op id. Zonder live-stroom hoort de app
  // de wijziging niet van de Pi, dus tonen we het antwoord van AcknowledgeAlarm.
  const [acknowledgedById, setAcknowledgedById] = useState<
    Record<string, Alarm>
  >({});

  const reading = live.reading ?? latestReading;
  const alarms = live.alarms.map(
    (alarm) => acknowledgedById[String(alarm.id)] ?? alarm,
  );

  const onAcknowledged = useCallback((alarm: Alarm) => {
    setAcknowledgedById((current) => ({
      ...current,
      [String(alarm.id)]: alarm,
    }));
  }, []);

  return (
    <scroll-view className="Screen" scroll-orientation="vertical">
      <view className="BackButton" bindtap={onBack}>
        <text className="BackButton-text">‹ Kamers</text>
      </view>
      <text className="Screen-title">{room.name}</text>
      <text
        className={
          live.status === 'live' ? 'LiveStatus LiveStatus--live' : 'LiveStatus'
        }
      >
        {LIVE_STATUS_LABELS[live.status]}
        {reading ? ` · meting van ${formatTime(reading.timestampMs)}` : ''}
      </text>

      <text className="Section-title">Metingen</text>
      <view className="Card">
        <MeasurementRow
          label="Temperatuur"
          value={formatTemperature(reading?.temperatureC)}
        />
        <MeasurementRow
          label="Luchtvochtigheid"
          value={formatHumidity(reading?.humidityPercent)}
        />
        <MeasurementRow label="Licht" value={formatLight(reading?.lightLux)} />
        <MeasurementRow label="Geluid" value={formatSound(reading?.soundDb)} />
        <MeasurementRow
          label="Beweging"
          value={formatMotion(reading?.motionDetected)}
        />
      </view>

      <text className="Section-title">Alarmen</text>
      {alarms.length === 0 && (
        <view className="Card">
          <text className="InfoText">Geen open alarmen.</text>
        </view>
      )}
      {alarms.map((alarm) => (
        <AlarmCard
          key={String(alarm.id)}
          alarm={alarm}
          onAcknowledged={onAcknowledged}
        />
      ))}
    </scroll-view>
  );
}
