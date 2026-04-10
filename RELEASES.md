# SENTINEL Releases

This document describes how SENTINEL is packaged and distributed across platforms.

## 📦 Available Packages

| Platform | Package | Description |
|----------|---------|-------------|
| **Windows** | `SENTINEL-x.x.x-Setup.exe` | NSIS installer with Start Menu shortcuts |
| **Windows** | `sentinel-win-x64.exe` | Portable executable (no install) |
| **Linux** | `sentinel_x.x.x_amd64.deb` | Debian/Ubuntu package with systemd service |
| **Linux** | `SENTINEL-x.x.x-x86_64.AppImage` | Universal Linux package (no install) |
| **Linux** | `sentinel-linux-x64` | Standalone executable |
| **macOS** | `SENTINEL-x.x.x.dmg` | Disk image with app bundle |
| **macOS** | `sentinel-macos-x64` | Standalone executable |

## 🚀 Quick Install

### Windows (Installer)

```powershell
# Download and run the installer
SENTINEL-1.0.0-Setup.exe

# Or portable version (no install)
./sentinel-win-x64.exe
```

### Linux (Debian/Ubuntu)

```bash
# Install .deb package
sudo dpkg -i sentinel_1.0.0_amd64.deb
sudo apt-get install -f  # Fix any dependency issues

# Start the service
sudo systemctl start sentinel
sudo systemctl enable sentinel

# Or use AppImage (no install needed)
chmod +x SENTINEL-1.0.0-x86_64.AppImage
./SENTINEL-1.0.0-x86_64.AppImage
```

### macOS

```bash
# Mount DMG and drag to Applications
open SENTINEL-1.0.0.dmg

# Or run standalone
./sentinel-macos-x64
```

## 🏗️ Building from Source

### Prerequisites

- Node.js 18+ and npm
- (Optional) NSIS for Windows installer
- (Optional) dpkg-deb for Debian packages
- (Optional) create-dmg or hdiutil for macOS DMG

### Build Steps

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build all platform executables
npm run build:all

# Build specific platform
npm run build:linux    # Linux executable
npm run build:win      # Windows executable
npm run build:macos    # macOS executable

# Build installers
npm run build:deb       # Debian package
npm run build:win-setup # Windows installer
npm run build:dmg       # macOS disk image
npm run build:appimage  # Linux AppImage
```

### Output Location

All built packages are placed in the `dist/` directory.

## 🔄 Automated Releases

SENTINEL uses GitHub Actions to automatically build and publish releases.

### Creating a Release

1. **Update version** in `package.json`
2. **Commit changes**:
   ```bash
   git add package.json
   git commit -m "Bump version to 1.0.1"
   ```
3. **Create and push a tag**:
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```
4. **GitHub Actions automatically**:
   - Runs tests
   - Builds for all platforms
   - Creates a release
   - Uploads all packages

### Manual Release

If you need to create a release manually:

```bash
# Full release process
npm run release

# Or step by step:
npm test
npm run build:all
npm run build:deb
npm run build:win-setup
npm run build:dmg
npm run build:appimage
```

## 📝 Release Checklist

Before creating a new release:

- [ ] All tests passing (`npm test`)
- [ ] Version bumped in `package.json`
- [ ] CHANGELOG.md updated
- [ ] Documentation updated
- [ ] Git tag created (`git tag v1.0.1`)
- [ ] Tag pushed to GitHub (`git push origin v1.0.1`)
- [ ] GitHub Actions completed successfully
- [ ] Release notes reviewed

## 🔧 Platform-Specific Notes

### Windows

- Installer requires Windows 10/11 x64
- Creates Start Menu shortcuts
- Adds to PATH environment variable
- Creates uninstaller entry in Control Panel

### Linux

- .deb package tested on Ubuntu 20.04+, Debian 11+
- Requires systemd for service management
- AppImage works on most distributions with FUSE
- Creates `sentinel` user for service isolation

### macOS

- Requires macOS 10.14 (Mojave) or later
- Notarized for Gate compatibility (future)
- Creates app bundle in Applications folder

## 🔐 Security

All release binaries are:
- Built from tagged commits via GitHub Actions
- Deterministic builds (same source = same binary)
- Checksums provided in release notes
- No embedded secrets or credentials

## 🐛 Troubleshooting

### Windows: "Windows protected your PC"

Click "More info" → "Run anyway". This appears because the executable isn't signed with a commercial certificate.

### Linux: "Cannot open shared object file"

Use the .deb package or AppImage instead of the standalone executable for better dependency handling.

### macOS: "App is damaged"

Run: `xattr -cr /Applications/SENTINEL.app`

Or for standalone: `xattr -c ./sentinel-macos-x64`

## 📊 Download Statistics

Release download counts are available on the [GitHub Releases](https://github.com/matthewvaishnav/sentinel/releases) page.

## 💡 Contributing

To improve the build system:

1. Test changes locally with `npm run build:all`
2. Update this documentation
3. Submit a PR with build improvements

## 🔗 Links

- [Latest Release](https://github.com/matthewvaishnav/sentinel/releases/latest)
- [All Releases](https://github.com/matthewvaishnav/sentinel/releases)
- [GitHub Actions](https://github.com/matthewvaishnav/sentinel/actions)
