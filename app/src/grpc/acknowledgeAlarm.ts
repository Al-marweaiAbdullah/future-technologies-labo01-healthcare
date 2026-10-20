// "Ik heb het gezien": markeert een alarm als gezien, zodat de buzzer stopt.
import type { Alarm } from '../generated/restwell/v1/restwell_pb.js';
import { restWell } from './client.js';

/** `acknowledgedBy`: initialen of rol, nooit een volledige naam. */
export async function acknowledgeAlarm(
  alarmId: bigint,
  acknowledgedBy: string,
): Promise<Alarm | undefined> {
  const { alarm } = await restWell.acknowledgeAlarm({
    alarmId,
    acknowledgedBy,
  });
  return alarm;
}
