// Melding bovenaan het scherm als er net een alarm afgaat: wat er mis is, met de waarde.
// Ze verdwijnt vanzelf na 10 s (of bij een tik); het alarm blijft daarna staan bij Alarmen.
import { useEffect } from '@lynx-js/react';

import type { Alarm } from '../generated/restwell/v1/restwell_pb.js';
import { alarmDetail, isSensorOffline } from '../format/alarmDetail.js';
import { formatBuzzerCountdown } from '../format/buzzer.js';
import { formatTime } from '../format/measurements.js';
import { useNow } from '../hooks/useNow.js';

const ALARM_POPUP_DURATION_MS = 10_000;

type AlarmPopupProps = {
  alarm: Alarm;
  onClose: () => void;
};

export function AlarmPopup({ alarm, onClose }: AlarmPopupProps) {
  const buzzerCountdown = formatBuzzerCountdown([alarm], useNow());

  useEffect(() => {
    const timer = setTimeout(onClose, ALARM_POPUP_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <view
      className={
        isSensorOffline(alarm) ? 'AlarmPopup AlarmPopup--offline' : 'AlarmPopup'
      }
      bindtap={onClose}
    >
      <text className="AlarmPopup-title">Alarm: {alarm.reason}</text>
      <text className="AlarmPopup-detail">
        {alarmDetail(alarm)}
        {' · '}
        {formatTime(alarm.startedAtMs)}
      </text>
      {buzzerCountdown !== undefined && (
        <text className="AlarmPopup-buzzer">{buzzerCountdown}</text>
      )}
      <text className="AlarmPopup-hint">Ook te zien bij Alarmen</text>
    </view>
  );
}
