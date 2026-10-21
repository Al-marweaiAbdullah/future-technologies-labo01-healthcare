// De drempels (comfortzone) van een kamer aanpassen, één sensor per tab. De bronnen voor de
// standaardwaarden staan in pi/src/db/README.md ("Drempels en bronnen").
import { useCallback, useState } from '@lynx-js/react';

import {
  Metric,
  type Room,
  type Threshold,
} from '../generated/restwell/v1/restwell_pb.js';
import { Chip } from '../components/Chip.js';
import { RoomPicker } from '../components/RoomPicker.js';
import { ThresholdEditor } from '../components/ThresholdEditor.js';
import { metricLabel } from '../format/measurements.js';
import { useThresholds } from '../grpc/useThresholds.js';

type ThresholdScreenProps = {
  rooms: Room[];
  room: Room;
  onSelectRoom: (room: Room) => void;
};

// Vaste volgorde van de tabs; de Pi stuurt de drempels alfabetisch.
const TAB_ORDER = [Metric.TEMPERATURE, Metric.HUMIDITY, Metric.LIGHT];

function tabIndex(metric: Metric): number {
  const index = TAB_ORDER.indexOf(metric);
  return index === -1 ? TAB_ORDER.length : index;
}

export function ThresholdScreen({
  rooms,
  room,
  onSelectRoom,
}: ThresholdScreenProps) {
  const thresholds = useThresholds(room.id);
  const [selected, setSelected] = useState<Metric>(Metric.TEMPERATURE);
  // Wat hier opgeslagen is, op sensor. useThresholds haalt de drempels maar één keer op,
  // dus zonder dit toont een tab na het wisselen weer de oude waarden.
  const [savedByMetric, setSavedByMetric] = useState<
    Partial<Record<Metric, Threshold>>
  >({});
  const tabs = thresholds
    .map((threshold) => savedByMetric[threshold.metric] ?? threshold)
    .sort((a, b) => tabIndex(a.metric) - tabIndex(b.metric));
  const current = tabs.find((threshold) => threshold.metric === selected);

  const onSaved = useCallback((threshold: Threshold) => {
    setSavedByMetric((saved) => ({ ...saved, [threshold.metric]: threshold }));
  }, []);

  return (
    <scroll-view className="Screen" scroll-orientation="vertical">
      <text className="Screen-title">Drempels</text>
      <RoomPicker rooms={rooms} selectedId={room.id} onSelect={onSelectRoom} />

      {tabs.length === 0 && <text className="InfoText">Drempels laden…</text>}
      <view className="ChipRow">
        {tabs.map((threshold) => (
          <Chip
            key={threshold.metric}
            label={metricLabel(threshold.metric)}
            isSelected={threshold.metric === selected}
            onPress={() => setSelected(threshold.metric)}
          />
        ))}
      </view>
      {/* Alleen de gekozen tab: Lynx tekent tekst in een verborgen view (display: none)
          toch, bovenaan het scherm. De key maakt een nieuwe editor per sensor. */}
      {current && (
        <ThresholdEditor
          key={current.metric}
          threshold={current}
          onSaved={onSaved}
        />
      )}
    </scroll-view>
  );
}
