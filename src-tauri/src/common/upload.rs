/// File upload functionality for the Emberly API
/// 
/// Uses the EmberlyCient from emberly_api module for all HTTP operations

use crate::common::emberly_api::EmberlyCient;
use crate::common::types::{UploadResponse, UploadCompleteEvent};

/// Upload a file to the Emberly instance
pub async fn upload_file(
    file_path: String,
    api_url: String,
    upload_token: String,
    visibility: String,
    password: Option<String>,
    domain: Option<String>,
    on_progress: Option<Box<dyn Fn(u64, u64) + Send + Sync>>,
) -> Result<UploadResponse, String> {
    // Validate inputs
    validate_api_url(&api_url)?;
    validate_upload_token(&upload_token)?;

    // For very large files (>400MB, e.g., long video) use chunked; otherwise single POST like images
    // User asked to "just upload it like you upload the image" — so default to single for typical 10m video (~50-150MB)
    let metadata = tokio::fs::metadata(&file_path)
        .await
        .map_err(|e| format!("Failed to read file metadata: {}", e))?;
    let total_size = metadata.len();
    const CHUNK_THRESHOLD: u64 = 400 * 1024 * 1024;

    // Need to handle on_progress move: take it for chunked, fallback to None for single if chunked was tried
    let mut on_progress_opt = on_progress;
    if total_size > CHUNK_THRESHOLD {
        println!("[Flicker] upload_file: {} bytes > threshold, using chunked", total_size);
        let res = upload_file_chunked(
            file_path.clone(),
            api_url.clone(),
            upload_token.clone(),
            visibility.clone(),
            password.clone(),
            domain.clone(),
            on_progress_opt,
        )
        .await;
        match res {
            Ok(r) => return Ok(r),
            Err(e) => {
                eprintln!("[Flicker] chunked failed ({}), falling back to single POST", e);
                // fall through to single attempt with no progress
                on_progress_opt = None;
            }
        }
    } else {
        println!("[Flicker] upload_file: {} bytes single POST to {}", total_size, api_url);
    }

    // Create API client and upload (single part)
    let client = EmberlyCient::new(api_url);
    let api_response = client
        .upload_file(&upload_token, &file_path, &visibility, password, domain, on_progress_opt)
        .await?;

    // Convert API response to our UploadResponse type
    Ok(UploadResponse {
        id: api_response.id,
        url: api_response.url,
        name: api_response.name,
        size: api_response.size,
        file_type: api_response.file_type,
    })
}

async fn upload_file_chunked(
    file_path: String,
    api_url: String,
    upload_token: String,
    visibility: String,
    _password: Option<String>,
    domain: Option<String>,
    on_progress: Option<Box<dyn Fn(u64, u64) + Send + Sync>>,
) -> Result<UploadResponse, String> {
    let client = EmberlyCient::new(api_url);
    let file_name = std::path::Path::new(&file_path)
        .file_name()
        .ok_or("Invalid file path")?
        .to_string_lossy()
        .to_string();
    let mime_type = mime_guess::from_path(&file_path)
        .first_raw()
        .unwrap_or("application/octet-stream")
        .to_string();
    let total_size = tokio::fs::metadata(&file_path)
        .await
        .map_err(|e| e.to_string())?
        .len();

    // 1. Init
    let (upload_id, part_size) = client
        .init_chunked_upload(&upload_token, &file_name, &mime_type, total_size, domain.clone())
        .await?;

    // 2. Upload parts
    let mut parts = Vec::new();
    let mut offset: u64 = 0;
    let mut part_number: u32 = 1;
    let mut uploaded: u64 = 0;

    // Open file for reading
    let mut file = tokio::fs::File::open(&file_path)
        .await
        .map_err(|e| e.to_string())?;
    use tokio::io::AsyncReadExt;

    while offset < total_size {
        let chunk_size = std::cmp::min(part_size, total_size - offset) as usize;
        let mut buffer = vec![0u8; chunk_size];
        file.read_exact(&mut buffer).await.map_err(|e| e.to_string())?;

        let presigned_url = client
            .get_chunk_url(&upload_token, &upload_id, part_number)
            .await?;

        // PUT to S3
        let resp = reqwest::Client::new()
            .put(&presigned_url)
            .header("Content-Type", mime_type.clone())
            .body(buffer)
            .send()
            .await
            .map_err(|e| format!("Chunk {} PUT failed: {}", part_number, e))?;

        if !resp.status().is_success() {
            return Err(format!(
                "Chunk {} upload failed {}: {}",
                part_number,
                resp.status(),
                resp.text().await.unwrap_or_default()
            ));
        }
        let etag = resp
            .headers()
            .get("ETag")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
            .to_string();
        // Ensure ETag is quoted as S3 expects
        let etag = if etag.starts_with('"') {
            etag
        } else {
            format!("\"{}\"", etag.trim_matches('"'))
        };

        parts.push(serde_json::json!({ "PartNumber": part_number, "ETag": etag }));
        offset += chunk_size as u64;
        uploaded += chunk_size as u64;
        if let Some(cb) = &on_progress {
            cb(uploaded, total_size);
        }
        part_number += 1;
    }

    // 3. Complete
    let api_resp = client
        .complete_chunked_upload(&upload_token, &upload_id, parts, None)
        .await?;

    // Chunked uploads are PUBLIC by default — patch visibility/password if needed
    if visibility != "PUBLIC" || _password.is_some() {
        let _ = client
            .update_file(
                &upload_token,
                api_resp.id.as_deref().unwrap_or(""),
                if visibility != "PUBLIC" { Some(visibility.clone()) } else { None },
                _password.clone(),
            )
            .await;
    }

    Ok(crate::common::types::UploadResponse {
        id: api_resp.id,
        url: api_resp.url,
        name: api_resp.name,
        size: api_resp.size,
        file_type: api_resp.file_type,
    })
}

/// Create an upload complete event from an upload response
pub fn create_upload_event(
    response: UploadResponse,
    screenshot_path: Option<String>,
) -> UploadCompleteEvent {
    UploadCompleteEvent {
        id: response.id,
        url: response.url,
        name: response.name,
        size: response.size,
        file_type: response.file_type,
        screenshot_path,
    }
}

/// Validate API URL format
pub fn validate_api_url(url: &str) -> Result<(), String> {
    if url.is_empty() {
        return Err("API URL cannot be empty".to_string());
    }
    
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("API URL must start with http:// or https://".to_string());
    }
    
    Ok(())
}

/// Validate upload token
pub fn validate_upload_token(token: &str) -> Result<(), String> {
    if token.is_empty() {
        return Err("Upload token cannot be empty".to_string());
    }
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_api_url() {
        assert!(validate_api_url("https://example.com").is_ok());
        assert!(validate_api_url("http://example.com").is_ok());
        assert!(validate_api_url("example.com").is_err());
        assert!(validate_api_url("").is_err());
    }

    #[test]
    fn test_validate_upload_token() {
        assert!(validate_upload_token("token123").is_ok());
        assert!(validate_upload_token("").is_err());
    }
}
