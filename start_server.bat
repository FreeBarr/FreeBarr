@echo off
title Server Launcher - FreeBarr

cls
echo.
echo   ==================================================
echo    STARTING FREEBARR SERVER - NEW SESSION
echo   ==================================================
echo.
echo   This window monitors the server.
echo   The actual server process will run in a new window.
echo.
echo.

REM First time start without arguments. cmd /k keeps window open on error.
start "FreeBarr Server" /WAIT cmd /k python app.py

:restart_loop
cls
echo.
echo   ========================================
echo       !!! SERVER STOPPED !!!
echo   ========================================
echo.

:confirm_restart
set /p restart_choice="-> Restart server? (y/n): "

if /i "%restart_choice%"=="y" (
    cls
    echo.
    echo   =============================================
    echo    RESTARTING SERVER (RECOVERY MODE)
    echo   =============================================
    echo.
    echo   Existing data will NOT be deleted...
    echo.
    REM Restart with --no-reset argument
    start "FreeBarr Server (Restarted)" /WAIT cmd /k python app.py --no-reset
    goto restart_loop
) else if /i "%restart_choice%"=="n" (
    echo.
    echo   Closing...
    goto end
) else (
    echo.
    echo   Invalid option. Please enter 'y' or 'n'.
    goto confirm_restart
)

:end
echo.
echo   Goodbye!
timeout /t 3 > nul
exit