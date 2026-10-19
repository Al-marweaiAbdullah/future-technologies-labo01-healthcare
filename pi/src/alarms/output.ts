import type { AlarmRow } from "../db/index.ts";
import type { RoomLevel, RoomOutput } from "./types.ts";

const MS_PER_SEC = 1000;
export const DISPLAY_TEXT_OK = "Alles OK";

function isOpen(alarm: AlarmRow): boolean {
  return alarm.status === "active" || alarm.status === "acknowledged";
}

// Rood: minstens één actief alarm. Oranje: alleen bevestigde alarmen. Groen: geen open alarm.
export function roomLevel(alarms: AlarmRow[]): RoomLevel {
  if (alarms.some((alarm) => alarm.status === "active")) return "red";
  if (alarms.some((alarm) => alarm.status === "acknowledged")) return "orange";
  return "green";
}

// Actieve alarmen gaan voor bevestigde, daarna het oudste eerst.
export function mostImportantAlarm(alarms: AlarmRow[]): AlarmRow | undefined {
  return alarms.filter(isOpen).sort((a, b) => {
    const activeFirst = Number(b.status === "active") - Number(a.status === "active");
    return activeFirst || a.started_at_ms - b.started_at_ms;
  })[0];
}

// De buzzer gaat pas af als niemand een actief alarm binnen buzzer_after_sec bevestigd heeft.
function needsBuzzer(alarm: AlarmRow, nowMs: number): boolean {
  return (
    alarm.status === "active" && nowMs - alarm.started_at_ms >= alarm.buzzer_after_sec * MS_PER_SEC
  );
}

export function decideRoomOutput(alarms: AlarmRow[], nowMs: number): RoomOutput {
  const mainAlarm = mostImportantAlarm(alarms);
  return {
    led: mainAlarm !== undefined,
    buzzer: alarms.some((alarm) => needsBuzzer(alarm, nowMs)),
    displayText: mainAlarm?.reason ?? DISPLAY_TEXT_OK,
  };
}
