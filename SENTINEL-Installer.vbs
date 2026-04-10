' SENTINEL GUI Installer Wrapper
' This runs the installation with a proper GUI experience

Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Get the script directory
strScriptPath = objFSO.GetParentFolderName(WScript.ScriptFullName)

' Show welcome message
result = MsgBox("Welcome to SENTINEL v1.0.3 Setup" & vbCrLf & vbCrLf & _
    "This wizard will guide you through the installation of SENTINEL," & vbCrLf & _
    "an intelligent anti-DDoS protection platform." & vbCrLf & vbCrLf & _
    "Click OK to continue, or Cancel to exit.", vbOKCancel + vbInformation, "SENTINEL Setup")

If result = vbCancel Then
    WScript.Quit 0
End If

' Check if executable exists
If Not objFSO.FileExists(strScriptPath & "\dist\sentinel-win-x64.exe") Then
    MsgBox "Error: SENTINEL executable not found." & vbCrLf & _
           "Please make sure the dist folder contains sentinel-win-x64.exe", _
           vbCritical, "Setup Error"
    WScript.Quit 1
End If

' Show license
If objFSO.FileExists(strScriptPath & "\LICENSE.txt") Then
    Set objFile = objFSO.OpenTextFile(strScriptPath & "\LICENSE.txt", 1)
    strLicense = objFile.ReadAll
    objFile.Close
    
    result = MsgBox("Please review the license agreement:" & vbCrLf & vbCrLf & _
        Left(strLicense, 500) & "..." & vbCrLf & vbCrLf & _
        "Do you accept the license terms?", vbYesNo + vbQuestion, "License Agreement")
    
    If result = vbNo Then
        MsgBox "Setup cannot continue without accepting the license agreement.", vbExclamation, "Setup"
        WScript.Quit 1
    End If
End If

' Show installation location
result = MsgBox("SENTINEL will be installed to:" & vbCrLf & vbCrLf & _
    "C:\Program Files\SENTINEL\" & vbCrLf & vbCrLf & _
    "Click OK to begin installation, or Cancel to exit.", _
    vbOKCancel + vbInformation, "Ready to Install")

If result = vbCancel Then
    WScript.Quit 0
End If

' Run the installer
MsgBox "Installing SENTINEL..." & vbCrLf & vbCrLf & _
       "Please wait while the installation completes.", _
       vbInformation, "Installing"

' Execute the batch file silently
objShell.Run "cmd /c """ & strScriptPath & "\SENTINEL-Setup.bat"""", 0, True

' Show completion
MsgBox "SENTINEL v1.0.3 has been successfully installed!" & vbCrLf & vbCrLf & _
       "Installation Location: C:\Program Files\SENTINEL\" & vbCrLf & vbCrLf & _
       "To start SENTINEL:" & vbCrLf & _
       "1. Open Command Prompt" & vbCrLf & _
       "2. Type: sentinel" & vbCrLf & _
       "3. Open browser to: http://localhost:3000/dashboard" & vbCrLf & vbCrLf & _
       "Start Menu shortcuts have been created.", _
       vbInformation, "Installation Complete"

WScript.Quit 0
