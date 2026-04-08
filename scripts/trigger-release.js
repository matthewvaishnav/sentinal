#!/usr/bin/env node
/**
 * SENTINEL - Release Trigger Script
 * 
 * Automates the release process:
 * 1. Verifies tests pass
 * 2. Updates version in package.json
 * 3. Creates git tag
 * 4. Pushes tag to trigger GitHub Actions release
 * 
 * Usage: node scripts/trigger-release.js [patch|minor|major]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const versionType = process.argv[2] || 'patch';

if (!['patch', 'minor', 'major'].includes(versionType)) {
  console.error('Usage: node scripts/trigger-release.js [patch|minor|major]');
  process.exit(1);
}

console.log(`🚀 SENTINEL Release Trigger`);
console.log(`   Version bump: ${versionType}`);
console.log('');

// Step 1: Verify working directory is clean
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  if (status.trim()) {
    console.error('❌ Error: Working directory has uncommitted changes.');
    console.error('   Please commit or stash changes before releasing.');
    process.exit(1);
  }
  console.log('✓ Working directory clean');
} catch (err) {
  console.error('❌ Error checking git status:', err.message);
  process.exit(1);
}

// Step 2: Run tests
console.log('');
console.log('🧪 Running tests...');
try {
  execSync('npm test', { stdio: 'inherit' });
  console.log('✓ All tests passed');
} catch (err) {
  console.error('❌ Tests failed. Aborting release.');
  process.exit(1);
}

// Step 3: Get current version
const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version;
console.log('');
console.log(`📦 Current version: ${currentVersion}`);

// Step 4: Calculate new version
const [major, minor, patch] = currentVersion.split('.').map(Number);
let newVersion;
switch (versionType) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}
console.log(`🆕 New version: ${newVersion}`);

// Step 5: Update package.json
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('✓ Updated package.json');

// Step 6: Commit version bump
try {
  execSync('git add package.json', { stdio: 'ignore' });
  execSync(`git commit -m "Release v${newVersion}"`, { stdio: 'ignore' });
  console.log('✓ Committed version bump');
} catch (err) {
  console.error('❌ Error committing version bump:', err.message);
  process.exit(1);
}

// Step 7: Create and push tag
try {
  execSync(`git tag v${newVersion}`, { stdio: 'ignore' });
  console.log(`✓ Created tag v${newVersion}`);
  
  execSync('git push origin main', { stdio: 'ignore' });
  execSync(`git push origin v${newVersion}`, { stdio: 'ignore' });
  console.log('✓ Pushed to origin');
} catch (err) {
  console.error('❌ Error pushing tag:', err.message);
  console.log('   You may need to push manually:');
  console.log(`   git push origin v${newVersion}`);
  process.exit(1);
}

console.log('');
console.log('🎉 Release triggered successfully!');
console.log('');
console.log('Next steps:');
console.log('  1. GitHub Actions will build all platforms (2-5 minutes)');
console.log('  2. Check progress at: https://github.com/matthewvaishnav/sentinal/actions');
console.log(`  3. Release will appear at: https://github.com/matthewvaishnav/sentinal/releases/tag/v${newVersion}`);
console.log('');
console.log('Packages that will be built:');
console.log('  • Windows: sentinel-win-x64.exe, SENTINEL-vX.X.X-Setup.exe');
console.log('  • Linux: sentinel-linux-x64, sentinel_vX.X.X_amd64.deb, SENTINEL-vX.X.X.AppImage');
console.log('  • macOS: sentinel-macos-x64, SENTINEL-vX.X.X.dmg');
