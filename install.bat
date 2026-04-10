@echo off
title SENTINEL Installation
color 0A
cls

echo ==========================================
echo   SENTINEL v1.0.3 Setup
echo ==========================================
echo.
echo Installing SENTINEL Anti-DDoS Protection...
echo.

:: Create directories
if not exist "%ProgramFiles%\SENTINEL" mkdir "%ProgramFiles%\SENTINEL"
if not exist "%ProgramFiles%\SENTINEL\data" mkdir "%ProgramFiles%\SENTINEL\data"
if not exist "%ProgramFiles%\SENTINEL\logs" mkdir "%ProgramFiles%\SENTINEL\logs"
if not exist "%ProgramFiles%\SENTINEL\public" mkdir "%ProgramFiles%\SENTINEL\public"
if not exist "%ProgramFiles%\SENTINEL\docs" mkdir "%ProgramFiles%\SENTINEL\docs"

echo [1/5] Creating directories... Done
echo.

:: Copy main executable
copy /Y "sentinel-win-x64.exe" "%ProgramFiles%\SENTINEL\sentinel.exe" >nul
echo [2/5] Copying SENTINEL executable... Done
echo.

:: Copy documentation
copy /Y "README.txt" "%ProgramFiles%\SENTINEL\" >nul
copy /Y "LICENSE.txt" "%ProgramFiles%\SENTINEL\" >nul
echo [3/5] Copying documentation... Done
echo.

:: Create Start Menu shortcuts
if not exist "%ProgramData%\Microsoft\Windows\Start Menu\Programs\SENTINEL" mkdir "%ProgramData%\Microsoft\Windows\Start Menu\Programs\SENTINEL"

powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%ProgramData%\Microsoft\Windows\Start Menu\Programs\SENTINEL\SENTINEL Dashboard.url'); $Shortcut.TargetPath = 'http://localhost:3000/dashboard'; $Shortcut.Save()" 2>nul
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%ProgramData%\Microsoft\Windows\Start Menu\Programs\SENTINEL\README.lnk'); $Shortcut.TargetPath = '%ProgramFiles%\SENTINEL\README.txt'; $Shortcut.Save()" 2>nul

echo [4/5] Creating shortcuts... Done
echo.

:: Add to PATH
setx PATH "%PATH%;%ProgramFiles%\SENTINEL" /M >nul 2>&1
echo [5/5] Adding to system PATH... Done
echo.

echo ==========================================
echo   Installation Complete!
echo ==========================================
echo.
echo SENTINEL has been installed to:
echo   %ProgramFiles%\SENTINEL\
echo.
echo TO START SENTINEL:
echo   1. Open Command Prompt (cmd.exe)
echo   2. Type: sentinel
echo   3. Press Enter
echo   4. Open browser to: http://localhost:3000/dashboard
echo.
echo START MENU: Look for "SENTINEL" in your Start Menu
echo.
echo Press any key to finish...
pause >nul
