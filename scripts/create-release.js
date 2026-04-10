#!/usr/bin/env node
/**
 * SENTINEL - Create GitHub Release
 * 
 * This script creates a GitHub release and uploads assets.
 * Intended to be run by GitHub Actions, but can be run locally
 * if GITHUB_TOKEN is set.
 * 
 * Usage: node scripts/create-release.js [version]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

const pkg = require('../package.json');
const version = process.argv[2] || pkg.version;
const tagName = version.startsWith('v') ? version : `v${version}`;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'matthewvaishnav/sentinel';

if (!GITHUB_TOKEN) {
  console.error('❌ Error: GITHUB_TOKEN environment variable not set');
  console.log('   This script is designed to run in GitHub Actions.');
  console.log('   For local releases, use: npm run release:trigger');
  process.exit(1);
}

console.log(`🚀 Creating GitHub Release ${tagName}`);
console.log(`   Repository: ${GITHUB_REPO}`);
console.log('');

// Find all assets in dist directory
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  console.error('❌ Error: dist/ directory not found. Run npm run build:all first.');
  process.exit(1);
}

const assets = fs.readdirSync(distDir).filter(f => {
  // Include executables and packages
  return f.match(/sentinel/) || f.match(/SENTINEL/);
});

if (assets.length === 0) {
  console.error('❌ Error: No build artifacts found in dist/');
  console.log('   Run: npm run build:all');
  process.exit(1);
}

console.log('📦 Assets to upload:');
assets.forEach(a => console.log(`   - ${a}`));
console.log('');

// Create release
async function createRelease() {
  const releaseData = {
    tag_name: tagName,
    name: `SENTINEL ${tagName}`,
    body: `## SENTINEL ${tagName}

### Downloads

#### Windows
- \`SENTINEL-${tagName}-Setup.exe\` - Installer with PATH setup
- \`sentinel-win-x64.exe\` - Portable executable

#### Linux  
- \`sentinel_${tagName.replace('v', '')}_amd64.deb\` - Debian/Ubuntu package
- \`SENTINEL-${tagName}-x86_64.AppImage\` - Universal Linux package
- \`sentinel-linux-x64\` - Standalone executable

#### macOS
- \`SENTINEL-${tagName}.dmg\` - Disk image with app bundle
- \`sentinel-macos-x64\` - Standalone executable

### Quick Start

**Windows:**
\`\`\`powershell
# Run installer
SENTINEL-${tagName}-Setup.exe

# Or portable
.\\sentinel-win-x64.exe
\`\`\`

**Linux:**
\`\`\`bash
# Debian/Ubuntu
sudo dpkg -i sentinel_${tagName.replace('v', '')}_amd64.deb
sudo systemctl start sentinel

# Or AppImage
chmod +x SENTINEL-${tagName}-x86_64.AppImage
./SENTINEL-${tagName}-x86_64.AppImage
\`\`\`

**macOS:**
\`\`\`bash
open SENTINEL-${tagName}.dmg
# Drag to Applications
\`\`\`

### Verification
All binaries are built from the tagged commit via GitHub Actions.
`,
    draft: false,
    prerelease: false
  };

  return new Promise((resolve, reject) => {
    const data = JSON.stringify(releaseData);
    
    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: `/repos/${GITHUB_REPO}/releases`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'sentinel-release-script'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        const response = JSON.parse(responseData);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✓ Release created');
          console.log(`  URL: ${response.html_url}`);
          resolve(response);
        } else {
          reject(new Error(`GitHub API error: ${response.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Upload asset
async function uploadAsset(release, assetPath) {
  const assetName = path.basename(assetPath);
  const assetSize = fs.statSync(assetPath).size;
  const assetData = fs.readFileSync(assetPath);
  
  const uploadUrl = release.upload_url.replace('{?name,label}', `?name=${encodeURIComponent(assetName)}`);
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'uploads.github.com',
      port: 443,
      path: uploadUrl.replace('https://uploads.github.com', ''),
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': assetSize,
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'sentinel-release-script'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`  ✓ ${assetName}`);
          resolve();
        } else {
          const response = JSON.parse(responseData);
          reject(new Error(`Upload failed: ${response.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(assetData);
    req.end();
  });
}

// Main execution
(async () => {
  try {
    console.log('Creating release...');
    const release = await createRelease();
    
    console.log('');
    console.log('Uploading assets...');
    
    for (const asset of assets) {
      const assetPath = path.join(distDir, asset);
      await uploadAsset(release, assetPath);
    }
    
    console.log('');
    console.log('🎉 Release complete!');
    console.log(`   ${release.html_url}`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    
    // Check if release already exists
    if (err.message.includes('already_exists')) {
      console.log('');
      console.log('ℹ️  A release for this tag already exists.');
      console.log('   Delete it first, or use a new version.');
    }
    
    process.exit(1);
  }
})();
