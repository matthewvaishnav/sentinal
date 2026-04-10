@echo off
title SENTINEL v1.0.3 Setup Wizard
color 0B
cls

echo ==========================================
echo     SENTINEL v1.0.3 Setup Wizard
echo ==========================================
echo.
echo Welcome to the SENTINEL Installation
echo.
echo This wizard will install SENTINEL, an
echo intelligent anti-DDoS protection platform.
echo.
echo Press any key to continue...
pause >nul

:License
cls
echo ==========================================
echo     License Agreement
echo ==========================================
echo.
type LICENSE.txt
echo.
echo.
echo Do you accept the license agreement? (Y/N)
set /p accept=
if /i "%accept%"=="Y" goto InstallLocation
if /i "%accept%"=="y" goto InstallLocation
goto End

:InstallLocation
cls
echo ==========================================
echo     Installation Location
echo ==========================================
echo.
echo SENTINEL will be installed to:
echo   C:\Program Files\SENTINEL\
echo.
echo Press any key to install to this location...
pause >nul

:Install
cls
echo ==========================================
echo     Installing SENTINEL...
echo ==========================================
echo.
echo Please wait while SENTINEL is installed...
echo.

:: Create directories
if not exist "C:\Program Files\SENTINEL" mkdir "C:\Program Files\SENTINEL" && echo [OK] Created main directory
if not exist "C:\Program Files\SENTINEL\data" mkdir "C:\Program Files\SENTINEL\data" && echo [OK] Created data directory
if not exist "C:\Program Files\SENTINEL\logs" mkdir "C:\Program Files\SENTINEL\logs" && echo [OK] Created logs directory

:: Copy main executable
copy /Y "dist\sentinel-win-x64.exe" "C:\Program Files\SENTINEL\sentinel.exe" >nul && echo [OK] Copied SENTINEL executable

:: Copy documentation
copy /Y "README.txt" "C:\Program Files\SENTINEL\" >nul && echo [OK] Copied README
copy /Y "LICENSE.txt" "C:\Program Files\SENTINEL\" >nul && echo [OK] Copied LICENSE
copy /Y ".env.example" "C:\Program Files\SENTINEL\" >nul && echo [OK] Copied configuration example

:: Copy assets
if exist "public" xcopy /E /I /Y "public" "C:\Program Files\SENTINEL\public" >nul && echo [OK] Copied dashboard files
if exist "docs" xcopy /E /I /Y "docs" "C:\Program Files\SENTINEL\docs" >nul && echo [OK] Copied documentation

:: Create Start Menu shortcuts
if not exist "%ProgramData%\Microsoft\Windows\Start Menu\Programs\SENTINEL" mkdir "%ProgramData%\Microsoft\Windows\Start Menu\Programs\SENTINEL"
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%ProgramData%\Microsoft\Windows\Start Menu\Programs\SENTINEL\SENTINEL Dashboard.url'); $Shortcut.TargetPath = 'http://localhost:3000/dashboard'; $Shortcut.Save()" 2>nul && echo [OK] Created Start Menu shortcut

echo.

:Complete
cls
echo ==========================================
echo     Installation Complete!
echo ==========================================
echo.
echo SENTINEL v1.0.3 has been successfully
echo installed on your computer.
echo.
echo Installation Location:
echo   C:\Program Files\SENTINEL\
echo.
echo Start Menu shortcuts have been created.
echo.
echo TO START SENTINEL:
echo   1. Open Command Prompt
echo   2. Type: sentinel
echo   3. Open browser to:
echo      http://localhost:3000/dashboard
echo.
echo Press any key to finish...
pause >nul

:End
cls
echo Setup completed.
exit /b 0
