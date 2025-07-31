@echo off
echo Starting ZKTeco K50 Service...
cd /d "%~dp0"
set EXE_NAME=zkteco-k50-service.exe
set DIST_EXE=dist/%EXE_NAME%

REM Check if the executable exists in the dist folder first
if exist "%DIST_EXE%" (
    echo Found executable in dist folder.
    start "%config.serviceName%" "%DIST_EXE%"
    echo Service started successfully from dist folder!
) else if exist "%EXE_NAME%" (
    REM Check if the executable exists in the root folder
    echo Found executable in root folder.
    start "%config.serviceName%" "%EXE_NAME%"
    echo Service started successfully from root folder!
) else if exist "main.js" (
    REM Fallback to running with Node.js if no executable is found
    echo Executable not found. Starting with Node.js...
    start "%config.serviceName%" node main.js
    echo Service started with Node.js!
) else (
    echo Error: No executable or main.js found!
    echo Please build the project first by running 'npm run build-win'
    pause
)
timeout /t 5 >nul
