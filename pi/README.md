# pi

Code die op de Raspberry Pi draait, in TypeScript op Node.js, met SQLite als database (zie [AGENTS.md](../AGENTS.md)):

- uitlezen van de sensoren
- backend-logica
- opslag van metingen in SQLite
- aansturen van het OLED-scherm
- gRPC-server (implementeert het contract uit [`/proto`](../proto))

De gRPC-code wordt gegenereerd uit de `.proto`-bestanden in `/proto`.
