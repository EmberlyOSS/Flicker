/// Emberly API client module
/// 
/// Provides a clean, reusable interface for interacting with the Emberly API
/// Handles authentication, file uploads, and user operations

use serde::{Deserialize, Serialize};

/// Emberly API client configuration
#[derive(Clone)]
pub struct EmberlyCient {
    base_url: String,
    client: reqwest::Client,
}

/// Login request payload
#[derive(Debug, Serialize)]
pub struct LoginRequest {
    #[serde(rename = "emailOrUsername")]
    pub email_or_username: String,
    pub password: String,
    #[serde(rename = "twoFactorCode", skip_serializing_if = "Option::is_none")]
    pub two_factor_code: Option<String>,
}

/// Login response from API
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct LoginResponse {
    pub success: bool,
    pub user: Option<LoginUser>,
    pub error: Option<String>,
    #[serde(rename = "requires2FA")]
    pub requires_2fa: Option<bool>,
}

/// User information returned from login
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct LoginUser {
    pub id: String,
    pub name: Option<String>,
    pub email: String,
    #[serde(rename = "uploadToken")]
    pub upload_token: String,
    pub image: Option<String>,
    #[serde(rename = "urlId")]
    pub url_id: String,
}

/// User profile information
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct UserProfile {
    pub id: String,
    pub name: Option<String>,
    pub email: String,
    pub image: Option<String>,
    #[serde(rename = "urlId")]
    pub url_id: String,
    #[serde(rename = "uploadToken")]
    pub upload_token: String,
}

/// File upload response
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct UploadResponse {
    pub url: String,
    pub name: String,
    pub size: u64,
    #[serde(rename = "type")]
    pub file_type: String,
}

/// API error response
#[derive(Debug, Deserialize)]
pub struct ApiError {
    pub success: bool,
    pub error: Option<String>,
    pub message: Option<String>,
}

impl EmberlyCient {
    /// Create a new Emberly API client
    pub fn new(base_url: String) -> Self {
        Self {
            base_url,
            client: reqwest::Client::new(),
        }
    }

    /// Create a new client with the default Emberly URL
    pub fn default_client() -> Self {
        Self::new("https://embrly.ca".to_string())
    }

    /// Login to Emberly with email/username and password
    pub async fn login(
        &self,
        email_or_username: String,
        password: String,
        two_factor_code: Option<String>,
    ) -> Result<LoginResponse, String> {
        let url = format!("{}/api/auth/desktop", self.base_url);

        let request = LoginRequest {
            email_or_username,
            password,
            two_factor_code,
        };

        let response = self
            .client
            .post(&url)
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("Login request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!(
                "Login failed with status {}: {}",
                response.status(),
                response.text().await.unwrap_or_default()
            ));
        }

        response
            .json::<LoginResponse>()
            .await
            .map_err(|e| format!("Failed to parse login response: {}", e))
    }

    /// Get user profile information
    pub async fn get_profile(&self, token: &str) -> Result<UserProfile, String> {
        let url = format!("{}/api/users/profile", self.base_url);

        let response = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", token))
            .send()
            .await
            .map_err(|e| format!("Profile request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!(
                "Failed to get profile with status {}: {}",
                response.status(),
                response.text().await.unwrap_or_default()
            ));
        }

        response
            .json::<UserProfile>()
            .await
            .map_err(|e| format!("Failed to parse profile response: {}", e))
    }

    /// Validate an upload token
    pub async fn validate_token(&self, token: &str) -> Result<bool, String> {
        let url = format!("{}/api/auth/validate", self.base_url);

        let response = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", token))
            .send()
            .await
            .map_err(|e| format!("Token validation failed: {}", e))?;

        Ok(response.status().is_success())
    }

    /// Upload a file to Emberly, optionally reporting progress as bytes are
    /// streamed from disk to the request body (called as `(uploaded, total)`).
    pub async fn upload_file(
        &self,
        token: &str,
        file_path: &str,
        visibility: &str,
        password: Option<String>,
        on_progress: Option<Box<dyn Fn(u64, u64) + Send + Sync>>,
    ) -> Result<UploadResponse, String> {
        use futures_util::StreamExt;

        let url = format!("{}/api/files", self.base_url);

        let file = tokio::fs::File::open(file_path)
            .await
            .map_err(|e| format!("Failed to open file: {}", e))?;
        let total_len = file
            .metadata()
            .await
            .map_err(|e| format!("Failed to read file metadata: {}", e))?
            .len();

        let file_name = std::path::Path::new(file_path)
            .file_name()
            .ok_or("Invalid file path")?
            .to_string_lossy()
            .to_string();

        let mime_type = mime_guess::from_path(file_path)
            .first_raw()
            .unwrap_or("application/octet-stream")
            .to_string();

        // Stream the file so we can report upload progress as chunks are read,
        // instead of loading the whole file into memory up front.
        let uploaded = std::sync::Arc::new(std::sync::atomic::AtomicU64::new(0));
        let stream = tokio_util::io::ReaderStream::new(file).map(move |chunk| {
            if let Ok(bytes) = &chunk {
                let so_far = uploaded.fetch_add(bytes.len() as u64, std::sync::atomic::Ordering::Relaxed)
                    + bytes.len() as u64;
                if let Some(cb) = &on_progress {
                    cb(so_far, total_len);
                }
            }
            chunk
        });

        let body = reqwest::Body::wrap_stream(stream);
        let part = reqwest::multipart::Part::stream_with_length(body, total_len)
            .file_name(file_name)
            .mime_str(&mime_type)
            .map_err(|e| e.to_string())?;

        // Create multipart form
        let mut form = reqwest::multipart::Form::new()
            .part("file", part)
            .text("visibility", visibility.to_string());

        if let Some(pwd) = password {
            form = form.text("password", pwd);
        }

        let response = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", token))
            .multipart(form)
            .send()
            .await
            .map_err(|e| format!("Upload request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!(
                "Upload failed with status {}: {}",
                response.status(),
                response.text().await.unwrap_or_default()
            ));
        }

        let body: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        let data = body
            .get("data")
            .ok_or("Missing 'data' in response")?;

        serde_json::from_value(data.clone())
            .map_err(|e| format!("Failed to parse upload response: {}", e))
    }

    /// Delete a file from Emberly
    pub async fn delete_file(&self, token: &str, file_id: &str) -> Result<(), String> {
        let url = format!("{}/api/files/{}", self.base_url, file_id);

        let response = self
            .client
            .delete(&url)
            .header("Authorization", format!("Bearer {}", token))
            .send()
            .await
            .map_err(|e| format!("Delete request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!(
                "Delete failed with status {}: {}",
                response.status(),
                response.text().await.unwrap_or_default()
            ));
        }

        Ok(())
    }

    /// Get list of user's files
    pub async fn list_files(&self, token: &str) -> Result<Vec<UploadResponse>, String> {
        let url = format!("{}/api/files", self.base_url);

        let response = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", token))
            .send()
            .await
            .map_err(|e| format!("List files request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!(
                "Failed to list files with status {}: {}",
                response.status(),
                response.text().await.unwrap_or_default()
            ));
        }

        let body: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        let data = body.get("data").ok_or("Missing 'data' in response")?;

        serde_json::from_value(data.clone())
            .map_err(|e| format!("Failed to parse files list: {}", e))
    }

    /// Get user statistics
    pub async fn get_stats(&self, token: &str) -> Result<serde_json::Value, String> {
        let url = format!("{}/api/stats", self.base_url);

        let response = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", token))
            .send()
            .await
            .map_err(|e| format!("Stats request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!(
                "Failed to get stats with status {}: {}",
                response.status(),
                response.text().await.unwrap_or_default()
            ));
        }

        response
            .json::<serde_json::Value>()
            .await
            .map_err(|e| format!("Failed to parse stats response: {}", e))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_client_creation() {
        let client = EmberlyCient::default_client();
        assert_eq!(client.base_url, "https://embrly.ca");
    }

    #[test]
    fn test_custom_url() {
        let client = EmberlyCient::new("https://custom.example.com".to_string());
        assert_eq!(client.base_url, "https://custom.example.com");
    }
}
