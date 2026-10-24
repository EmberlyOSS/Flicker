# Changelog

All notable changes to Flicker are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Planned
- Custom theme creation
- Multiple monitor support improvements

---

## [0.4.0] - 2026-10-23

Flicker gets the new Emberly look: an ember-orange theme matching embrly.ca,
a new icon, and a cleaner design throughout. It also captures any region of
any screen and behaves properly as a menu bar app on macOS.

### Added
- **Sign in with your browser**: Flicker shows a short code and opens
  embrly.ca/activate. Approve it there and Flicker gets its own upload key,
  named after this device, which you can revoke from your dashboard at any
  time. Email and password sign-in and pasting an upload token still work.
- **Choose your server at sign-in**: the sign-in screen shows which Emberly
  server you're signing in to, with **Change** to point Flicker at a
  self-hosted one. Flicker checks it's really an Emberly server before
  switching, and browser sign-in, email sign-in and the sign-up link all use
  it.
- **Open Flicker with a shortcut**: Ctrl+Alt+F (Control+Option+F on macOS)
  brings the window back from anywhere, or hides it if it's already in front.
  Change it in Settings → Hotkeys.
- **Choose what closing the window does** in Settings → Preferences → Window:
  keep running in the tray (menu bar on macOS), minimize to the taskbar (Dock
  on macOS), or quit. The first time closing hides Flicker, a notification
  says where it went and how to get it back.
- **Self-hosted servers**: Flicker asks the server what it supports. When
  billing is off it hides plans and perks, and the domain picker only shows
  when the server offers custom domains.
- **Quick actions on the Upload page**: region, screen, all screens,
  clipboard and record, each showing its shortcut, plus your recent uploads.
- **Shorten** copies the short link as soon as it's ready, fills in a link
  you've already copied, and keeps a list of recent short links.
- **Stats** shows uploads over the last 14 days and your recent uploads with
  views and downloads.
- **Reset to defaults** for hotkeys.
- The "Update now" button on update notifications opens Settings → About,
  where the update downloads with progress.
- **Ember theme**, the new default, using the same palette as embrly.ca and
  the docs. Everyone is moved to it once on first launch after updating;
  pick another theme in Settings → Preferences and it sticks.
- **New icon**: the Emberly flame framed by capture corners, on every
  platform. The macOS menu bar gets a monochrome icon that adapts to light
  and dark menu bars.
- **System-wide region capture**: a transparent overlay on every monitor.
  Drag to select an area, or click once to capture the window under the
  cursor. Flicker hides itself first, so it no longer appears in its own
  screenshots.
- **macOS permissions**: Settings shows Screen Recording, Accessibility and
  Login Items status with buttons to grant them, and Flicker nudges you at
  startup if any are missing. It can also start at login.
- **History from your account**: Upload History now loads your latest 100
  files from Emberly, so uploads from the website, ShareX or another device
  show up too, with real image previews for public files. Files you deleted
  on the website disappear from History as well.
- **New sounds**: a warm chime when an upload is ready, a shutter click on
  capture, a pop when copying a link, a soft tone on errors, and gentle
  ticks for saves and notifications. They now actually play during uploads,
  captures and copies (previously only the Settings previews made a sound),
  and each can be turned off and previewed in Settings → Preferences.
- **Activity log and console logs that work**: the Activity log records
  uploads, failures, sign-ins, saved settings, update checks, hotkey problems
  and app errors. Console Logs captures everything from the moment Flicker
  starts, including the core app's output, with copy and clear.
- **Update checking**: Settings → About checks for a newer release, and signed
  updates download and install in place. If the updater can't reach a
  release, Flicker falls back to GitHub and links to the download.
- **Automatic release builds**: publishing a GitHub release builds Flicker
  for Windows, macOS (Apple silicon and Intel) and Linux, signs the updates,
  and attaches the installers and `latest.json` to the release. Pull requests
  are type-checked and compiled on all three platforms.
- Inter is bundled with the app, so the interface no longer depends on
  loading fonts from the internet.

### Changed
- **Redesigned to match embrly.ca**: the sidebar, settings tabs and option
  buttons use the site's quieter style (a filled background with an orange
  icon instead of solid orange blocks), cards and panels use the site's
  surfaces, and the header no longer repeats the page title.
- **Settings**: Save Changes only appears when something on the tab has
  changed, and sits at the bottom right instead of across the whole page.
- **macOS menu bar app**: Flicker has a Dock icon and appears in Cmd+Tab
  while its window is open. When you close the window it moves to the menu
  bar with no Dock icon, and hotkey captures from other apps never pop the
  main window open.
- **Faster, honest start-up screen**: it used to hold you for 8 seconds of
  fake "connecting" steps. It now only checks for updates, opens in about a
  second, and shows a spinning ember ring. When an update installs, it shows
  the real download progress.
- **The whole app redesigned**: every page and settings tab now uses the same
  rows, switches and segmented controls as Preferences. Settings → Capture
  groups screenshots, uploads and recording; Hotkeys lists each shortcut with
  what it does; About puts updates, diagnostics and links on one page; and
  macOS permissions only appear on macOS.
- **History** has a quieter toolbar, and image cards show real previews more
  reliably.
- **Notifications** open as a simple list with actions on hover, and close
  with Esc.
- **Preferences redesigned**: themes show a small preview of the app in
  their colours, and display and sound options are clear rows with switches
  and segmented controls.
- **Upload dialog** uses the new design and retries the preview while the
  image is still processing, instead of showing a false "404".
- Region selection, notifications, toasts and history icons use ember or
  neutral colours instead of indigo, blue and purple. Green, red and amber
  still mean success, error and warning.
- The window is titled "Flicker" instead of "Emberly Uploader".
- New installs default to Inter and larger rounded corners.

### Fixed
- **"Save Local" did nothing**: every capture was kept in
  `Pictures/Flicker Screenshots` forever. The setting is now called **Keep
  local copies**; when it's off, captures are deleted once they've uploaded.
  Settings → Capture shows the folder with an **Open folder** button. Files
  you upload yourself are never deleted.
- **Hotkeys that silently failed**: when another app (or Windows itself)
  already owns a shortcut, the Hotkeys tab now says so under that shortcut,
  and also flags one shortcut assigned to two actions. Previously it just
  didn't work.
- The default video hotkey is now Ctrl+Alt+R on Windows and Linux, since
  Windows 11 reserves Win+Shift+R for the Snipping Tool. macOS keeps
  Cmd+Shift+R.
- **Windows builds**: the app no longer fails to compile on Windows. An
  unused screen-capture library didn't build against its own dependency, and
  macOS-only permission commands weren't limited to macOS.
- **Stats page failed to load** ("invalid type: floating point"): Emberly
  reports storage in megabytes with decimals, which Flicker expected as a
  whole number of bytes. Storage and file sizes now display correctly.
- **Duplicate History entries**: one upload could be added two or three
  times, depending on which part of the app finished first.
- **Missing previews** in History for older links ending in `/`.
- **Profile details went stale**: your name, email and avatar were saved at
  sign-in and never refreshed. Flicker now refreshes them on start-up.
- **Avatar not loading** in Settings → Account: avatar paths from Emberly are
  now resolved against your server, with a fallback icon if one fails.
- **Toggle switches looked like circles**: a touch-screen sizing rule
  applied to every button on desktop. It now only applies on touch devices.
- One shortcut assigned to two actions no longer fires both; the first one
  wins.
- macOS: the Command key is recognised in hotkeys (e.g. Cmd+Shift+S).
- Upload History's filter dropdown is no longer hidden behind the mobile menu
  or clipped.
- Image previews show at their real size, with scrolling for large
  screenshots.
- **Short links pointed to the wrong address**: links made in Flicker now use
  the same `/u/` path as the website.
- The notifications panel opened behind the page, and its buttons did
  nothing.
- **No way back after closing the window**: once closed, Flicker could only
  be reopened from its tray icon. Opening Flicker again from the Start menu,
  Dock, Finder or a desktop shortcut now brings back the copy that's already
  running instead of doing nothing, and the new shortcut works too.
- **Uploads from the Upload page went to embrly.ca** even when you were
  signed in to a self-hosted server. They now go to your server, like
  captures do.
- The README listed the wrong download names, and missed the separate Apple
  silicon and Intel downloads for macOS.

---

## [0.3.0] - 2026-07-26

Flicker moves out of beta. It's stable enough for daily use, but still
**early access** — expect new features and occasional rough edges while the
app and its Emberly integration keep growing.

### Added
- Stats page: replaces the old "Coming Soon" placeholder with real usage
  data pulled from your Emberly account — total files, storage used, short
  URL count and clicks, total views/downloads, domain count, a 14-day
  uploads chart, and a recent-uploads list (sections respect your plan's
  actual limits instead of showing data you don't have access to).
- URL Shortener: a new page to turn a long link into a short one and copy
  it, without leaving the app.
- Custom upload domain: Settings → Capture now has a domain picker sourced
  from your verified Emberly domains, and it's respected by every upload
  path (drag-and-drop, clipboard, hotkey/screenshot capture).
- File management from Upload History: opening a history item now lets you
  toggle its visibility (Public/Private) and set a password directly,
  without needing the website. Deleting a history item now also deletes the
  file from your Emberly account, not just the local list entry.
- Perks display: Settings → Account now shows your active perk bonuses
  (extra storage, extra domains) when you have any active.

### Fixed
- `get_profile`, `validate_token`, and `get_stats` called API endpoints that
  don't exist on the real server (leftover scaffolding with no working UI
  behind it) and always failed. They now call the correct endpoints
  (`/api/profile`, `/api/analytics/summary`) and return real data.
- `delete_file` existed in the Rust API client but was never wired to a
  Tauri command, making it unreachable from the UI. It's now registered and
  used by Upload History's delete action.

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
- Added GitHub issue templates: bug report, feature request, and beta
  testing feedback, plus an issue template chooser linking to Discord for
  general questions. (The README already linked to `bug_report.md`/
  `feature_request.md`; the templates themselves didn't exist until now.)

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
