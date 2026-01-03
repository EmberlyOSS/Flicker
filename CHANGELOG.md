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
- **Theme System** - 15 built-in themes with Stranger Things as default
  - Stranger Things (default) - Red neon with cyan accents
  - Emberly Classic - Purple gradient theme
  - Cyberpunk Neon
  - Ocean Depths
  - Forest Twilight
  - Sunset Glow
  - Midnight Purple
  - Arctic Frost
  - Rose Gold
  - Dracula
  - Tokyo Night
  - Nord
  - Rose Pine
  - Catppuccin Mocha
  - Ocean Deep
- **Logo Component** - Reusable Emberly flame logo with customizable colors
- **Enhanced Splash Screen** - Polished loading experience
  - Rotating fun facts, tips, and easter eggs (50+ messages)
  - Multi-phase loading sequence with smooth progress animations
  - Spinning logo animation with glowing rings
  - Shimmer effect on progress bar
  - Animated background particles
  - Stranger Things and meme references
- **Enhanced Headers** - Improved desktop and mobile navigation
  - Upload count badge with quick access to history
  - User avatar and name display when signed in
  - Welcome message and sign-in prompt for guests
  - Version badge in mobile header
- **System Tray** - Minimize to system tray for background operation
- **Upload History** - View recent uploads with thumbnails and pagination
- **Settings Panel** - Comprehensive settings for hotkeys, uploads, and appearance
- **Cross-Platform** - Support for Windows, macOS, and Linux

### Technical
- Built with Tauri 2.0 for secure, lightweight desktop app
- React + TypeScript frontend with Tailwind CSS styling
- Rust backend with multi-threaded upload support
- Local file storage for screenshots with unique naming
- Configuration persistence using localStorage
- HSL-based theme system with automatic hex conversion for UI previews
- Smooth eased animations using requestAnimationFrame

---

## Legend

- **Added** - New features
- **Changed** - Changes to existing functionality
- **Deprecated** - Features marked for removal
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security fixes and improvements

[Unreleased]: https://github.com/EmberlyOSS/Flicker/compare/flicker-v0.1.0...dev
[0.1.0-alpha]: https://github.com/EmberlyOSS/Flicker/releases/tag/flicker-v0.1.0-alpha
