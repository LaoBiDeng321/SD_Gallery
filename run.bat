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

rem server.py 是重构前的旧版备份（它没有 /src/ 静态路由，跑不动新的模块化前端）
rem backend/app.py 使用相对导入，必须以模块方式启动
python -m backend.app

pause
