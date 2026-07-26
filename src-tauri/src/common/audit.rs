/// Audit logging system for tracking events, errors, and device information
/// 
/// Provides centralized logging for diagnostic purposes and user support

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use chrono::Utc;

/// Device information snapshot
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub os_name: String,
    pub os_version: String,
    pub architecture: String,
    pub cpu_count: usize,
    pub available_memory_mb: u64,
    pub app_version: String,
    pub timestamp: String,
}

/// Individual audit log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLogEntry {
    #[serde(default = "new_log_id")]
    pub id: String,
    pub timestamp: String,
    pub event_type: String,
    pub message: String,
    pub level: String, // "info", "warning", "error"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub device_info: Option<DeviceInfo>,
}

fn new_log_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

/// Audit log manager (singleton pattern with mutex for thread safety)
static AUDIT_LOG: Mutex<Option<Vec<AuditLogEntry>>> = Mutex::new(None);

/// Get the audit logs directory path
fn get_audit_dir() -> Result<PathBuf, String> {
    let config_dir = crate::common::file::get_screenshots_dir()?
        .parent()
        .map(|p| p.to_path_buf())
        .ok_or("Could not determine config directory")?;

    Ok(config_dir.join("audit"))
}

/// Initialize audit logs from disk
fn init_audit_logs() -> Result<Vec<AuditLogEntry>, String> {
    let audit_dir = get_audit_dir()?;
    let logs_file = audit_dir.join("audit.json");

    if logs_file.exists() {
        let contents = fs::read_to_string(&logs_file)
            .map_err(|e| format!("Failed to read audit logs: {}", e))?;

        if contents.is_empty() {
            return Ok(Vec::new());
        }

        serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse audit logs: {}", e))
    } else {
        // Create directory if it doesn't exist
        fs::create_dir_all(&audit_dir)
            .map_err(|e| format!("Failed to create audit directory: {}", e))?;
        Ok(Vec::new())
    }
}

/// Save audit logs to disk
fn save_audit_logs(logs: &[AuditLogEntry]) -> Result<(), String> {
    let audit_dir = get_audit_dir()?;
    fs::create_dir_all(&audit_dir)
        .map_err(|e| format!("Failed to create audit directory: {}", e))?;

    let logs_file = audit_dir.join("audit.json");
    let json = serde_json::to_string_pretty(logs)
        .map_err(|e| format!("Failed to serialize audit logs: {}", e))?;

    fs::write(&logs_file, json)
        .map_err(|e| format!("Failed to write audit logs: {}", e))?;

    Ok(())
}

/// Get system information for audit logs
pub fn get_device_info() -> DeviceInfo {
    let os_name = std::env::consts::OS.to_string();
    
    #[cfg(target_os = "windows")]
    let os_version = get_windows_version();
    #[cfg(target_os = "macos")]
    let os_version = get_macos_version();
    #[cfg(target_os = "linux")]
    let os_version = get_linux_version();
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    let os_version = "Unknown".to_string();

    let architecture = std::env::consts::ARCH.to_string();
    let cpu_count = num_cpus::get();
    
    let available_memory_mb = get_available_memory_mb();
    let app_version = env!("CARGO_PKG_VERSION").to_string();
    let timestamp = Utc::now().to_rfc3339();

    DeviceInfo {
        os_name,
        os_version,
        architecture,
        cpu_count,
        available_memory_mb,
        app_version,
        timestamp,
    }
}

/// Add an event to the audit log
pub fn log_event(
    event_type: &str,
    message: &str,
    level: &str,
    metadata: Option<serde_json::Value>,
) -> Result<(), String> {
    let mut logs = AUDIT_LOG.lock().unwrap();
    
    // Initialize if needed
    if logs.is_none() {
        *logs = Some(init_audit_logs()?);
    }

    let logs = logs.as_mut().unwrap();
    
    let entry = AuditLogEntry {
        id: new_log_id(),
        timestamp: Utc::now().to_rfc3339(),
        event_type: event_type.to_string(),
        message: message.to_string(),
        level: level.to_string(),
        metadata,
        device_info: None, // Only add on demand to reduce log size
    };

    // Keep only last 1000 entries
    if logs.len() >= 1000 {
        logs.remove(0);
    }

    logs.push(entry);
    save_audit_logs(logs)?;
    Ok(())
}

/// Get audit logs, optionally limited to last N entries
pub fn get_audit_logs(limit: Option<usize>) -> Result<Vec<AuditLogEntry>, String> {
    let mut logs = AUDIT_LOG.lock().unwrap();

    // Initialize if needed
    if logs.is_none() {
        *logs = Some(init_audit_logs()?);
    }

    let logs = logs.as_ref().unwrap();
    
    let result: Vec<AuditLogEntry> = if let Some(n) = limit {
        logs.iter()
            .rev()
            .take(n)
            .cloned()
            .collect::<Vec<_>>()
            .into_iter()
            .rev()
            .collect()
    } else {
        logs.clone()
    };

    Ok(result)
}

/// Get audit logs with device info for support export
pub fn get_audit_logs_with_device_info(limit: Option<usize>) -> Result<Vec<AuditLogEntry>, String> {
    let device_info = get_device_info();
    let mut logs = get_audit_logs(limit)?;

    // Add device info to the last entry (most recent)
    if let Some(last) = logs.last_mut() {
        last.device_info = Some(device_info);
    }

    Ok(logs)
}

/// Clear all audit logs
pub fn clear_audit_logs() -> Result<(), String> {
    let audit_dir = get_audit_dir()?;
    let logs_file = audit_dir.join("audit.json");

    if logs_file.exists() {
        fs::remove_file(&logs_file)
            .map_err(|e| format!("Failed to delete audit logs: {}", e))?;
    }

    let mut logs = AUDIT_LOG.lock().unwrap();
    *logs = Some(Vec::new());

    Ok(())
}

/// Export audit logs as JSON string for user sharing
pub fn export_audit_logs() -> Result<String, String> {
    let device_info = get_device_info();
    let logs = get_audit_logs(None)?;

    let export = serde_json::json!({
        "exported_at": Utc::now().to_rfc3339(),
        "device_info": device_info,
        "log_entries": logs,
    });

    serde_json::to_string_pretty(&export)
        .map_err(|e| format!("Failed to serialize export: {}", e))
}

// Platform-specific version detection helpers

#[cfg(target_os = "windows")]
fn get_windows_version() -> String {
    use winapi::um::winnt::OSVERSIONINFOEXW;
    use std::mem;
    
    unsafe {
        let mut info: OSVERSIONINFOEXW = mem::zeroed();
        info.dwOSVersionInfoSize = mem::size_of::<OSVERSIONINFOEXW>() as u32;
        
        // Try using RtlGetVersion
        let ntdll = libloading::Library::new("ntdll.dll").ok();
        if let Some(lib) = ntdll {
            type RtlGetVersionFn = unsafe extern "system" fn(*mut OSVERSIONINFOEXW) -> i32;
            if let Ok(rtl_get_version) = lib.get::<*mut RtlGetVersionFn>(b"RtlGetVersion") {
                let f = std::mem::transmute::<*mut RtlGetVersionFn, RtlGetVersionFn>(*rtl_get_version);
                let _ = f(&mut info);
            }
        }
        
        // Fallback to simple string
        format!(
            "Windows {}.{}",
            info.dwMajorVersion, info.dwMinorVersion
        )
    }
}

#[cfg(not(target_os = "windows"))]
fn get_windows_version() -> String {
    "Unknown".to_string()
}

#[cfg(target_os = "macos")]
#[allow(dead_code)]
fn get_macos_version() -> String {
    // On macOS, we can use system_profiler or sw_vers
    std::process::Command::new("sw_vers")
        .arg("-productVersion")
        .output()
        .ok()
        .and_then(|output| String::from_utf8(output.stdout).ok())
        .map(|v| v.trim().to_string())
        .unwrap_or_else(|| "Unknown".to_string())
}

#[cfg(not(target_os = "macos"))]
#[allow(dead_code)]
fn get_macos_version() -> String {
    "Unknown".to_string()
}

#[cfg(target_os = "linux")]
#[allow(dead_code)]
fn get_linux_version() -> String {
    // Try to read /etc/os-release
    if let Ok(contents) = fs::read_to_string("/etc/os-release") {
        for line in contents.lines() {
            if line.starts_with("PRETTY_NAME=") {
                return line.replace("PRETTY_NAME=", "").trim_matches('"').to_string();
            }
        }
    }
    
    // Fallback to uname
    std::process::Command::new("uname")
        .arg("-r")
        .output()
        .ok()
        .and_then(|output| String::from_utf8(output.stdout).ok())
        .map(|v| v.trim().to_string())
        .unwrap_or_else(|| "Unknown".to_string())
}

#[cfg(not(target_os = "linux"))]
#[allow(dead_code)]
fn get_linux_version() -> String {
    "Unknown".to_string()
}

/// Get available memory in MB
fn get_available_memory_mb() -> u64 {
    #[cfg(target_os = "windows")]
    {
        use winapi::um::sysinfoapi::GetPhysicallyInstalledSystemMemory;
        unsafe {
            let mut memory: u64 = 0;
            if GetPhysicallyInstalledSystemMemory(&mut memory) != 0 {
                return memory / 1024; // Convert from KB to MB
            }
        }
        0
    }

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        Command::new("sysctl")
            .arg("-n")
            .arg("hw.memsize")
            .output()
            .ok()
            .and_then(|output| {
                String::from_utf8(output.stdout)
                    .ok()
                    .and_then(|s| s.trim().parse::<u64>().ok())
            })
            .map(|bytes| bytes / (1024 * 1024))
            .unwrap_or(0)
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(contents) = fs::read_to_string("/proc/meminfo") {
            for line in contents.lines() {
                if line.starts_with("MemTotal:") {
                    if let Some(size_str) = line.split_whitespace().nth(1) {
                        if let Ok(kb) = size_str.parse::<u64>() {
                            return kb / 1024; // Convert from KB to MB
                        }
                    }
                }
            }
        }
        0
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_device_info() {
        let info = get_device_info();
        assert!(!info.os_name.is_empty());
        assert!(!info.architecture.is_empty());
        assert!(info.cpu_count > 0);
    }

    #[test]
    fn test_log_event() {
        let result = log_event("test", "test message", "info", None);
        assert!(result.is_ok());
    }

    #[test]
    fn test_get_audit_logs() {
        let result = get_audit_logs(Some(10));
        assert!(result.is_ok());
    }
}
