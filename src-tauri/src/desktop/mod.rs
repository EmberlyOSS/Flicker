/// Desktop platform module - Windows, macOS, Linux specific code

pub mod screenshot;
pub mod app;
pub mod region;
pub mod hotkeys;

#[cfg(target_os = "windows")]
pub mod windows;
#[cfg(target_os = "macos")]
pub mod macos;
#[cfg(target_os = "linux")]
pub mod linux;
