/**
 * SENTINEL - AppImage Builder
 * 
 * Creates a universal Linux AppImage that works on most distributions.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const pkg = require('../package.json');
const version = pkg.version;
const appImageName = `SENTINEL-${version}-x86_64.AppImage`;

console.log(`Building ${appImageName}...`);

const sourceDir = path.join(__dirname, '..');
const distDir = path.join(sourceDir, 'dist');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sentinel-appimage-'));

// Check if the executable exists
const sourceExe = path.join(distDir, 'sentinel-linux-x64');
if (!fs.existsSync(sourceExe)) {
  console.error('Error: Build the Linux executable first with: npm run build:linux');
  process.exit(1);
}

// Create AppDir structure
const appDir = path.join(tempDir, 'SENTINEL.AppDir');
const usrDir = path.join(appDir, 'usr');
const binDir = path.join(usrDir, 'bin');
const shareDir = path.join(usrDir, 'share');

[binDir, shareDir].forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
});

// Copy executable
fs.copyFileSync(sourceExe, path.join(binDir, 'sentinel'));
fs.chmodSync(path.join(binDir, 'sentinel'), 0o755);

// Copy assets
const publicSrc = path.join(sourceDir, 'public');
const docsSrc = path.join(sourceDir, 'docs');

if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, path.join(shareDir, 'public'), { recursive: true });
}
if (fs.existsSync(docsSrc)) {
  fs.cpSync(docsSrc, path.join(shareDir, 'docs'), { recursive: true });
}

// Create AppRun script
const appRun = `#!/bin/bash
# SENTINEL AppRun script

SELF=$(readlink -f "$0")
HERE=\${SELF%/*}

export PATH="\${HERE}/usr/bin:\${PATH}"
export SENTINEL_ASSETS="\${HERE}/usr/share"

exec "\${HERE}/usr/bin/sentinel" "$@"
`;

fs.writeFileSync(path.join(appDir, 'AppRun'), appRun);
fs.chmodSync(path.join(appDir, 'AppRun'), 0o755);

// Create desktop entry
const desktopEntry = `[Desktop Entry]
Name=SENTINEL
Comment=Anti-DDoS Protection Platform
Exec=sentinel
Icon=sentinel
Type=Application
Categories=Network;Security;System;
Terminal=true
`;

fs.writeFileSync(path.join(appDir, 'sentinel.desktop'), desktopEntry);

// Create a simple icon (placeholder)
// In production, this would be a real PNG icon
const iconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <rect width="256" height="256" fill="#1a1a2e" rx="20"/>
  <text x="128" y="160" font-family="monospace" font-size="140" font-weight="bold" fill="#4a9eff" text-anchor="middle">S</text>
</svg>`;
fs.writeFileSync(path.join(appDir, 'sentinel.svg'), iconSvg);

// Try to convert SVG to PNG if ImageMagick is available
try {
  execSync(`convert -background none -size 256x256 "${path.join(appDir, 'sentinel.svg')}" "${path.join(appDir, '.DirIcon')}"`, { stdio: 'ignore' });
  execSync(`convert -background none -size 256x256 "${path.join(appDir, 'sentinel.svg')}" "${path.join(appDir, 'sentinel.png')}"`, { stdio: 'ignore' });
} catch (err) {
  // If convert fails, just copy the SVG
  fs.copyFileSync(path.join(appDir, 'sentinel.svg'), path.join(appDir, '.DirIcon'));
}

// Download appimagetool if not present
const appImageTool = path.join(tempDir, 'appimagetool-x86_64.AppImage');
if (!fs.existsSync(appImageTool)) {
  console.log('Downloading appimagetool...');
  try {
    execSync(`wget -q "https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage" -O "${appImageTool}"`, { stdio: 'inherit' });
    fs.chmodSync(appImageTool, 0o755);
  } catch (err) {
    console.error('Failed to download appimagetool');
    console.log('Trying curl...');
    try {
      execSync(`curl -sL "https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage" -o "${appImageTool}"`, { stdio: 'inherit' });
      fs.chmodSync(appImageTool, 0o755);
    } catch (err2) {
      console.error('Failed to download appimagetool. Please install it manually.');
      process.exit(1);
    }
  }
}

// Build the AppImage
try {
  execSync(`ARCH=x86_64 "${appImageTool}" "${appDir}" "${path.join(distDir, appImageName)}"`, { stdio: 'inherit' });
  console.log(`✓ Created ${appImageName}`);
} catch (err) {
  console.error('Error building AppImage:', err.message);
  console.log('');
  console.log('Make sure appimagetool is available and FUSE is working.');
  console.log('You may need to run:');
  console.log('  sudo modprobe fuse');
  console.log('  sudo usermod -a -G fuse $USER');
  process.exit(1);
}

// Cleanup
try {
  fs.rmSync(tempDir, { recursive: true, force: true });
} catch (err) {
  // Ignore cleanup errors
}

console.log('AppImage build complete!');
console.log('');
console.log('Usage:');
console.log(`  chmod +x ${appImageName}`);
console.log(`  ./${appImageName}`);
console.log('');
console.log('The AppImage includes all dependencies and works on most Linux distributions.');
