#!/usr/bin/env bash
# Installeert RestWell als systemd-service, zodat het vanzelf start als de Pi opstart.
# Uitvoeren op de Pi als de gewone gebruiker (niet met sudo): bash pi/deploy/install-service.sh
# Het script vraagt zelf om het sudo-wachtwoord waar nodig.
set -euo pipefail

SERVICE_NAME="restwell"
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PI_DIR="$(dirname "$DEPLOY_DIR")"
SERVICE_USER="$(id -un)"
NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

if [ "$(id -u)" -eq 0 ]; then
  echo "Voer dit script uit als je gewone gebruiker, niet met sudo: RestWell draait als die gebruiker." >&2
  exit 1
fi
if [ ! -x "$NVM_DIR/nvm-exec" ]; then
  echo "nvm niet gevonden in $NVM_DIR. Installeer nvm en Node 24 (zie pi/README.md)." >&2
  exit 1
fi
if [ ! -d "$PI_DIR/node_modules" ]; then
  echo "Dependencies ontbreken. Voer eerst 'npm install' uit in $PI_DIR." >&2
  exit 1
fi

UNIT_FILE="$(mktemp)"
trap 'rm -f "$UNIT_FILE"' EXIT
sed \
  -e "s|__USER__|$SERVICE_USER|" \
  -e "s|__PI_DIR__|$PI_DIR|" \
  -e "s|__NVM_DIR__|$NVM_DIR|" \
  "$DEPLOY_DIR/$SERVICE_NAME.service" > "$UNIT_FILE"

sudo install -m 644 "$UNIT_FILE" "/etc/systemd/system/$SERVICE_NAME.service"
sudo systemctl daemon-reload
sudo systemctl enable --now "$SERVICE_NAME"

echo "RestWell draait nu als service en start vanzelf bij het opstarten."
echo "Status: systemctl status $SERVICE_NAME    Logs: journalctl -u $SERVICE_NAME -f"
