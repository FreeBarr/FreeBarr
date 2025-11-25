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
echo.

:CONFIRM_LOOP
set /p confirmation="*** To Confirm, type 'CONFIRM' and press ENTER: "
echo.

REM The /I switch makes the comparison case-insensitive (e.g., 'confirm' or 'CONFIRM' works)
if /I "%confirmation%"=="CONFIRM" (
    goto CONFIRM_SUCCESS
) else (
    echo.
    echo   ERROR: Incorrect input. Please type 'CONFIRM' exactly to proceed.
    echo.
    goto CONFIRM_LOOP
)

:CONFIRM_SUCCESS
REM --- CONFIRMATION SUCCESS: COLOR CHANGE ---
color 07 
echo.
echo   Confirmed. Executing reset...
echo.

REM This runs the app with the reset flag we added to the python code
python app.py --new-day

pause