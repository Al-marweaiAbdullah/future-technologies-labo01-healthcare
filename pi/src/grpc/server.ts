// Start de gRPC-server waarmee de app met de Pi praat.
// Connect spreekt over HTTP/1.1 het Connect- en gRPC-Web-protocol, zodat de Lynx-app het met fetch kan aanroepen.
import { createServer, type IncomingMessage, type Server } from "node:http";
import { cors as connectCors } from "@connectrpc/connect";
import { connectNodeAdapter } from "@connectrpc/connect-node";
import type { Db } from "../db/index.ts";
import { RestWellService } from "./generated/restwell/v1/restwell_pb.js";
import { createRestWellService } from "./service.ts";

// Alleen nodig voor de webpreview van Lynx (een browser); de app op de telefoon kent geen CORS.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": connectCors.allowedMethods.join(", "),
  "Access-Control-Allow-Headers": connectCors.allowedHeaders.join(", "),
  "Access-Control-Expose-Headers": connectCors.exposedHeaders.join(", "),
};

// "::ffff:192.168.1.23" wordt "192.168.1.23", zodat je het adres van de telefoon herkent.
function clientAddress(req: IncomingMessage): string {
  return req.socket.remoteAddress?.replace(/^::ffff:/, "") ?? "onbekend";
}

// "/restwell.v1.RestWellService/ListRooms" wordt "ListRooms".
function rpcName(req: IncomingMessage): string {
  return req.url?.split("/").pop() ?? "";
}

export function startGrpcServer(db: Db, port: number): Server {
  const handler = connectNodeAdapter({
    routes(router) {
      router.service(RestWellService, createRestWellService(db, console.log));
    },
  });

  const server = createServer((req, res) => {
    for (const [name, value] of Object.entries(CORS_HEADERS)) res.setHeader(name, value);
    if (req.method === "OPTIONS") {
      res.writeHead(204).end();
      return;
    }
    // Toont dat de app de Pi bereikt; blijft dit leeg, dan ligt het aan het netwerk.
    console.log(`Oproep ${rpcName(req)} van ${clientAddress(req)}`);
    handler(req, res);
  });

  server.listen(port, () => {
    console.log(`gRPC-server luistert op poort ${port}`);
  });
  return server;
}
