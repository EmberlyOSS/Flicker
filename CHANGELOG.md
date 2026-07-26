# Changelog

All notable changes to Flicker are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Planned
- Region screenshot capture with selection UI
- Custom theme creation
- Multiple monitor support improvements

---

## [0.2.0-beta] - 2026-07-26

### Added
- Real drag-and-drop uploads. File drops are now read through Tauri's native
  webview drag-drop API instead of being silently discarded.
- Multi-file uploads with a per-file queue showing individual progress, errors,
  and a retry action.
- Live upload progress. The backend now streams uploads from disk instead of
  loading the whole file into memory, and reports byte-level progress to the UI.
- Upload from Clipboard is now fully functional end-to-end (backend command,
  hotkey registration, and Settings field), instead of being a disabled
  placeholder.
- Upload History bulk actions: select multiple items to copy or delete at once.
- Uploads and history copies now respect the existing "post-upload action"
  and "clipboard format" settings (copy/open/none; URL/raw URL/Markdown/HTML),
  which previously had no effect.

- Added `.github/workflows/release.yml`: a GitHub Actions matrix build
  (Windows, macOS arm64/x64, Ubuntu 22.04) that builds and drafts a GitHub
  Release via `tauri-action` on every `flicker-v*` tag.

### Changed
- Refreshed the visual design system to match the current embrly.ca styling:
  added `glass-elevated`, `glass-subtle`, and `glow-primary` utilities, and
  softened the older, heavier glass-card styling.
- The header now shows the current page title and a live connection indicator
  instead of static text.
- Updated Tauri core and plugin versions (crate and npm) to a consistent,
  matching set.

### Fixed
- The release workflow's build matrix ran fully in parallel with no shared
  release step, so `tauri-action` raced to create a release for each job and
  produced duplicate draft releases with a subset of assets each. A dedicated
  `create-release` job now creates (or reuses) a single draft release first,
  and matrix jobs upload into it by id.
- The Windows-only `desktop::windows` module was compiled unconditionally on
  every platform (no `cfg(target_os = "windows")` gate), breaking macOS and
  Linux builds on code that uses `std::os::windows` APIs. Same fix applied to
  the `macos`/`linux` sibling modules for consistency.
- macOS and Linux builds referenced `libc::geteuid()` in the elevation-check
  code without declaring `libc` as a dependency for `cfg(unix)` targets,
  which would have failed to compile on those platforms. Added the missing
  dependency.
- The Windows MSI bundler rejected the app version because its pre-release
  identifier ("-beta") wasn't numeric-only, blocking `tauri build` entirely.
  The version fields that feed packaging (`tauri.conf.json`, `Cargo.toml`,
  `package.json`) are now plain numeric semver; the "beta" label only appears
  in the in-app display version and release documentation.
- Audit log entries had no unique `id` from the backend, causing a React "missing
  key" warning in the Activity Logs panel; the backend now generates one per entry.
- Drag-and-drop appeared to work but never actually uploaded the dropped file.
- A broken Tauri capability permission entry could block the app from building.
- A config bug where the default appearance settings didn't satisfy their own
  type, and an invalid `.catch()` on a non-Promise notification call.
- README accuracy: removed fabricated theme names, incorrect hotkey defaults,
  and out-of-date build commands.

### Removed
- Dead code: an unused modal Settings component superseded by the tabbed
  Settings page, and a broken, unused notification context/toast pair.

---

## [0.1.0-alpha] - 2026-01-02

### Added
- **Screenshot Capture** - Fullscreen screenshot capture with global hotkey support
- **Auto Upload** - Automatically upload screenshots to Emberly after capture
- **Desktop Notifications** - Toast notifications on successful upload and errors
- **Preview Popup** - Screenshot preview in bottom-right corner with image thumbnail
- **Auto-Copy URL** - Upload URLs automatically copied to clipboard
- **Global Hotkeys** - System-wide keyboard shortcuts for quick access
  - `Ctrl+Shift+S` - Fullscreen screenshot
  - `Ctrl+Shift+A` - All monitors screenshot
  - Region screenshot (not yet implemented)
  - Upload from clipboard (not yet implemented; shipped in 0.2.0-beta)
- **User Authentication** - Sign in with Emberly account or manual token entry
- **2FA Support** - Two-factor authentication (TOTP) support
- **Visibility Control** - Set default upload visibility (Public/Private)
- **Password Protection** - Optional password protection for uploads
- **Theme System** - 15 built-in themes with Stranger Things as default
  - Stranger Things (default) - Red neon with cyan accents
  - Emberly Classic - Midnight blue theme
  - Dracula
  - Tokyo Night
  - Nord
  - Rose Pine
  - Catppuccin Mocha
  - Cyberpunk Neon
  - Vaporwave
  - Dark Matrix
  - Aurora Borealis
  - Sunset
  - Ocean Deep
  - Christmas
  - Pride
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
- **In-App Notification Center** - Bell icon with unread count, categorized notifications
- **Audit Logging System** - Track app events with filtering and export
- **Device Info Panel** - System diagnostics for support
- **Refactored App Architecture** - Context-based state management
- **Synchronous Theme Loading** - No more flash of unstyled content

### Technical
- Built with Tauri 2.0 for secure, lightweight desktop app
- React + TypeScript frontend with Tailwind CSS styling
- Rust backend with multi-threaded upload support
- Local file storage for screenshots with unique naming
- Configuration persistence using localStorage
- HSL-based theme system with automatic hex conversion for UI previews
- Smooth eased animations using requestAnimationFrame

## Changed
- Settings moved from modal to dedicated page with tabs
- Improved component organization with layout/pages/overlays structure

---

## Legend

- **Added** - New features
- **Changed** - Changes to existing functionality
- **Deprecated** - Features marked for removal
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security fixes and improvements

[Unreleased]: https://github.com/EmberlyOSS/Flicker/compare/flicker-v0.2.0-beta...dev
[0.2.0-beta]: https://github.com/EmberlyOSS/Flicker/compare/flicker-v0.1.0-alpha...flicker-v0.2.0-beta
[0.1.0-alpha]: https://github.com/EmberlyOSS/Flicker/releases/tag/flicker-v0.1.0-alpha
