@echo off
setlocal
chcp 65001 >nul
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0delivery\Create-Package.ps1" -Mode Prebuilt
set "HAWALATI_EXIT=%errorlevel%"
pause
exit /b %HAWALATI_EXIT%
