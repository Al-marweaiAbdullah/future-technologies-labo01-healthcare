// Welke kamer de tabs Drempels en Alarmen tonen. Pure functie, zonder Lynx.
import type { Room } from '../generated/restwell/v1/restwell_pb.js';

/** De gekozen kamer, of de eerste als er nog niets gekozen is (of de kamer niet meer bestaat). */
export function pickRoom(rooms: Room[], selectedId?: string): Room | undefined {
  return rooms.find((room) => room.id === selectedId) ?? rooms[0];
}
