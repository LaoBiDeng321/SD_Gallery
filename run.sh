#!/bin/bash
cd "$(dirname "$0")"
if ! command -v python3 &> /dev/null; then
    echo "Error: Python3 not found. Please install Python 3.10+"
    exit 1
fi
# server.py 是重构前的旧版备份（它没有 /src/ 静态路由，跑不动新的模块化前端）
# backend/app.py 使用相对导入，必须以模块方式启动
python3 -m backend.app