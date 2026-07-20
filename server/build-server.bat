@echo off
REM Build the dedicated multiplayer server jar (no run).
setlocal
set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
echo Building Shattered Pixel Dungeon multiplayer server...
call "%ROOT_DIR%\gradlew.bat" :server:jar
echo.
echo Done. The jar is at: server\build\libs\server-3.3.8.jar
echo Run it with: run-server.bat [port]
endlocal