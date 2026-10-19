# pi

Python-code die op de Raspberry Pi draait:

- uitlezen van de sensoren
- backend-logica
- aansturen van het OLED-scherm
- gRPC-server (implementeert het contract uit [`/proto`](../proto))

De gRPC-code wordt gegenereerd uit de `.proto`-bestanden in `/proto`.
