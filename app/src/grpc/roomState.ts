// Wat de app weet over één kamer, bijgewerkt met elk bericht uit WatchRoom.
// Pure functies zonder netwerk, zodat ze makkelijk te testen zijn.
import {
  AlarmStatus,
  type Alarm,
  type Reading,
  type WatchRoomResponse,
} from '../generated/restwell/v1/restwell_pb.js';

export type RoomState = {
  reading?: Reading; // de laatste meting
  alarms: Alarm[]; // alarmen die aandacht vragen (zie needsAttention), oudste eerst
};

export const INITIAL_ROOM_STATE: RoomState = { alarms: [] };

function byStartTime(a: Alarm, b: Alarm): number {
  if (a.startedAtMs === b.startedAtMs) return 0;
  return a.startedAtMs < b.startedAtMs ? -1 : 1;
}

// Een alarm blijft staan tot het opgelost én gezien is: geen enkel alarm verdwijnt ongezien.
export function needsAttention(alarm: Alarm): boolean {
  return (
    alarm.status !== AlarmStatus.RESOLVED ||
    alarm.acknowledgedAtMs === undefined
  );
}

// Een nieuw of gewijzigd alarm vervangt de oude versie; een afgehandeld alarm verdwijnt.
function upsertAlarm(alarms: Alarm[], alarm: Alarm): Alarm[] {
  const others = alarms.filter((existing) => existing.id !== alarm.id);
  if (!needsAttention(alarm)) return others;
  return [...others, alarm].sort(byStartTime);
}

export function withOpenAlarms(state: RoomState, alarms: Alarm[]): RoomState {
  return { ...state, alarms: [...alarms].sort(byStartTime) };
}

export function applyRoomEvent(
  state: RoomState,
  event: WatchRoomResponse['event'],
): RoomState {
  switch (event.case) {
    case 'reading':
      return { ...state, reading: event.value };
    case 'alarm':
      return { ...state, alarms: upsertAlarm(state.alarms, event.value) };
    default:
      return state;
  }
}
