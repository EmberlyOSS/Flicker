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

    // Create API client and upload
    let client = EmberlyCient::new(api_url);
    let api_response = client
        .upload_file(&upload_token, &file_path, &visibility, password, domain, on_progress)
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
