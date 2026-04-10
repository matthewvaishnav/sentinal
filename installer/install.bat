@echo off
title SENTINEL Setup
color 0A
cls

echo.
echo  ============================================
echo     SENTINEL v1.0.3 - Installation
echo  ============================================
echo.
echo  Installing SENTINEL to C:\Program Files\SENTINEL\
echo.
echo  Press any key to continue...
pause >nul

:: Get the directory where this batch file is located
set "SOURCEDIR=%~dp0"

:: Create directories
if not exist "C:\Program Files\SENTINEL" mkdir "C:\Program Files\SENTINEL"
if not exist "C:\Program Files\SENTINEL\data" mkdir "C:\Program Files\SENTINEL\data"
if not exist "C:\Program Files\SENTINEL\logs" mkdir "C:\Program Files\SENTINEL\logs"

:: Copy files from source directory
copy /Y "%SOURCEDIR%sentinel-win-x64.exe" "C:\Program Files\SENTINEL\sentinel.exe" >nul
copy /Y "%SOURCEDIR%README.txt" "C:\Program Files\SENTINEL\" >nul

:: Create Start Menu shortcut
if not exist "%ProgramData%\Microsoft\Windows\Start Menu\Programs\SENTINEL" mkdir "%ProgramData%\Microsoft\Windows\Start Menu\Programs\SENTINEL"
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%ProgramData%\Microsoft\Windows\Start Menu\Programs\SENTINEL\SENTINEL Dashboard.url'); $Shortcut.TargetPath = 'http://localhost:3000/dashboard'; $Shortcut.Save()" 2>nul

:: Add to PATH
setx PATH "%PATH%;C:\Program Files\SENTINEL" /M >nul 2>&1

echo  [OK] SENTINEL installed successfully!
echo.
echo  Installation complete.
echo.
echo  To start SENTINEL:
echo    1. Open Command Prompt
echo    2. Type: sentinel
echo    3. Open: http://localhost:3000/dashboard
echo.
pause
