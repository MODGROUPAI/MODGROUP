@echo off
cd /d "%~dp0"
PowerShell -ExecutionPolicy Bypass -File "%~dp0install.ps1"
pause
