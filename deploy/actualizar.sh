#!/usr/bin/env bash
# En la EC2, desde la carpeta del proyecto: bash deploy/actualizar.sh
set -e
cd "$(dirname "$0")/.."
git pull
docker compose up -d --build
docker compose ps
curl -s localhost/api/health && echo
