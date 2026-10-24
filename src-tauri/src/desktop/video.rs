use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Instant;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt as _;

use crate::common::{get_recordings_dir, generate_recording_filename, UploadCompleteEvent};

#[cfg(all(feature = "desktop", target_os = "macos"))]
async fn start_scap_mp4_recording(
    _output_path: std::path::PathBuf,
    _region: Option<VideoRegion>,
    _include_system_audio: bool,
    _include_mic: bool,
    _show_clicks: bool,
    _fps: u32,
) -> Result<tokio::task::JoinHandle<()>, String> {

    Err("scap mp4 system-audio path not yet enabled — using screencapture fallback".to_string())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoRegion {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoRecordOptions {
    pub region: Option<VideoRegion>,
    pub include_audio: Option<bool>,
    pub include_system_audio: Option<bool>,
    pub include_mic: Option<bool>,
    pub show_clicks: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoRecordingStatus {
    pub is_recording: bool,
    pub elapsed_seconds: u64,
    pub path: Option<String>,
    pub has_audio: bool,
    pub is_region: bool,
}

pub struct ActiveRecording {
    pub pid: Option<u32>,
    pub output_path: PathBuf,
    pub start_time: Instant,
    pub has_audio: bool,
    pub show_clicks: bool,
    pub is_region: bool,
    #[cfg(all(feature = "desktop", target_os = "macos"))]
    pub scap_handle: Option<tokio::task::JoinHandle<()>>,
}

static RECORDING_SESSION: Mutex<Option<ActiveRecording>> = Mutex::new(None);

pub fn is_recording() -> bool {
    RECORDING_SESSION.lock().map(|guard| guard.is_some()).unwrap_or(false)
}

pub fn get_recording_status() -> VideoRecordingStatus {
    if let Ok(guard) = RECORDING_SESSION.lock() {
        if let Some(ref session) = *guard {
            return VideoRecordingStatus {
                is_recording: true,
                elapsed_seconds: session.start_time.elapsed().as_secs(),
                path: Some(session.output_path.to_string_lossy().to_string()),
                has_audio: session.has_audio,
                is_region: session.is_region,
            };
        }
    }
    VideoRecordingStatus {
        is_recording: false,
        elapsed_seconds: 0,
        path: None,
        has_audio: false,
        is_region: false,
    }
}

pub async fn start_video_recording(
    app: &AppHandle,
    options: Option<VideoRecordOptions>,
) -> Result<VideoRecordingStatus, String> {
    crate::flog!("start_video_recording invoked options={:?}", options);

    {
        let guard = RECORDING_SESSION.lock().map_err(|e| e.to_string())?;
        if guard.is_some() {
            crate::flog_err!("start_video_recording blocked: already recording");
            return Err("A video recording is already in progress.".to_string());
        }
    }

    #[cfg(target_os = "macos")]
    {

        if !crate::desktop::macos::has_screen_recording_permission() {
            let _ = crate::desktop::macos::request_screen_recording_permission();
            if !crate::desktop::macos::has_screen_recording_permission() {
                crate::desktop::macos::open_screen_recording_settings();
                return Err("Screen Recording permission is required. Please enable Flicker in System Settings -> Privacy & Security -> Screen Recording.".to_string());
            }
        }

        let dir = get_recordings_dir()?;
        let filename = generate_recording_filename();
        let output_path = dir.join(&filename);

        let config = crate::common::load_config().unwrap_or_default();
        let opts = options.unwrap_or(VideoRecordOptions {
            region: None,
            include_audio: Some(config.video.include_system_audio),
            include_system_audio: Some(config.video.include_system_audio),
            include_mic: Some(config.video.include_mic),
            show_clicks: Some(config.video.show_clicks),
        });

        let has_system_audio = opts.include_system_audio.or(opts.include_audio).unwrap_or(config.video.include_system_audio);
        let has_mic = opts.include_mic.unwrap_or(config.video.include_mic);

        let has_audio = has_system_audio || has_mic;
        let show_clicks = opts.show_clicks.unwrap_or(config.video.show_clicks);
        let is_region = opts.region.is_some();

        let _scap_handle_opt: Option<tokio::task::JoinHandle<()>> = None;
        let child = if has_system_audio {
            crate::desktop::app::send_os_notification(&app, "System Audio", "System audio capture via native ScreenCaptureKit is in beta — falling back to video without system audio for now. Mic will still be captured if enabled.");
            let mut cmd = std::process::Command::new("screencapture");
            cmd.arg("-v");
            if has_mic { cmd.arg("-g"); }
            if show_clicks { cmd.arg("-k"); }
            if let Some(ref r) = opts.region {
                cmd.arg(format!("-R{},{},{},{}", r.x, r.y, r.width, r.height));
            }
            cmd.arg(&output_path);
            cmd.spawn().map_err(|e| format!("Failed to spawn screencapture: {}", e))?
        } else {
            let mut cmd = std::process::Command::new("screencapture");
            cmd.arg("-v");
            if has_mic { cmd.arg("-g"); }
            if show_clicks { cmd.arg("-k"); }
            if let Some(ref r) = opts.region {
                cmd.arg(format!("-R{},{},{},{}", r.x, r.y, r.width, r.height));
            }
            cmd.arg(&output_path);
            cmd.spawn().map_err(|e| format!("Failed to spawn screencapture: {}", e))?
        };
        let pid = child.id();

        let session = ActiveRecording {
            pid: Some(pid),
            output_path: output_path.clone(),
            start_time: Instant::now(),
            has_audio,
            show_clicks,
            is_region,
            #[cfg(all(feature = "desktop", target_os = "macos"))]
            scap_handle: None,
        };

        {
            let mut guard = RECORDING_SESSION.lock().map_err(|e| e.to_string())?;
            *guard = Some(session);
        }

        let max_duration = config.video.max_duration_secs as u64;
        let app_clone = app.clone();
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_secs(max_duration)).await;
            if is_recording() {
                crate::desktop::app::send_os_notification(&app_clone, "Recording Limit Reached", "10 minute limit reached — stopping and uploading…");
                let _ = stop_video_recording(&app_clone, Some(true)).await;
            }
        });

        let status = VideoRecordingStatus {
            is_recording: true,
            elapsed_seconds: 0,
            path: Some(output_path.to_string_lossy().to_string()),
            has_audio,
            is_region,
        };

        let _ = app.emit("video_recording_started", &status);
        if let Some(main) = app.get_webview_window("main") {
            let _ = main.emit("video_recording_started", &status);
        }

        let hotkey_hint = if !config.hotkeys.record_video.trim().is_empty() {
            format!(" Press {} to stop.", config.hotkeys.record_video)
        } else {
            " Click tray or app to stop.".to_string()
        };

        crate::desktop::app::send_os_notification(&app, "🔴 Video Recording Started", &format!("Recording screen.{}", hotkey_hint));

        Ok(status)
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("Native video recording is currently implemented for macOS.".to_string())
    }
}

pub async fn stop_video_recording(
    app: &AppHandle,
    auto_upload: Option<bool>,
) -> Result<Option<UploadCompleteEvent>, String> {
    crate::flog!("stop_video_recording invoked auto_upload={:?}", auto_upload);
    let session = {
        let mut guard = RECORDING_SESSION.lock().map_err(|e| e.to_string())?;
        let s = guard.take().ok_or_else(|| "No active video recording to stop.".to_string());
        if s.is_err() { crate::flog_err!("stop_video_recording: no active session"); }
        s?
    };
    crate::flog!("stopping pid={:?} path={:?}", session.pid, session.output_path);

    #[cfg(target_os = "macos")]
    {

        if let Some(pid) = session.pid {
            #[cfg(unix)]
            unsafe {
                libc::kill(pid as i32, libc::SIGINT);
            }

            let mut terminated = false;
            for _ in 0..100 {
                #[cfg(unix)]
                unsafe {
                    if libc::kill(pid as i32, 0) != 0 {
                        terminated = true;
                        break;
                    }
                }
                tokio::time::sleep(std::time::Duration::from_millis(100)).await;
            }

            if !terminated {
                #[cfg(unix)]
                unsafe {
                    let _ = libc::kill(pid as i32, libc::SIGTERM);
                }
                tokio::time::sleep(std::time::Duration::from_millis(300)).await;
            }
        } else if let Some(handle) = session.scap_handle {

            handle.abort();
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        }

        if !session.output_path.exists() {
            return Err("Recorded video file was not found on disk.".to_string());
        }

        let file_size = match session.output_path.metadata() {
            Ok(m) => m.len(),
            Err(e) => return Err(format!("Failed to read video file metadata: {}", e)),
        };

        if file_size == 0 {
            let _ = std::fs::remove_file(&session.output_path);
            return Err("Video recording failed: output file is 0 bytes.".to_string());
        }

        let duration_seconds = session.start_time.elapsed().as_secs();
        let file_path_str = session.output_path.to_string_lossy().to_string();

        let stop_payload = serde_json::json!({
            "path": file_path_str,
            "duration_seconds": duration_seconds,
            "size": file_size,
        });

        let _ = app.emit("video_recording_stopped", &stop_payload);
        if let Some(main) = app.get_webview_window("main") {
            let _ = main.emit("video_recording_stopped", &stop_payload);
        }

        let config = crate::common::load_config().unwrap_or_default();
        let should_upload = auto_upload.unwrap_or(config.video.auto_upload);

        if should_upload {
            if config.upload_token.trim().is_empty() {
                crate::desktop::app::send_os_notification(&app, "Video Saved Locally", "Sign in to Emberly to enable automatic video uploads.");
                return Ok(None);
            }

            crate::desktop::app::send_os_notification(&app, "⏹ Recording Stopped", "Uploading video to Emberly...");

            let api_url = config
                .upload_url
                .clone()
                .unwrap_or_else(|| "https://embrly.ca".to_string());

            crate::flog!("video upload: starting {} ({} bytes) to {} visibility={}", file_path_str, file_size, api_url, config.visibility);
            let upload_resp = crate::common::upload_file(
                file_path_str.clone(),
                api_url,
                config.upload_token.clone(),
                config.visibility.clone(),
                None,
                None,
                None,
            )
            .await
            .map_err(|e| {
                crate::flog_err!("video upload failed: {}", e);
                e
            })?;
            crate::flog!("video upload success: url={} id={:?}", upload_resp.url, upload_resp.id);

            let event = crate::common::create_upload_event(upload_resp, Some(file_path_str));

            let _ = app.clipboard().write_text(event.url.clone());

            crate::desktop::app::send_os_notification(&app, "Video Upload Complete", "URL copied to clipboard");

            let _ = crate::common::add_to_history(crate::common::UploadHistoryItem {
                url: event.url.clone(),
                name: event.name.clone(),
                timestamp: chrono::Utc::now().timestamp_millis() as u64,
                file_type: "video/mp4".to_string(),
                size: Some(event.size),
                thumbnail_url: None,
            });

            let _ = app.emit("upload_complete", &event);
            if let Some(main) = app.get_webview_window("main") {
                let _ = main.emit("upload_complete", &event);
            }

            Ok(Some(event))
        } else {
            crate::desktop::app::send_os_notification(&app, "Video Saved", &format!("Saved to {}", session.output_path.display()));
            Ok(None)
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("Native video recording is currently implemented for macOS.".to_string())
    }
}

pub async fn cancel_video_recording(app: &AppHandle) -> Result<(), String> {
    let session = {
        let mut guard = RECORDING_SESSION.lock().map_err(|e| e.to_string())?;
        guard.take().ok_or_else(|| "No active video recording to cancel.".to_string())?
    };

    #[cfg(target_os = "macos")]
    {
        if let Some(pid) = session.pid {
            #[cfg(unix)]
            unsafe {
                libc::kill(pid as i32, libc::SIGINT);
            }

            for _ in 0..30 {
                #[cfg(unix)]
                unsafe {
                    if libc::kill(pid as i32, 0) != 0 {
                        break;
                    }
                }
                tokio::time::sleep(std::time::Duration::from_millis(100)).await;
            }
        } else if let Some(handle) = session.scap_handle {
            handle.abort();
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        }

        if session.output_path.exists() {
            let _ = std::fs::remove_file(&session.output_path);
        }

        let _ = app.emit("video_recording_canceled", serde_json::json!({}));
        if let Some(main) = app.get_webview_window("main") {
            let _ = main.emit("video_recording_canceled", serde_json::json!({}));
        }

        crate::desktop::app::send_os_notification(&app, "Recording Cancelled", "The video recording was discarded.");

        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("Native video recording is currently implemented for macOS.".to_string())
    }
}

pub async fn toggle_video_recording(app: AppHandle) -> Result<(), String> {
    if is_recording() {
        let _ = stop_video_recording(&app, Some(true)).await?;
    } else {
        let _ = start_video_recording(&app, None).await?;
    }
    Ok(())
}
