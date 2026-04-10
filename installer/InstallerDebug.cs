using System;
using System.IO;
using System.Windows.Forms;

namespace SENTINELInstaller
{
    class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            
            string logFile = @"C:\temp\sentinel_install.log";
            try
            {
                Directory.CreateDirectory(@"C:\temp");
                File.AppendAllText(logFile, "=== Starting installer ===\n");
                
                // Welcome
                File.AppendAllText(logFile, "Showing welcome dialog...\n");
                var result = MessageBox.Show(
                    "Welcome to SENTINEL v1.0.3 Setup\n\n" +
                    "Click OK to continue.",
                    "SENTINEL Setup",
                    MessageBoxButtons.OKCancel,
                    MessageBoxIcon.Information);
                
                File.AppendAllText(logFile, "Welcome result: " + result + "\n");
                
                if (result != DialogResult.OK)
                {
                    File.AppendAllText(logFile, "User cancelled at welcome\n");
                    return;
                }
                
                // License
                File.AppendAllText(logFile, "Showing license dialog...\n");
                var licenseResult = MessageBox.Show(
                    "Do you accept the license terms?",
                    "License Agreement",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Question);
                
                File.AppendAllText(logFile, "License result: " + licenseResult + "\n");
                
                if (licenseResult != DialogResult.Yes)
                {
                    File.AppendAllText(logFile, "User declined license\n");
                    return;
                }
                
                // Get paths - use user folder (no admin needed)
                File.AppendAllText(logFile, "Getting paths...\n");
                string installPath = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), 
                    "SENTINEL");
                string sourceDir = Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location);
                
                File.AppendAllText(logFile, "Source dir: " + sourceDir + "\n");
                File.AppendAllText(logFile, "Install path: " + installPath + "\n");
                
                // Check source files
                string sourceExe = Path.Combine(sourceDir, "sentinel-win-x64.exe");
                string sourceReadme = Path.Combine(sourceDir, "README.txt");
                
                File.AppendAllText(logFile, "Checking source exe: " + sourceExe + "\n");
                File.AppendAllText(logFile, "File exists: " + File.Exists(sourceExe) + "\n");
                
                if (!File.Exists(sourceExe))
                {
                    File.AppendAllText(logFile, "ERROR: Source file not found!\n");
                    MessageBox.Show(
                        "Error: sentinel-win-x64.exe not found in:\n" + sourceDir,
                        "Error",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error);
                    return;
                }
                
                // Show installing message
                File.AppendAllText(logFile, "Showing installing message...\n");
                MessageBox.Show(
                    "Installing SENTINEL to:\n" + installPath + "\n\nClick OK to start.",
                    "Installing",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
                
                // Create directories
                File.AppendAllText(logFile, "Creating directories...\n");
                Directory.CreateDirectory(installPath);
                Directory.CreateDirectory(Path.Combine(installPath, "data"));
                Directory.CreateDirectory(Path.Combine(installPath, "logs"));
                
                // Copy files
                File.AppendAllText(logFile, "Copying files...\n");
                File.Copy(sourceExe, Path.Combine(installPath, "sentinel.exe"), true);
                
                if (File.Exists(sourceReadme))
                {
                    File.AppendAllText(logFile, "Copying readme...\n");
                    File.Copy(sourceReadme, Path.Combine(installPath, "README.txt"), true);
                }
                
                // Success
                File.AppendAllText(logFile, "Installation complete!\n");
                MessageBox.Show(
                    "SENTINEL installed successfully!\n\n" +
                    "Location: " + installPath + "\n\n" +
                    "To run: Open Command Prompt and type 'sentinel'",
                    "Complete",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                string error = "ERROR: " + ex.GetType().Name + ": " + ex.Message + "\n" + ex.StackTrace;
                try
                {
                    File.AppendAllText(logFile, error + "\n");
                }
                catch { }
                
                MessageBox.Show(
                    "Installation failed:\n\n" + ex.Message + "\n\n" +
                    "See log: " + logFile,
                    "Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
            }
        }
    }
}
