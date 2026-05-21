#!/bin/bash
cd "$(dirname "$0")"
if ! command -v python3 &> /dev/null; then
    echo "Error: Python3 not found. Please install Python 3.10+"
    exit 1
fi
python3 server.py