// De drempels (comfortzone) van een kamer aanpassen. De bronnen voor de standaardwaarden
// staan in pi/src/db/README.md ("Drempels en bronnen").
import type { Room } from '../generated/restwell/v1/restwell_pb.js';
import { ThresholdEditor } from '../components/ThresholdEditor.js';
import { useThresholds } from '../grpc/useThresholds.js';

type ThresholdScreenProps = {
  room: Room;
  onBack: () => void;
};

export function ThresholdScreen({ room, onBack }: ThresholdScreenProps) {
  const thresholds = useThresholds(room.id);

  return (
    <scroll-view className="Screen" scroll-orientation="vertical">
      <view className="BackButton" bindtap={onBack}>
        <text className="BackButton-text">‹ {room.name}</text>
      </view>
      <text className="Screen-title">Drempels</text>
      <text className="InfoText">
        Standaard: temperatuur 18–24 °C (WHO), luchtvochtigheid 30–60 % (EPA),
        licht maximaal 900 gedurende 60 s (slaap 's nachts). Een aanpassing
        geldt meteen voor nieuwe metingen.
      </text>

      {thresholds.length === 0 && (
        <text className="InfoText">Drempels laden…</text>
      )}
      {thresholds.map((threshold) => (
        <ThresholdEditor key={threshold.metric} threshold={threshold} />
      ))}
    </scroll-view>
  );
}
