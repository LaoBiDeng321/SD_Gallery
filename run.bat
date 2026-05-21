@echo off
chcp 65001 >nul 2>&1
title SD Gallery

cd /d "%~dp0"

python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python not found. Please install Python 3.10+
    pause
    exit /b 1
)

python server.py

pause
