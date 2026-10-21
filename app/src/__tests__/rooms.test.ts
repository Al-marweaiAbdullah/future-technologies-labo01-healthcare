import { create } from '@bufbuild/protobuf';
import { expect, test } from '@rstest/core';

import { RoomSchema } from '../generated/restwell/v1/restwell_pb.js';
import { pickRoom } from '../format/rooms.js';

// Verzonnen testdata.
const rooms = [
  create(RoomSchema, { id: 'room1', name: 'Kamer 1' }),
  create(RoomSchema, { id: 'room2', name: 'Kamer 2' }),
];

test('pickRoom geeft de gekozen kamer', () => {
  expect(pickRoom(rooms, 'room2')?.id).toBe('room2');
});

test('pickRoom valt terug op de eerste kamer zonder keuze of bij een onbekende kamer', () => {
  expect(pickRoom(rooms)?.id).toBe('room1');
  expect(pickRoom(rooms, 'weg')?.id).toBe('room1');
});

test('pickRoom geeft niets zonder kamers', () => {
  expect(pickRoom([], 'room1')).toBeUndefined();
});
