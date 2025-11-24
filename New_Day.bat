@echo off
title FreeBarr - NEW DAY (Reset)
color 4f

echo.
echo   ==================================================
echo    STARTING NEW DAY - CLEARING OLD ORDERS
echo   ==================================================
echo.
echo   WARNING: This will delete all order history from
echo   the previous session to start fresh.
echo.
pause

REM This runs the app with the reset flag we added to the python code
python app.py --new-day

pause