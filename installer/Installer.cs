using System;
using System.Diagnostics;
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
            
            // Welcome
            if (MessageBox.Show(
                "Welcome to SENTINEL v1.0.3 Setup\n\n" +
                "This wizard will install SENTINEL, an intelligent anti-DDoS protection platform.\n\n" +
                "Click OK to continue, or Cancel to exit.",
                "SENTINEL Setup",
                MessageBoxButtons.OKCancel,
                MessageBoxIcon.Information) != DialogResult.OK)
            {
                return;
            }
            
            // License
            string license = @"ISC License

Copyright (c) 2024 SENTINEL Team

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED 'AS IS'...";

            if (MessageBox.Show(
                "License Agreement:\n\n" + license.Substring(0, 300) + "...\n\n" +
                "Do you accept the license terms?",
                "License Agreement",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question) != DialogResult.Yes)
            {
                return;
            }
            
            // Check if files exist first
            string installPath = @"C:\Program Files\SENTINEL";
            string sourceDir = Path.GetDirectoryName(Application.ExecutablePath);
            string sourceExe = Path.Combine(sourceDir, "sentinel-win-x64.exe");
            string sourceReadme = Path.Combine(sourceDir, "README.txt");
            
            if (!File.Exists(sourceExe))
            {
                MessageBox.Show(
                    "Error: sentinel-win-x64.exe not found in:\n" + sourceDir + "\n\n" +
                    "Please make sure the installer is in the same folder as:\n" +
                    "- sentinel-win-x64.exe\n" +
                    "- README.txt",
                    "Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
                return;
            }
            
            // Show progress
            MessageBox.Show(
                "Installing SENTINEL to:\n" + installPath + "\n\n" +
                "Click OK to begin installation.",
                "Installing",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information);
            
            try
            {
                // Create directories
                Directory.CreateDirectory(installPath);
                Directory.CreateDirectory(Path.Combine(installPath, "data"));
                Directory.CreateDirectory(Path.Combine(installPath, "logs"));
                
                // Copy files
                File.Copy(sourceExe, 
                         Path.Combine(installPath, "sentinel.exe"), true);
                if (File.Exists(sourceReadme))
                {
                    File.Copy(sourceReadme, 
                             Path.Combine(installPath, "README.txt"), true);
                }
                
                // Add to PATH
                string currentPath = Environment.GetEnvironmentVariable("PATH", EnvironmentVariableTarget.Machine) ?? "";
                if (!currentPath.Contains(installPath))
                {
                    Environment.SetEnvironmentVariable("PATH", currentPath + ";" + installPath, EnvironmentVariableTarget.Machine);
                }
                
                // Create Start Menu shortcut
                string startMenu = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.CommonStartMenu),
                    "Programs", "SENTINEL");
                Directory.CreateDirectory(startMenu);
                
                // Create URL shortcut
                File.WriteAllText(Path.Combine(startMenu, "SENTINEL Dashboard.url"),
                    "[InternetShortcut]\nURL=http://localhost:3000/dashboard\n");
                
                MessageBox.Show(
                    "SENTINEL v1.0.3 has been successfully installed!\n\n" +
                    "Installation Location: " + installPath + "\n\n" +
                    "To start SENTINEL:\n" +
                    "1. Open Command Prompt\n" +
                    "2. Type: sentinel\n" +
                    "3. Open: http://localhost:3000/dashboard\n\n" +
                    "Start Menu shortcuts have been created.",
                    "Installation Complete",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Installation failed:\n" + ex.Message,
                    "Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
            }
        }
    }
}
