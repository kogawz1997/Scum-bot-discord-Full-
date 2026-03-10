@echo off
setlocal

echo [SCUM] Starting production stack (Docker Compose)...
docker compose -f deploy/docker-compose.production.yml up -d --build
if errorlevel 1 (
  echo [SCUM] docker compose up failed
  exit /b 1
)

echo [SCUM] Stack started.
docker compose -f deploy/docker-compose.production.yml ps
exit /b 0
