/**
 * SENTINEL - macOS DMG Builder
 * 
 * Creates a .dmg disk image for macOS distribution.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const pkg = require('../package.json');
const version = pkg.version;
const dmgName = `SENTINEL-${version}.dmg`;

console.log(`Building ${dmgName}...`);

const sourceDir = path.join(__dirname, '..');
const distDir = path.join(sourceDir, 'dist');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sentinel-dmg-'));

// Check if the executable exists
const sourceExe = path.join(distDir, 'sentinel-macos-x64');
if (!fs.existsSync(sourceExe)) {
  console.error('Error: Build the macOS executable first with: npm run build:macos');
  process.exit(1);
}

// Only works on macOS
if (process.platform !== 'darwin') {
  console.log('Warning: DMG creation only works on macOS.');
  console.log('Cross-platform DMG creation requires macOS build tools.');
  console.log('');
  console.log('Alternative: Create a .zip package instead:');
  console.log(`  cd ${distDir} && zip -r SENTINEL-${version}-macos.zip sentinel-macos-x64`);
  process.exit(0);
}

// Create app bundle structure
const appBundle = path.join(tempDir, 'SENTINEL.app');
const contentsDir = path.join(appBundle, 'Contents');
const macosDir = path.join(contentsDir, 'MacOS');
const resourcesDir = path.join(contentsDir, 'Resources');

[macosDir, resourcesDir].forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
});

// Copy executable
fs.copyFileSync(sourceExe, path.join(macosDir, 'sentinel'));
fs.chmodSync(path.join(macosDir, 'sentinel'), 0o755);

// Copy assets
const publicSrc = path.join(sourceDir, 'public');
const docsSrc = path.join(sourceDir, 'docs');

if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, path.join(resourcesDir, 'public'), { recursive: true });
}
if (fs.existsSync(docsSrc)) {
  fs.cpSync(docsSrc, path.join(resourcesDir, 'docs'), { recursive: true });
}

// Create Info.plist
const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleExecutable</key>
    <string>sentinel</string>
    <key>CFBundleIdentifier</key>
    <string>io.github.sentinel</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>SENTINEL</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>${version}</string>
    <key>CFBundleVersion</key>
    <string>${version}</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.14</string>
    <key>NSHumanReadableCopyright</key>
    <string>Copyright © 2024 SENTINEL Team. All rights reserved.</string>
    <key>LSBackgroundOnly</key>
    <true/>
</dict>
</plist>`;

fs.writeFileSync(path.join(contentsDir, 'Info.plist'), infoPlist);

// Create PkgInfo
fs.writeFileSync(path.join(contentsDir, 'PkgInfo'), 'APPL????');

// Create DMG
try {
  // Create a folder for the DMG contents
  const dmgContents = path.join(tempDir, 'DMG');
  fs.mkdirSync(dmgContents, { recursive: true });
  
  // Copy app bundle
  fs.cpSync(appBundle, path.join(dmgContents, 'SENTINEL.app'), { recursive: true });
  
  // Create Applications symlink
  fs.symlinkSync('/Applications', path.join(dmgContents, 'Applications'));
  
  // Create README
  const readme = `SENTINEL ${version}

Anti-DDoS Protection Platform

Installation:
1. Drag SENTINEL.app to your Applications folder
2. Double-click to run (requires terminal for server)
3. Or run from terminal: /Applications/SENTINEL.app/Contents/MacOS/sentinel

Dashboard: http://localhost:3000/dashboard

Documentation: https://github.com/matthewvaishnav/sentinal
`;
  fs.writeFileSync(path.join(dmgContents, 'README.txt'), readme);
  
  // Create the DMG using create-dmg or hdiutil
  const dmgPath = path.join(distDir, dmgName);
  
  try {
    // Try create-dmg first (better looking DMGs)
    execSync(`create-dmg \
      --volname "SENTINEL Installer" \
      --window-pos 200 120 \
      --window-size 600 400 \
      --icon-size 100 \
      --app-drop-link 450 185 \
      --add-file "SENTINEL.app" "${dmgContents}/SENTINEL.app" 150 185 \
      "${dmgPath}" \
      "${dmgContents}"`, { stdio: 'inherit' });
  } catch (err) {
    // Fallback to hdiutil
    console.log('create-dmg not found, using hdiutil...');
    
    const tempDmg = path.join(tempDir, 'temp.dmg');
    execSync(`hdiutil create -srcfolder "${dmgContents}" -volname "SENTINEL Installer" -fs HFS+ -format UDZO "${tempDmg}"`, { stdio: 'inherit' });
    fs.copyFileSync(tempDmg, dmgPath);
  }
  
  console.log(`✓ Created ${dmgName}`);
} catch (err) {
  console.error('Error creating DMG:', err.message);
  console.log('');
  console.log('Alternative: Create a .zip package:');
  console.log(`  cd ${distDir} && zip -r SENTINEL-${version}-macos.zip sentinel-macos-x64`);
  process.exit(1);
}

// Cleanup
try {
  fs.rmSync(tempDir, { recursive: true, force: true });
} catch (err) {
  // Ignore cleanup errors
}

console.log('DMG build complete!');
