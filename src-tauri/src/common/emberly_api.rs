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

/// User profile information (subset of `GET /api/profile`'s response —
/// that endpoint also returns embedded `files`/`shortenedUrls` arrays we
/// don't need here and intentionally leave untyped so serde ignores them).
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct UserProfile {
    pub id: String,
    pub name: Option<String>,
    pub email: String,
    pub image: Option<String>,
    #[serde(rename = "urlId")]
    pub url_id: String,
}

/// Envelope used by endpoints that wrap their payload as `{ success, data }`
/// (e.g. `/api/profile`, `/api/urls`).
#[derive(Debug, Deserialize)]
struct DataEnvelope<T> {
    data: T,
}

/// File upload response
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct UploadResponse {
    /// The uploaded file's database id. Optional for resilience against
    /// older server versions or transitional deploys — always present on a
    /// current server.
    pub id: Option<String>,
    pub url: String,
    pub name: String,
    pub size: u64,
    #[serde(rename = "type")]
    pub file_type: String,
}

/// A single custom domain (`GET /api/domains`)
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct DomainInfo {
    pub id: String,
    pub domain: String,
    pub verified: bool,
    #[serde(rename = "isPrimary")]
    pub is_primary: bool,
    #[serde(rename = "cfStatus")]
    pub cf_status: Option<String>,
}

/// Domain slot usage/limits, embedded in the `/api/domains` response
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct DomainLimit {
    pub allowed: Option<u32>,
    pub base: u32,
    pub purchased: u32,
    #[serde(rename = "perkBonus")]
    pub perk_bonus: u32,
    pub used: u32,
    pub remaining: Option<u32>,
    pub unlimited: bool,
}

/// `GET /api/domains` response (returned as a raw object, not wrapped in
/// `{success, data}` — confirmed against the actual route handler).
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct DomainsResponse {
    pub domains: Vec<DomainInfo>,
    #[serde(rename = "domainLimit")]
    pub domain_limit: DomainLimit,
}

/// Perk bonus summary fields (`GET /api/profile/perks`)
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct PerkBonuses {
    pub storage: Option<String>,
    pub domains: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct PerksSummary {
    #[serde(rename = "activePerks")]
    pub active_perks: u32,
    #[serde(rename = "totalPerks")]
    pub total_perks: u32,
    pub bonuses: PerkBonuses,
}

/// `GET /api/profile/perks` response (raw object, not `{success, data}`).
/// Individual perk entries vary in shape by perk type, so they're left as
/// loosely-typed JSON values — only the summary is rendered in Settings.
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct PerksResponse {
    pub perks: Vec<serde_json::Value>,
    pub summary: PerksSummary,
}

/// A shortened URL (`POST`/`GET /api/urls`)
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ShortenedUrlResponse {
    pub id: String,
    #[serde(rename = "shortCode")]
    pub short_code: String,
    #[serde(rename = "targetUrl")]
    pub target_url: String,
    pub clicks: u32,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

/// Basic usage aggregates embedded in `/api/analytics/summary`
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct AnalyticsBasic {
    #[serde(rename = "totalFiles")]
    pub total_files: u64,
    #[serde(rename = "storageUsed")]
    pub storage_used: u64,
    #[serde(rename = "totalUrls")]
    pub total_urls: u64,
    #[serde(rename = "totalUrlClicks")]
    pub total_url_clicks: u64,
    #[serde(rename = "totalViews")]
    pub total_views: u64,
    #[serde(rename = "totalDownloads")]
    pub total_downloads: u64,
    #[serde(rename = "domainsCount")]
    pub domains_count: u64,
    #[serde(rename = "verifiedDomains")]
    pub verified_domains: u64,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct AnalyticsAllowed {
    #[serde(rename = "topFiles")]
    pub top_files: bool,
    #[serde(rename = "topUrls")]
    pub top_urls: bool,
    #[serde(rename = "recentUploads")]
    pub recent_uploads: bool,
    #[serde(rename = "detailedList")]
    pub detailed_list: bool,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct RecentUpload {
    pub id: String,
    pub name: String,
    pub size: u64,
    #[serde(rename = "uploadedAt")]
    pub uploaded_at: String,
    pub views: u64,
    pub downloads: u64,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct UploadsPerDay {
    pub date: String,
    pub count: u64,
}

/// `GET /api/analytics/summary` response (raw object, not `{success, data}`).
/// The server also includes plan-gated extra lists (`topFiles`,
/// `topStorageFiles`, `topUrls`, `files`) that aren't modeled here — serde
/// ignores unknown fields by default, and the Stats page MVP doesn't need them.
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct AnalyticsSummary {
    pub plan: String,
    pub basic: AnalyticsBasic,
    pub allowed: AnalyticsAllowed,
    #[serde(rename = "recentUploads", default)]
    pub recent_uploads: Vec<RecentUpload>,
    #[serde(rename = "uploadsPerDay", default)]
    pub uploads_per_day: Vec<UploadsPerDay>,
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
        let url = format!("{}/api/profile", self.base_url);

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

        let envelope = response
            .json::<DataEnvelope<UserProfile>>()
            .await
            .map_err(|e| format!("Failed to parse profile response: {}", e))?;

        Ok(envelope.data)
    }

    /// Validate an upload token. There's no dedicated validation endpoint on
    /// the server, so this just checks whether the token can successfully
    /// fetch the profile it authenticates.
    pub async fn validate_token(&self, token: &str) -> Result<bool, String> {
        Ok(self.get_profile(token).await.is_ok())
    }

    /// Get the user's custom domains and domain-slot usage
    pub async fn get_domains(&self, token: &str) -> Result<DomainsResponse, String> {
        let url = format!("{}/api/domains", self.base_url);

        let response = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", token))
            .send()
            .await
            .map_err(|e| format!("Domains request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!(
                "Failed to get domains with status {}: {}",
                response.status(),
                response.text().await.unwrap_or_default()
            ));
        }

        response
            .json::<DomainsResponse>()
            .await
            .map_err(|e| format!("Failed to parse domains response: {}", e))
    }

    /// Get the user's active perk bonuses (Discord booster / GitHub contributor)
    pub async fn get_perks(&self, token: &str) -> Result<PerksResponse, String> {
        let url = format!("{}/api/profile/perks", self.base_url);

        let response = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", token))
            .send()
            .await
            .map_err(|e| format!("Perks request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!(
                "Failed to get perks with status {}: {}",
                response.status(),
                response.text().await.unwrap_or_default()
            ));
        }

        response
            .json::<PerksResponse>()
            .await
            .map_err(|e| format!("Failed to parse perks response: {}", e))
    }

    /// Shorten a URL
    pub async fn shorten_url(
        &self,
        token: &str,
        url: &str,
    ) -> Result<ShortenedUrlResponse, String> {
        let endpoint = format!("{}/api/urls", self.base_url);

        let response = self
            .client
            .post(&endpoint)
            .header("Authorization", format!("Bearer {}", token))
            .json(&serde_json::json!({ "url": url }))
            .send()
            .await
            .map_err(|e| format!("Shorten URL request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!(
                "Failed to shorten URL with status {}: {}",
                response.status(),
                response.text().await.unwrap_or_default()
            ));
        }

        let envelope = response
            .json::<DataEnvelope<ShortenedUrlResponse>>()
            .await
            .map_err(|e| format!("Failed to parse shorten response: {}", e))?;

        Ok(envelope.data)
    }

    /// Update a file's visibility and/or password
    pub async fn update_file(
        &self,
        token: &str,
        file_id: &str,
        visibility: Option<String>,
        password: Option<String>,
    ) -> Result<(), String> {
        let url = format!("{}/api/files/{}", self.base_url, file_id);

        let mut body = serde_json::Map::new();
        if let Some(v) = visibility {
            body.insert("visibility".to_string(), serde_json::Value::String(v));
        }
        if let Some(p) = password {
            body.insert("password".to_string(), serde_json::Value::String(p));
        }

        let response = self
            .client
            .patch(&url)
            .header("Authorization", format!("Bearer {}", token))
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Update file request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!(
                "Failed to update file with status {}: {}",
                response.status(),
                response.text().await.unwrap_or_default()
            ));
        }

        Ok(())
    }

    /// Upload a file to Emberly, optionally reporting progress as bytes are
    /// streamed from disk to the request body (called as `(uploaded, total)`).
    pub async fn upload_file(
        &self,
        token: &str,
        file_path: &str,
        visibility: &str,
        password: Option<String>,
        domain: Option<String>,
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
        if let Some(d) = domain {
            form = form.text("domain", d);
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

    /// Chunked upload — initialize session
    pub async fn init_chunked_upload(
        &self,
        token: &str,
        filename: &str,
        mime_type: &str,
        size: u64,
        domain: Option<String>,
    ) -> Result<(String, u64), String> {
        let url = format!("{}/api/files/chunks", self.base_url);
        let mut body = serde_json::json!({
            "filename": filename,
            "mimeType": mime_type,
            "size": size,
        });
        if let Some(d) = domain {
            body["domain"] = serde_json::Value::String(d);
        }
        println!("[Flicker] init_chunked: POST {} body={} token_len={}", url, body, token.len());
        let resp = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", token))
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Init chunked upload failed: {}", e))?;
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        println!("[Flicker] init_chunked resp status={} body={}", status, text);
        if !status.is_success() {
            return Err(format!("Init chunked failed {}: {}", status, text));
        }
        let json: serde_json::Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;
        // Server may wrap in {success, data: {uploadId, partSize}} or return flat
        let data = json.get("data").unwrap_or(&json);
        let upload_id = data
            .get("uploadId")
            .or_else(|| data.get("upload_id"))
            .or_else(|| json.get("uploadId"))
            .or_else(|| json.get("upload_id"))
            .and_then(|v| v.as_str())
            .ok_or_else(|| format!("Missing uploadId in init response: {}", json)) ?
            .to_string();
        let part_size = data
            .get("partSize")
            .or_else(|| data.get("part_size"))
            .or_else(|| json.get("partSize"))
            .or_else(|| json.get("part_size"))
            .and_then(|v| v.as_u64())
            .unwrap_or(5 * 1024 * 1024);
        println!("[Flicker] init_chunked: uploadId={} partSize={} raw={}", upload_id, part_size, json);
        Ok((upload_id, part_size))
    }

    pub async fn get_chunk_url(
        &self,
        token: &str,
        upload_id: &str,
        part_number: u32,
    ) -> Result<String, String> {
        let url = format!(
            "{}/api/files/chunks/{}/part/{}",
            self.base_url, upload_id, part_number
        );
        println!("[Flicker] get_chunk_url: GET {} part={}", url, part_number);
        let resp = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", token))
            .send()
            .await
            .map_err(|e| format!("Get chunk URL failed: {}", e))?;
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        println!("[Flicker] get_chunk_url resp status={} body={}", status, text);
        if !status.is_success() {
            return Err(format!("Get chunk URL failed {}: {}", status, text));
        }
        let json: serde_json::Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;
        let data = json.get("data").unwrap_or(&json);
        data.get("url")
            .or_else(|| json.get("url"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .ok_or_else(|| format!("Missing url in chunk response: {}", json))
    }

    pub async fn complete_chunked_upload(
        &self,
        token: &str,
        upload_id: &str,
        parts: Vec<serde_json::Value>,
        expires_at: Option<String>,
    ) -> Result<UploadResponse, String> {
        let url = format!("{}/api/files/chunks/{}/complete", self.base_url, upload_id);
        let mut body = serde_json::json!({ "parts": parts });
        if let Some(exp) = expires_at {
            body["expiresAt"] = serde_json::Value::String(exp);
        }
        let resp = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", token))
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Complete chunked failed: {}", e))?;
        if !resp.status().is_success() {
            return Err(format!(
                "Complete chunked failed {}: {}",
                resp.status(),
                resp.text().await.unwrap_or_default()
            ));
        }
        let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
        let data = json.get("data").ok_or("Missing data")?;
        serde_json::from_value(data.clone()).map_err(|e| e.to_string())
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

    /// Get user upload/usage statistics
    pub async fn get_stats(&self, token: &str) -> Result<AnalyticsSummary, String> {
        let url = format!("{}/api/analytics/summary", self.base_url);

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
            .json::<AnalyticsSummary>()
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
