@echo off
node "%~dp0..\scripts\run-git-hook.js" pre-push
exit /b %ERRORLEVEL%
