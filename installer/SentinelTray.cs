using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Windows.Forms;

namespace SENTINELTray
{
    class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new TrayApplication());
        }
    }

    class TrayApplication : ApplicationContext
    {
        private NotifyIcon trayIcon;
        private Process serverProcess;
        private bool isRunning = false;
        private string sentinelPath;

        public TrayApplication()
        {
            // Get SENTINEL path
            sentinelPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "SENTINEL", "sentinel.exe");

            // Create tray icon
            trayIcon = new NotifyIcon()
            {
                Icon = SystemIcons.Shield,
                Text = "SENTINEL - Stopped",
                Visible = true
            };

            // Create context menu
            var contextMenu = new ContextMenuStrip();
            
            var startStopItem = new ToolStripMenuItem("Start SENTINEL", null, ToggleServer);
            startStopItem.Name = "StartStop";
            contextMenu.Items.Add(startStopItem);
            
            contextMenu.Items.Add(new ToolStripSeparator());
            
            contextMenu.Items.Add("Open Dashboard", null, (s, e) => 
            {
                Process.Start("http://localhost:3000/dashboard");
            });
            
            contextMenu.Items.Add("Open Folder", null, (s, e) => 
            {
                Process.Start("explorer.exe", Path.GetDirectoryName(sentinelPath));
            });
            
            contextMenu.Items.Add(new ToolStripSeparator());
            
            contextMenu.Items.Add("Exit", null, (s, e) => 
            {
                StopServer();
                trayIcon.Visible = false;
                Application.Exit();
            });

            trayIcon.ContextMenuStrip = contextMenu;
            
            // Double-click to open dashboard
            trayIcon.DoubleClick += (s, e) => 
            {
                Process.Start("http://localhost:3000/dashboard");
            };

            // Auto-start on launch
            StartServer();
        }

        private void ToggleServer(object sender, EventArgs e)
        {
            if (isRunning)
            {
                StopServer();
                ((ToolStripMenuItem)trayIcon.ContextMenuStrip.Items["StartStop"]).Text = "Start SENTINEL";
            }
            else
            {
                StartServer();
                ((ToolStripMenuItem)trayIcon.ContextMenuStrip.Items["StartStop"]).Text = "Stop SENTINEL";
            }
        }

        private void StartServer()
        {
            if (!File.Exists(sentinelPath))
            {
                MessageBox.Show(
                    "SENTINEL not found at:\n" + sentinelPath + "\n\n" +
                    "Please run the installer first.",
                    "Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
                return;
            }

            try
            {
                serverProcess = new Process
                {
                    StartInfo = new ProcessStartInfo
                    {
                        FileName = sentinelPath,
                        WorkingDirectory = Path.GetDirectoryName(sentinelPath),
                        UseShellExecute = false,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        CreateNoWindow = true
                    }
                };

                serverProcess.Start();
                
                isRunning = true;
                trayIcon.Icon = SystemIcons.Shield;
                trayIcon.Text = "SENTINEL - Running (localhost:3000)";
                ((ToolStripMenuItem)trayIcon.ContextMenuStrip.Items["StartStop"]).Text = "Stop SENTINEL";
                
                // Show notification
                trayIcon.ShowBalloonTip(3000, "SENTINEL Started", 
                    "Dashboard: http://localhost:3000/dashboard", ToolTipIcon.Info);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Failed to start SENTINEL:\n" + ex.Message,
                    "Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
            }
        }

        private void StopServer()
        {
            if (serverProcess != null && !serverProcess.HasExited)
            {
                serverProcess.Kill();
                serverProcess.WaitForExit(5000);
                serverProcess.Dispose();
            }

            isRunning = false;
            trayIcon.Icon = SystemIcons.Shield;
            trayIcon.Text = "SENTINEL - Stopped";
            ((ToolStripMenuItem)trayIcon.ContextMenuStrip.Items["StartStop"]).Text = "Start SENTINEL";
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                StopServer();
                if (trayIcon != null) trayIcon.Dispose();
            }
            base.Dispose(disposing);
        }
    }
}
