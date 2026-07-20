@echo off
REM Run the dedicated multiplayer server from the prebuilt jar (no gradle).
REM Usage:  run-server.bat [port]   (default 18765)
setlocal
set PORT=%1
if "%PORT%"=="" set PORT=18765

set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."

set "SERVER_JAR=%ROOT_DIR%\server\build\libs\server-3.3.8.jar"
if not exist "%SERVER_JAR%" (
    echo Server jar not found. Build it first with build-server.bat
    exit /b 1
)

set "CP=%SERVER_JAR%;%ROOT_DIR%\core\build\libs\core-3.3.8.jar;%ROOT_DIR%\SPD-classes\build\libs\SPD-classes-3.3.8.jar"

echo Starting Shattered Pixel Dungeon multiplayer server on port %PORT%...
java -cp "%CP%" com.shatteredpixel.shatteredpixeldungeon.multiplayer.server.MultiplayerServer %PORT%
endlocal