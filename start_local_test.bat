@echo off
title Local Test Server with Auto-DB Sync (Port 5500)
echo ====================================================
echo Starting Local Test Web Server with Auto-Sync...
echo ====================================================
echo [Admin Page]:   http://localhost:5500/admin.html
echo [Patient Page]: http://localhost:5500/index.html
echo ====================================================
python server.py 5500
pause
