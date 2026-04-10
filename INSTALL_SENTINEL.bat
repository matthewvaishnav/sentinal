@echo off
title SENTINEL Installer
color 0A
cls

echo ==========================================
echo   SENTINEL Setup Wizard
echo ==========================================
echo.
echo Welcome to the SENTINEL Installation
echo.
echo This will install SENTINEL to:
echo   C:\Program Files\SENTINEL\
echo.
echo Press any key to continue...
pause >nul

cls
echo ==========================================
echo   Step 1: Creating Directories
echo ==========================================
echo.

if not exist "C:\Program Files\SENTINEL" mkdir "C:\Program Files\SENTINEL"
if not exist "C:\Program Files\SENTINEL\data" mkdir "C:\Program Files\SENTINEL\data"
if not exist "C:\Program Files\SENTINEL\logs" mkdir "C:\Program Files\SENTINEL\logs"

echo [OK] Directories created
echo.

cls
echo ==========================================
echo   Step 2: Copying Files
echo ==========================================
echo.

copy /Y "dist\sentinel-win-x64.exe" "C:\Program Files\SENTINEL\sentinel.exe"
if exist "public" xcopy /E /I /Y "public" "C:\Program Files\SENTINEL\public"
if exist "docs" xcopy /E /I /Y "docs" "C:\Program Files\SENTINEL\docs"
if exist ".env.example" copy /Y ".env.example" "C:\Program Files\SENTINEL\.env.example"

echo [OK] Files copied
echo.

cls
echo ==========================================
echo   Step 3: Creating Shortcuts
echo ==========================================
echo.

if not exist "%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\SENTINEL" mkdir "%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\SENTINEL"

powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\SENTINEL\SENTINEL Dashboard.lnk'); $Shortcut.TargetPath = 'http://localhost:3000/dashboard'; $Shortcut.Save()"

echo [OK] Start Menu shortcuts created
echo.

cls
echo ==========================================
echo   Installation Complete!
echo ==========================================
echo.
echo SENTINEL has been installed to:
echo   C:\Program Files\SENTINEL\
echo.
echo To start SENTINEL:
echo   1. Open Command Prompt
echo   2. Type: sentinel
echo   3. Open browser to: http://localhost:3000/dashboard
echo.
echo Dashboard URL: http://localhost:3000/dashboard
echo.
echo Press any key to exit...
pause >nul
