@echo off
setlocal

echo [SCUM] Stopping production stack (Docker Compose)...
docker compose -f deploy/docker-compose.production.yml down
if errorlevel 1 (
  echo [SCUM] docker compose down failed
  exit /b 1
)

echo [SCUM] Stack stopped.
exit /b 0
