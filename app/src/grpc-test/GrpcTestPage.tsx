// Testpagina voor de verbinding met de gRPC-server. Toont welke web-API's Lynx heeft,
// of een gewone RPC lukt (ListRooms) en of de live-stroom (WatchRoom) binnenkomt.
import { useEffect, useState } from '@lynx-js/react';

import { Metric } from '../generated/restwell/v1/restwell_pb.js';
import { restWell } from '../grpc/client.js';
import { PI_URL } from '../grpc/config.js';
import { useRoomLive } from '../grpc/useRoomLive.js';
import './GrpcTestPage.css';

const TEST_ROOM_ID = 'room1';

// Wat Connect nodig heeft. TextEncoder en TextDecoder komen uit onze polyfill als Lynx ze niet heeft.
function checkWebApis(): [string, boolean][] {
  return [
    ['fetch', typeof fetch !== 'undefined'],
    ['Headers', typeof Headers !== 'undefined'],
    ['AbortController', typeof AbortController !== 'undefined'],
    ['ReadableStream', typeof ReadableStream !== 'undefined'],
    ['BigInt', typeof BigInt !== 'undefined'],
    ['TextEncoder', typeof TextEncoder !== 'undefined'],
    ['TextDecoder', typeof TextDecoder !== 'undefined'],
  ];
}

function useListRooms(): string {
  const [result, setResult] = useState('bezig…');

  useEffect(() => {
    restWell
      .listRooms({})
      .then(({ rooms }) => setResult(rooms.map((room) => room.name).join(', ')))
      .catch((error: unknown) => setResult(`fout: ${String(error)}`));
  }, []);

  return result;
}

function show(value: number | boolean | undefined, unit = ''): string {
  return value === undefined ? '–' : `${String(value)}${unit}`;
}

export function GrpcTestPage() {
  const [apis, setApis] = useState<[string, boolean][]>([]);
  const rooms = useListRooms();
  const live = useRoomLive(TEST_ROOM_ID);

  // Effecten draaien op de achtergrond-thread, waar fetch en co. bestaan.
  useEffect(() => setApis(checkWebApis()), []);

  return (
    <scroll-view className="Page" scroll-y>
      <text className="Title">gRPC-test</text>
      <text className="Note">Prototype, geen medisch hulpmiddel.</text>
      <text className="Line">Server: {PI_URL}</text>

      <text className="Heading">Web-API's in Lynx</text>
      {apis.map(([name, ok]) => (
        <text key={name} className="Line">
          {ok ? '✅' : '❌'} {name}
        </text>
      ))}

      <text className="Heading">ListRooms (gewone RPC)</text>
      <text className="Line">{rooms}</text>

      <text className="Heading">WatchRoom (live) – {TEST_ROOM_ID}</text>
      <text className="Line">Status: {live.status}</text>
      {live.error && <text className="Error">{live.error}</text>}
      <text className="Line">
        Temperatuur: {show(live.reading?.temperatureC, ' °C')}
      </text>
      <text className="Line">
        Luchtvochtigheid: {show(live.reading?.humidityPercent, ' %')}
      </text>
      <text className="Line">Licht: {show(live.reading?.lightLux)}</text>
      <text className="Line">Geluid: {show(live.reading?.soundDb)}</text>
      <text className="Line">
        Beweging: {show(live.reading?.motionDetected)}
      </text>

      <text className="Heading">Open alarmen: {live.alarms.length}</text>
      {live.alarms.map((alarm) => (
        <text key={String(alarm.id)} className="Line">
          #{String(alarm.id)} {Metric[alarm.metric]}: {alarm.reason}
        </text>
      ))}
    </scroll-view>
  );
}
