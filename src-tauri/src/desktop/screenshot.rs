/// Desktop screenshot capture functionality

use crate::common::file;
use crate::common::types::ScreenshotResult;

#[cfg(feature = "desktop")]
use screenshots::Screen;

/// Capture a screenshot of the entire screen or specified monitor
#[cfg(feature = "desktop")]
pub async fn capture_screenshot(monitor_index: Option<usize>) -> Result<ScreenshotResult, String> {
    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;
    
    if screens.is_empty() {
        return Err("No screens found".to_string());
    }
    
    let screen_idx = monitor_index.unwrap_or(0);
    let screen = screens.get(screen_idx)
        .ok_or_else(|| format!("Monitor {} not found", screen_idx))?;
    
    let image = screen.capture()
        .map_err(|e| format!("Failed to capture screen: {}", e))?;
    
    let width = image.width();
    let height = image.height();
    
    // Generate unique filename
    let filename = file::generate_screenshot_filename("screenshot");
    
    let screenshots_dir = file::get_screenshots_dir()?;
    let file_path = screenshots_dir.join(&filename);
    image.save(&file_path)
        .map_err(|e| format!("Failed to save screenshot: {}", e))?;
    
    Ok(ScreenshotResult {
        path: file_path.to_string_lossy().to_string(),
        width,
        height,
    })
}

/// Capture a specific region of the screen on a given monitor
#[cfg(feature = "desktop")]
pub async fn capture_region(
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    monitor_index: Option<usize>,
) -> Result<ScreenshotResult, String> {
    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;
    
    if screens.is_empty() {
        return Err("No screens found".to_string());
    }
    
    let screen_idx = monitor_index.unwrap_or(0);
    let screen = screens.get(screen_idx)
        .ok_or_else(|| format!("Monitor {} not found", screen_idx))?;
    
    let image = screen.capture_area(x, y, width, height)
        .map_err(|e| format!("Failed to capture region: {}", e))?;
    
    let img_width = image.width();
    let img_height = image.height();
    
    let filename = file::generate_screenshot_filename("screenshot");
    
    let screenshots_dir = file::get_screenshots_dir()?;
    let file_path = screenshots_dir.join(&filename);
    image.save(&file_path)
        .map_err(|e| format!("Failed to save screenshot: {}", e))?;
    
    Ok(ScreenshotResult {
        path: file_path.to_string_lossy().to_string(),
        width: img_width,
        height: img_height,
    })
}

/// Capture all monitors combined into a single image
#[cfg(feature = "desktop")]
pub async fn capture_all_monitors() -> Result<ScreenshotResult, String> {
    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;
    
    if screens.is_empty() {
        return Err("No screens found".to_string());
    }
    
    // Calculate the bounding box for all monitors
    let mut min_x = i32::MAX;
    let mut min_y = i32::MAX;
    let mut max_x = i32::MIN;
    let mut max_y = i32::MIN;
    
    for screen in &screens {
        let info = &screen.display_info;
        min_x = min_x.min(info.x);
        min_y = min_y.min(info.y);
        max_x = max_x.max(info.x + info.width as i32);
        max_y = max_y.max(info.y + info.height as i32);
    }
    
    let total_width = (max_x - min_x) as u32;
    let total_height = (max_y - min_y) as u32;
    
    // Create a new image buffer for the combined screenshot
    let mut combined = image::RgbaImage::new(total_width, total_height);
    
    // Capture each screen and composite them
    for screen in &screens {
        let info = &screen.display_info;
        let capture = screen.capture()
            .map_err(|e| format!("Failed to capture screen: {}", e))?;
        
        // Calculate where this screen goes in the combined image
        let offset_x = (info.x - min_x) as u32;
        let offset_y = (info.y - min_y) as u32;
        
        // Copy pixels from the capture to the combined image
        for (x, y, pixel) in capture.enumerate_pixels() {
            let dest_x = offset_x + x;
            let dest_y = offset_y + y;
            if dest_x < total_width && dest_y < total_height {
                combined.put_pixel(dest_x, dest_y, *pixel);
            }
        }
    }
    
    // Generate unique filename
    let filename = file::generate_screenshot_filename("screenshot_all");
    
    let screenshots_dir = file::get_screenshots_dir()?;
    let file_path = screenshots_dir.join(&filename);
    combined.save(&file_path)
        .map_err(|e| format!("Failed to save screenshot: {}", e))?;
    
    Ok(ScreenshotResult {
        path: file_path.to_string_lossy().to_string(),
        width: total_width,
        height: total_height,
    })
}

/// Get list of all available monitors
#[cfg(feature = "desktop")]
pub fn get_monitors() -> Result<Vec<crate::common::types::MonitorInfo>, String> {
    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;
    
    Ok(screens.iter().enumerate().map(|(i, screen)| {
        let info = &screen.display_info;
        crate::common::types::MonitorInfo {
            index: i,
            id: info.id,
            x: info.x,
            y: info.y,
            width: info.width,
            height: info.height,
            is_primary: info.is_primary,
            scale_factor: info.scale_factor as f64,
        }
    }).collect())
}

/// Get the monitor index at a specific screen coordinate
#[cfg(feature = "desktop")]
pub fn get_monitor_at_point(x: i32, y: i32) -> Result<Option<usize>, String> {
    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;
    
    for (i, screen) in screens.iter().enumerate() {
        let info = &screen.display_info;
        let screen_x = info.x;
        let screen_y = info.y;
        let screen_width = info.width as i32;
        let screen_height = info.height as i32;
        
        if x >= screen_x && x < screen_x + screen_width &&
           y >= screen_y && y < screen_y + screen_height {
            return Ok(Some(i));
        }
    }
    
    Ok(None)
}
