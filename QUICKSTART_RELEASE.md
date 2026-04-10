# Quick Start: Create Your First SENTINEL Release

This guide shows you how to create a release that will appear in the GitHub Releases section with full installers for all platforms.

## Prerequisites

1. **GitHub repository is public** (or you have Actions enabled on private)
2. **Git is configured** with your GitHub credentials
3. **All changes are committed** to the main branch

## Step-by-Step Instructions

### Step 1: Verify Everything is Ready

```bash
# Make sure you're on main branch and everything is committed
git checkout main
git status

# Should say: "nothing to commit, working tree clean"
```

### Step 2: Choose a Version Number

SENTINEL follows [Semantic Versioning](https://semver.org/):
- **patch** (1.0.0 → 1.0.1) - Bug fixes
- **minor** (1.0.0 → 1.1.0) - New features, backward compatible
- **major** (1.0.0 → 2.0.0) - Breaking changes

### Step 3: Trigger the Release

**Option A: Use the helper script (easiest)**

```bash
# For a patch release (1.0.0 → 1.0.1)
npm run release:trigger -- patch

# For a minor release (1.0.0 → 1.1.0)
npm run release:trigger -- minor

# For a major release (1.0.0 → 2.0.0)
npm run release:trigger -- major
```

**Option B: Manual commands**

```bash
# Update version in package.json
npm version patch  # or minor, or major

# Push the tag to GitHub (this triggers the release)
git push origin main --follow-tags
```

### Step 4: Watch the Build

1. Go to: `https://github.com/matthewvaishnav/sentinel/actions`
2. You'll see a "Build and Release" workflow running
3. Wait 3-5 minutes for all platforms to build

**What happens:**
- ✅ Tests run first (all 159 must pass)
- ✅ Linux build creates: executable + .deb + AppImage
- ✅ Windows build creates: executable + installer
- ✅ macOS build creates: executable + .dmg
- ✅ All assets uploaded to GitHub Release

### Step 5: Verify the Release

1. Go to: `https://github.com/matthewvaishnav/sentinel/releases`
2. You should see your new release at the top
3. Click on it to see all the downloadable assets

**What you'll see:**
```
SENTINEL v1.0.1
├── sentinel_1.0.1_amd64.deb        (Linux Debian/Ubuntu)
├── SENTINEL-v1.0.1-x86_64.AppImage (Linux universal)
├── sentinel-linux-x64               (Linux standalone)
├── SENTINEL-v1.0.1-Setup.exe        (Windows installer)
├── sentinel-win-x64.exe             (Windows portable)
├── SENTINEL-v1.0.1.dmg              (macOS disk image)
└── sentinel-macos-x64               (macOS standalone)
```

## What Users See

When someone visits your repository, they see:

1. **Releases badge** on README showing latest version
2. **Releases section** with downloadable installers
3. **Release notes** with installation instructions

## Testing the Installers

### Windows

```powershell
# Download SENTINEL-v1.0.1-Setup.exe
# Double-click to install
# Or run portable version:
.\sentinel-win-x64.exe
```

### Linux

```bash
# Download sentinel_1.0.1_amd64.deb
sudo dpkg -i sentinel_1.0.1_amd64.deb
sudo systemctl start sentinel

# Or use AppImage (no install):
chmod +x SENTINEL-v1.0.1-x86_64.AppImage
./SENTINEL-v1.0.1-x86_64.AppImage
```

### macOS

```bash
# Download SENTINEL-v1.0.1.dmg
# Double-click to mount
# Drag SENTINEL.app to Applications
# Or run standalone:
./sentinel-macos-x64
```

## Troubleshooting

### "GitHub Actions not running"

- Check that Actions are enabled: Settings → Actions → General → Allow all actions
- Make sure you pushed a tag starting with 'v' (e.g., `v1.0.1`)

### "Build failed but tests passed"

Some platform-specific tools might not be available:
- **Windows installer** requires NSIS (optional, falls back to just .exe)
- **Linux .deb** requires dpkg-dev (optional)
- **macOS .dmg** requires macOS runner (works on macos-latest)

The core executables always build - fancy packages are optional.

### "Release already exists"

If you see this error, the tag already has a release:
1. Go to GitHub Releases
2. Delete the existing release
3. Delete the tag: `git push --delete origin v1.0.1`
4. Try again

## Next Release

After your first release, making updates is easy:

```bash
# Fix a bug → patch release
npm run release:trigger -- patch

# Add features → minor release
npm run release:trigger -- minor

# Breaking changes → major release
npm run release:trigger -- major
```

## Need Help?

- Check build logs: https://github.com/matthewvaishnav/sentinel/actions
- Read full docs: [RELEASES.md](./RELEASES.md)
- File an issue: https://github.com/matthewvaishnav/sentinel/issues

---

**Ready?** Run this now:
```bash
npm run release:trigger -- patch
```

Then watch your release appear at: https://github.com/matthewvaishnav/sentinel/releases
