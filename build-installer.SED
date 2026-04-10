[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=0
HideExtractAnimation=0
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=%InstallPrompt%
DisplayLicense=%DisplayLicense%
FinishMessage=%FinishMessage%
TargetName=%TargetName%
FriendlyName=%FriendlyName%
AppLaunched=%AppLaunched%
PostInstallCmd=%PostInstallCmd%
AdminQuietInstCmd=%AdminQuietInstCmd%
UserQuietInstCmd=%UserQuietInstCmd%
SourceFiles=SourceFiles
[Strings]
InstallPrompt=This wizard will install SENTINEL 1.0.3 on your computer. Click Next to continue.
DisplayLicense=C:\Users\matth\Desktop\sentinal\LICENSE.txt
FinishMessage=SENTINEL has been successfully installed!
TargetName=C:\Users\matth\Desktop\sentinal\dist\SENTINEL-v1.0.3-Setup-NEW.exe
FriendlyName=SENTINEL Installer
AppLaunched=cmd /c install.bat
PostInstallCmd=<None>
AdminQuietInstCmd=
UserQuietInstCmd=
FILE0="sentinel-win-x64.exe"
FILE1="install.bat"
FILE2="README.txt"
FILE3="LICENSE.txt"
[SourceFiles]
SourceFiles0=C:\Users\matth\Desktop\sentinal\dist\
SourceFiles1=C:\Users\matth\Desktop\sentinal\
[SourceFiles0]
%FILE0%=
[SourceFiles1]
%FILE1%=
%FILE2%=
%FILE3%=
