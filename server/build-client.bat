@echo off
REM Build the desktop client into a runnable jar (no run).
REM Output: desktop\build\libs\desktop-3.3.8.jar
setlocal
set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
echo Building Shattered Pixel Dungeon desktop client...
call "%ROOT_DIR%\gradlew.bat" :desktop:release
echo.
echo Done. The runnable jar is at: desktop\build\libs\desktop-3.3.8.jar
echo Run it with: java -jar desktop\build\libs\desktop-3.3.8.jar
endlocal