using System;
using System.Diagnostics;
using System.IO;
using System.ServiceProcess;
using System.Threading;

namespace SENTINELService
{
    class Program
    {
        static void Main(string[] args)
        {
            if (Environment.UserInteractive)
            {
                // Run as console app for testing
                Console.WriteLine("Starting SENTINEL...");
                RunServer();
            }
            else
            {
                // Run as Windows Service
                ServiceBase.Run(new SentinelService());
            }
        }

        static void RunServer()
        {
            string exePath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "SENTINEL", "sentinel.exe");
            
            if (!File.Exists(exePath))
            {
                Console.WriteLine("Error: sentinel.exe not found at: " + exePath);
                return;
            }

            var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = exePath,
                    WorkingDirectory = Path.GetDirectoryName(exePath),
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true
                }
            };

            process.OutputDataReceived += (sender, e) => Console.WriteLine(e.Data);
            process.ErrorDataReceived += (sender, e) => Console.WriteLine("ERROR: " + e.Data);

            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();

            Console.WriteLine("SENTINEL running on http://localhost:3000");
            Console.WriteLine("Press Ctrl+C to stop...");
            
            process.WaitForExit();
        }
    }

    public class SentinelService : ServiceBase
    {
        private Process process;

        public SentinelService()
        {
            ServiceName = "SENTINEL";
            CanStop = true;
            CanPauseAndContinue = true;
        }

        protected override void OnStart(string[] args)
        {
            string exePath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "SENTINEL", "sentinel.exe");

            process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = exePath,
                    WorkingDirectory = Path.GetDirectoryName(exePath),
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true
                }
            };

            process.Start();
        }

        protected override void OnStop()
        {
            if (process != null && !process.HasExited)
            {
                process.Kill();
                process.WaitForExit();
            }
        }
    }
}
