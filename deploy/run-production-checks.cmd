@echo off
setlocal

echo [SCUM] Running production readiness checks...
call npm run readiness:prod
if errorlevel 1 (
  echo [SCUM] readiness:prod failed
  exit /b 1
)

echo [SCUM] Running post-deploy smoke checks...
call npm run smoke:postdeploy
if errorlevel 1 (
  echo [SCUM] smoke:postdeploy failed
  exit /b 1
)

echo [SCUM] All production checks passed.
exit /b 0
