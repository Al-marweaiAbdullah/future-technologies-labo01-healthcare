import { useCallback, useState } from '@lynx-js/react';

import type { Alarm, Room } from '../generated/restwell/v1/restwell_pb.js';
import { AlarmCard } from '../components/AlarmCard.js';
import { AlarmHistorySection } from '../components/AlarmHistorySection.js';
import { AlarmPopup } from '../components/AlarmPopup.js';
import { alarmHistoryKey } from '../format/alarmHistory.js';
import { HistorySection } from '../components/HistorySection.js';
import { groupAlarmsByMetric } from '../format/alarmGroups.js';
import { MeasurementRow } from '../components/MeasurementRow.js';
import {
  formatHumidity,
  formatLight,
  formatMotion,
  formatTemperature,
  formatTime,
} from '../format/measurements.js';
import { formatRange, isOutside, thresholdFor } from '../format/thresholds.js';
import { useLatestReading } from '../grpc/useLatestReading.js';
import { needsAttention } from '../grpc/roomState.js';
import { useRoomLive, type RoomLiveStatus } from '../grpc/useRoomLive.js';
import { useThresholds } from '../grpc/useThresholds.js';

type RoomDetailScreenProps = {
  room: Room;
  onBack: () => void;
  onEditThresholds: () => void;
};

const LIVE_STATUS_LABELS: Record<RoomLiveStatus, string> = {
  connecting: 'Verbinden…',
  live: 'Live',
  closed: 'Verbinding gesloten',
  error: 'Geen live-verbinding',
};

export function RoomDetailScreen({
  room,
  onBack,
  onEditThresholds,
}: RoomDetailScreenProps) {
  const live = useRoomLive(room.id);
  const latestReading = useLatestReading(room.id);
  const thresholds = useThresholds(room.id);
  const temperatureThreshold = thresholdFor(thresholds, 'temperature');
  const humidityThreshold = thresholdFor(thresholds, 'humidity');
  const lightThreshold = thresholdFor(thresholds, 'light');
  // Alarmen die hier net als gezien gemarkeerd zijn, op id. Zonder live-stroom hoort de app
  // de wijziging niet van de Pi, dus tonen we het antwoord van AcknowledgeAlarm.
  const [acknowledgedById, setAcknowledgedById] = useState<
    Record<string, Alarm>
  >({});
  // Het alarm waarvan de popup al weg is, zodat ze niet terugkomt bij de volgende meting.
  const [closedPopupAlarmId, setClosedPopupAlarmId] = useState<bigint>();

  const reading = live.reading ?? latestReading;
  // Een opgelost alarm dat hier net gezien werd, verdwijnt meteen (ook zonder live-stroom).
  const alarms = live.alarms
    .map((alarm) => acknowledgedById[String(alarm.id)] ?? alarm)
    .filter(needsAttention);
  const alarmGroups = groupAlarmsByMetric(alarms);
  const popupAlarm =
    live.newAlarm !== undefined && live.newAlarm.id !== closedPopupAlarmId
      ? live.newAlarm
      : undefined;
  const popupAlarmId = popupAlarm?.id;
  const closePopup = useCallback(
    () => setClosedPopupAlarmId(popupAlarmId),
    [popupAlarmId],
  );

  const onAcknowledged = useCallback((alarm: Alarm) => {
    setAcknowledgedById((current) => ({
      ...current,
      [String(alarm.id)]: alarm,
    }));
  }, []);

  return (
    <view className="ScreenWithPopup">
      <scroll-view className="Screen" scroll-orientation="vertical">
        <view className="BackButton" bindtap={onBack}>
          <text className="BackButton-text">‹ Kamers</text>
        </view>
        <text className="Screen-title">{room.name}</text>
        <text
          className={
            live.status === 'live'
              ? 'LiveStatus LiveStatus--live'
              : 'LiveStatus'
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
            range={formatRange(temperatureThreshold, formatTemperature)}
            isOutside={isOutside(reading?.temperatureC, temperatureThreshold)}
          />
          <MeasurementRow
            label="Luchtvochtigheid"
            value={formatHumidity(reading?.humidityPercent)}
            range={formatRange(humidityThreshold, formatHumidity)}
            isOutside={isOutside(reading?.humidityPercent, humidityThreshold)}
          />
          <MeasurementRow
            label="Licht"
            value={formatLight(reading?.lightRaw)}
            range={formatRange(lightThreshold, formatLight)}
            isOutside={isOutside(reading?.lightRaw, lightThreshold)}
          />
          <MeasurementRow
            label="Beweging"
            value={formatMotion(reading?.motionDetected)}
          />
          <view className="LinkButton" bindtap={onEditThresholds}>
            <text className="LinkButton-text">Drempels aanpassen ›</text>
          </view>
        </view>

        <text className="Section-title">Verloop</text>
        <HistorySection
          roomId={room.id}
          liveReading={live.reading}
          thresholds={thresholds}
          alarmRefreshKey={alarmHistoryKey(alarms)}
        />

        <text className="Section-title">Alarmen</text>
        {alarms.length === 0 && (
          <view className="Card">
            <text className="InfoText">Geen open alarmen.</text>
          </view>
        )}
        {alarmGroups.map((group) => (
          <AlarmCard
            key={group.metric}
            group={group}
            onAcknowledged={onAcknowledged}
          />
        ))}

        <text className="Section-title">Recente alarmen</text>
        <AlarmHistorySection
          roomId={room.id}
          refreshKey={alarmHistoryKey(alarms)}
        />
      </scroll-view>
      {popupAlarm && (
        <AlarmPopup
          key={String(popupAlarm.id)}
          alarm={popupAlarm}
          onClose={closePopup}
        />
      )}
    </view>
  );
}
