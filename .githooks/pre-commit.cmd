@echo off
node "%~dp0..\scripts\run-git-hook.js" pre-commit
exit /b %ERRORLEVEL%
