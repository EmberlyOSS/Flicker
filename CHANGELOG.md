# Changelog

All notable changes to Flicker are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Region screenshot capture with selection UI
- Upload from clipboard hotkey
- Drag-and-drop file upload
- Upload history with filtering and search
- Custom theme creation
- Multiple monitor support improvements

---

## [0.1.0-alpha] - 2026-01-02

### Added
- **Screenshot Capture** - Fullscreen screenshot capture with global hotkey support
- **Auto Upload** - Automatically upload screenshots to Emberly after capture
- **Desktop Notifications** - Toast notifications on successful upload and errors
- **Preview Popup** - Screenshot preview in bottom-right corner with image thumbnail
- **Auto-Copy URL** - Upload URLs automatically copied to clipboard
- **Global Hotkeys** - System-wide keyboard shortcuts for quick access
  - `Ctrl+Alt+PrintScreen` - Fullscreen screenshot
  - `Ctrl+Shift+PrintScreen` - Region screenshot (coming soon)
  - `Ctrl+Alt+U` - Upload from clipboard (coming soon)
  - `Ctrl+Alt+E` - Open app
- **User Authentication** - Sign in with Emberly account or manual token entry
- **2FA Support** - Two-factor authentication (TOTP) support
- **Visibility Control** - Set default upload visibility (Public/Private)
- **Password Protection** - Optional password protection for uploads
- **Theme System** - Multiple built-in themes
  - Default (dark)
  - Cyberpunk Neon
  - Ocean Depths
  - Forest Twilight
  - Sunset Glow
  - Midnight Purple
  - Arctic Frost
  - Rose Gold
- **System Tray** - Minimize to system tray for background operation
- **Upload History** - View recent uploads with timestamps
- **Settings Panel** - Comprehensive settings for hotkeys, uploads, and appearance
- **Cross-Platform** - Support for Windows, macOS, and Linux

### Technical
- Built with Tauri 2.0 for secure, lightweight desktop app
- React + TypeScript frontend with Tailwind CSS styling
- Rust backend with multi-threaded upload support
- Local file storage for screenshots with unique naming
- Configuration persistence using localStorage

---

## Legend

- **Added** - New features
- **Changed** - Changes to existing functionality
- **Deprecated** - Features marked for removal
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security fixes and improvements

[Unreleased]: https://github.com/EmberlyOSS/Website/compare/flicker-v0.1.0...dev
[0.1.0-alpha]: https://github.com/EmberlyOSS/Website/releases/tag/flicker-v0.1.0-alpha
