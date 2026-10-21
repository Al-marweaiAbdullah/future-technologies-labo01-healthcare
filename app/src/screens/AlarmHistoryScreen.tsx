// De alarmgeschiedenis van een kamer (ListAlarms), met filters op sensor, status en periode.
// Het filteren gebeurt in de app op de opgehaalde lijst; de Pi levert alle alarmen sinds `since_ms`.
// Bewust weinig filters, zodat ze op een telefoonbreedte in één rij passen.
import { useState } from '@lynx-js/react';

import { AlarmHistoryRow } from '../components/AlarmHistoryRow.js';
import { Chip } from '../components/Chip.js';
import { RoomPicker } from '../components/RoomPicker.js';
import { Metric, type Room } from '../generated/restwell/v1/restwell_pb.js';
import {
  filterAlarms,
  type AlarmStatusFilter,
} from '../format/alarmHistory.js';
import { useAlarmHistory } from '../grpc/useAlarmHistory.js';

type AlarmHistoryScreenProps = {
  rooms: Room[];
  room: Room;
  onSelectRoom: (room: Room) => void;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_WINDOW_MS = 7 * DAY_MS;

// Beweging staat er niet bij: die wordt alleen gelogd en geeft geen drempelalarm.
const METRIC_FILTERS: { metric?: Metric; label: string }[] = [
  { label: 'Alle' },
  { metric: Metric.TEMPERATURE, label: 'Temp.' },
  { metric: Metric.HUMIDITY, label: 'Vocht' },
  { metric: Metric.LIGHT, label: 'Licht' },
];

const STATUS_FILTERS: { value: AlarmStatusFilter; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Opgelost' },
];

export function AlarmHistoryScreen({
  rooms,
  room,
  onSelectRoom,
}: AlarmHistoryScreenProps) {
  const [metric, setMetric] = useState<Metric>();
  const [status, setStatus] = useState<AlarmStatusFilter>('all');
  // Geen live-stroom op dit scherm: de lijst wordt opgehaald bij het openen.
  const history = useAlarmHistory(room.id, HISTORY_WINDOW_MS, '');
  const shown = filterAlarms(history.alarms, { metric, status });

  return (
    <scroll-view className="Screen" scroll-orientation="vertical">
      <text className="Screen-title">Alarmgeschiedenis</text>
      <RoomPicker rooms={rooms} selectedId={room.id} onSelect={onSelectRoom} />

      <view className="ChipRow">
        {METRIC_FILTERS.map((option) => (
          <Chip
            key={option.label}
            label={option.label}
            isSelected={metric === option.metric}
            onPress={() => setMetric(option.metric)}
          />
        ))}
      </view>
      <view className="ChipRow">
        {STATUS_FILTERS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            isSelected={status === option.value}
            onPress={() => setStatus(option.value)}
          />
        ))}
      </view>

      <view className="Card">
        {history.status === 'loading' && (
          <text className="InfoText">Alarmen laden…</text>
        )}
        {history.status === 'error' && (
          <text className="ErrorText">{history.error}</text>
        )}
        {history.status === 'ready' && shown.length === 0 && (
          <text className="InfoText">Geen alarmen in de laatste 7 dagen.</text>
        )}
        {shown.map((alarm) => (
          <AlarmHistoryRow key={String(alarm.id)} alarm={alarm} />
        ))}
      </view>
    </scroll-view>
  );
}
