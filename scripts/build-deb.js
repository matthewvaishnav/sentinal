/**
 * SENTINEL - Debian Package Builder
 * 
 * Creates a .deb package for Debian/Ubuntu systems.
 * Includes systemd service configuration.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const pkg = require('../package.json');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sentinel-deb-'));

const version = pkg.version;
const arch = 'amd64';
const debName = `sentinel_${version}_${arch}.deb`;

console.log(`Building ${debName}...`);

// Create Debian package structure
const debianDir = path.join(tempDir, 'DEBIAN');
const usrDir = path.join(tempDir, 'usr');
const binDir = path.join(usrDir, 'bin');
const shareDir = path.join(usrDir, 'share', 'sentinel');
const systemdDir = path.join(tempDir, 'lib', 'systemd', 'system');
const configDir = path.join(tempDir, 'etc', 'sentinel');

[debianDir, binDir, shareDir, systemdDir, configDir].forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
});

// Copy executable
const sourceExe = path.join(__dirname, '..', 'dist', 'sentinel-linux-x64');
const targetExe = path.join(binDir, 'sentinel');
if (fs.existsSync(sourceExe)) {
  fs.copyFileSync(sourceExe, targetExe);
  fs.chmodSync(targetExe, 0o755);
} else {
  console.error('Error: Build the Linux executable first with: npm run build:linux');
  process.exit(1);
}

// Copy assets
const publicSrc = path.join(__dirname, '..', 'public');
const docsSrc = path.join(__dirname, '..', 'docs');

if (fs.existsSync(publicSrc)) {
  execSync(`cp -r "${publicSrc}" "${shareDir}/"`);
}
if (fs.existsSync(docsSrc)) {
  execSync(`cp -r "${docsSrc}" "${shareDir}/"`);
}

// Create systemd service file
const serviceFile = `\
[Unit]
Description=SENTINEL Anti-DDoS Protection Platform
Documentation=https://github.com/matthewvaishnav/sentinel
After=network.target redis.service
Wants=redis.service

[Service]
Type=simple
User=sentinel
Group=sentinel
ExecStart=/usr/bin/sentinel
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
WorkingDirectory=/usr/share/sentinel
StandardOutput=journal
StandardError=journal
SyslogIdentifier=sentinel

[Install]
WantedBy=multi-user.target
`;

fs.writeFileSync(path.join(systemdDir, 'sentinel.service'), serviceFile);

// Copy default config
const envExample = path.join(__dirname, '..', '.env.example');
if (fs.existsSync(envExample)) {
  fs.copyFileSync(envExample, path.join(configDir, 'sentinel.conf'));
}

// Create control file
const controlFile = `Package: sentinel
Version: ${version}
Section: net
Priority: optional
Architecture: ${arch}
Depends: redis-server (>= 5.0) | redis-tools (>= 5.0)
Recommends: redis-server
Maintainer: SENTINEL Team <sentinel@example.com>
Description: Intelligent Anti-DDoS Protection Platform
 SENTINEL is a research-grade anti-DDoS intelligence platform with 
 adaptive threat detection, neural behavior prediction, and 
 decentralized threat sharing. Protects websites and APIs from 
 sophisticated bot attacks with zero latency.
Homepage: https://github.com/matthewvaishnav/sentinel
License: ISC
`;

fs.writeFileSync(path.join(debianDir, 'control'), controlFile);

// Create postinst script
const postinst = `#!/bin/bash
set -e

# Create sentinel user if it doesn't exist
if ! id -u sentinel >/dev/null 2>&1; then
    useradd --system --no-create-home --shell /bin/false sentinel
fi

# Set permissions
chown -R sentinel:sentinel /usr/share/sentinel 2>/dev/null || true
chown -R sentinel:sentinel /etc/sentinel 2>/dev/null || true

# Reload systemd
systemctl daemon-reload

echo "SENTINEL installed successfully!"
echo ""
echo "Next steps:"
echo "  1. Edit /etc/sentinel/sentinel.conf with your settings"
echo "  2. Start the service: sudo systemctl start sentinel"
echo "  3. Enable auto-start: sudo systemctl enable sentinel"
echo "  4. Check status: sudo systemctl status sentinel"
echo ""
echo "Dashboard: http://localhost:3000/dashboard"

exit 0
`;

fs.writeFileSync(path.join(debianDir, 'postinst'), postinst);
fs.chmodSync(path.join(debianDir, 'postinst'), 0o755);

// Create prerm script
const prerm = `#!/bin/bash
set -e

# Stop service if running
if systemctl is-active --quiet sentinel; then
    systemctl stop sentinel
fi

# Disable service
if systemctl is-enabled --quiet sentinel 2>/dev/null; then
    systemctl disable sentinel
fi

exit 0
`;

fs.writeFileSync(path.join(debianDir, 'prerm'), prerm);
fs.chmodSync(path.join(debianDir, 'prerm'), 0o755);

// Build the package
try {
  execSync(`dpkg-deb --build "${tempDir}" "${path.join(__dirname, '..', 'dist', debName)}"`, { stdio: 'inherit' });
  console.log(`✓ Created ${debName}`);
} catch (err) {
  console.error('Error building .deb package. Make sure dpkg-deb is installed.');
  console.error('On Debian/Ubuntu: sudo apt-get install dpkg-dev');
  process.exit(1);
}

// Cleanup
try {
  fs.rmSync(tempDir, { recursive: true, force: true });
} catch (err) {
  // Ignore cleanup errors
}

console.log('Debian package build complete!');
