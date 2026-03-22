use reqwest::blocking::{Client, multipart};
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use serde::Deserialize;
use serde_json::json;

use crate::errors::{AppError, AppResult};
use crate::models::{ManifestRecord, OAuthLocalConfig};
use crate::sync_manifest::{remote_file_name_for_logical_key, REMOTE_MANIFEST_NAME};

const DRIVE_FILES_ENDPOINT: &str = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_ENDPOINT: &str = "https://www.googleapis.com/upload/drive/v3/files";

#[derive(Debug, Deserialize)]
struct FileListResponse {
    #[serde(default)]
    files: Vec<DriveFile>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DriveFile {
    pub id: String,
    #[serde(default)]
    pub name: String,
}

fn http_client() -> AppResult<Client> {
    Client::builder()
        .build()
        .map_err(|error| AppError::from(error.to_string().as_str()))
}

fn bearer(access_token: &str) -> String {
    format!("Bearer {access_token}")
}

pub fn load_remote_manifest(access_token: &str) -> AppResult<(String, ManifestRecord)> {
    let Some(file) = find_file_by_name(access_token, REMOTE_MANIFEST_NAME)? else {
        return Ok((String::new(), ManifestRecord::default()));
    };

    let bytes = download_file_bytes(access_token, &file.id)?;
    let manifest = serde_json::from_slice::<ManifestRecord>(&bytes)?;
    Ok((file.id, manifest))
}

pub fn save_remote_manifest(access_token: &str, file_id: Option<&str>, manifest: &ManifestRecord) -> AppResult<String> {
    let body = serde_json::to_vec_pretty(manifest)?;
    upsert_json_file(access_token, file_id, REMOTE_MANIFEST_NAME, &body)
}

pub fn upload_logical_file(access_token: &str, logical_key: &str, existing_file_id: Option<&str>, bytes: &[u8]) -> AppResult<String> {
    let remote_name = remote_file_name_for_logical_key(logical_key);
    upsert_json_file(access_token, existing_file_id, &remote_name, bytes)
}

pub fn download_logical_file(access_token: &str, file_id: &str) -> AppResult<Vec<u8>> {
    download_file_bytes(access_token, file_id)
}

pub fn delete_remote_file(access_token: &str, file_id: &str) -> AppResult<()> {
    let client = http_client()?;
    client
        .delete(format!("{DRIVE_FILES_ENDPOINT}/{file_id}"))
        .header(AUTHORIZATION, bearer(access_token))
        .send()
        .map_err(|error| AppError::from(error.to_string().as_str()))?
        .error_for_status()
        .map_err(|error| AppError::from(error.to_string().as_str()))?;

    Ok(())
}

pub fn fetch_account_email(access_token: &str) -> AppResult<String> {
    #[derive(Deserialize)]
    struct UserInfo {
        #[serde(default)]
        email: String,
    }

    let client = http_client()?;
    let user = client
        .get("https://www.googleapis.com/oauth2/v2/userinfo")
        .header(AUTHORIZATION, bearer(access_token))
        .send()
        .map_err(|error| AppError::from(error.to_string().as_str()))?
        .error_for_status()
        .map_err(|error| AppError::from(error.to_string().as_str()))?
        .json::<UserInfo>()
        .map_err(|error| AppError::from(error.to_string().as_str()))?;

    Ok(user.email)
}

pub fn list_sync_files(access_token: &str) -> AppResult<Vec<DriveFile>> {
    let client = http_client()?;
    let response = client
        .get(DRIVE_FILES_ENDPOINT)
        .query(&[
            ("spaces", "appDataFolder"),
            ("fields", "files(id,name)"),
        ])
        .header(AUTHORIZATION, bearer(access_token))
        .send()
        .map_err(|error| AppError::from(error.to_string().as_str()))?
        .error_for_status()
        .map_err(|error| AppError::from(error.to_string().as_str()))?
        .json::<FileListResponse>()
        .map_err(|error| AppError::from(error.to_string().as_str()))?;

    Ok(response.files)
}

pub fn oauth_client_from_local(config: &OAuthLocalConfig) -> Option<(String, String)> {
    if config.client_id.is_empty() || config.client_secret.is_empty() {
        return None;
    }

    Some((config.client_id.clone(), config.client_secret.clone()))
}

fn find_file_by_name(access_token: &str, name: &str) -> AppResult<Option<DriveFile>> {
    let client = http_client()?;
    let escaped_name = name.replace('\'', "\\'");
    let query = format!("name = '{escaped_name}' and trashed = false");
    let response = client
        .get(DRIVE_FILES_ENDPOINT)
        .query(&[
            ("q", query.as_str()),
            ("spaces", "appDataFolder"),
            ("fields", "files(id,name)"),
            ("pageSize", "1"),
        ])
        .header(AUTHORIZATION, bearer(access_token))
        .send()
        .map_err(|error| AppError::from(error.to_string().as_str()))?
        .error_for_status()
        .map_err(|error| AppError::from(error.to_string().as_str()))?
        .json::<FileListResponse>()
        .map_err(|error| AppError::from(error.to_string().as_str()))?;

    Ok(response.files.into_iter().next())
}

fn upsert_json_file(access_token: &str, file_id: Option<&str>, remote_name: &str, bytes: &[u8]) -> AppResult<String> {
    let client = http_client()?;
    let metadata = if file_id.is_some() {
        json!({ "name": remote_name })
    } else {
        json!({ "name": remote_name, "parents": ["appDataFolder"] })
    };

    let form = multipart::Form::new()
        .part(
            "metadata",
            multipart::Part::bytes(serde_json::to_vec(&metadata)?).mime_str("application/json").map_err(|error| AppError::from(error.to_string().as_str()))?,
        )
        .part(
            "media",
            multipart::Part::bytes(bytes.to_vec()).mime_str("application/json").map_err(|error| AppError::from(error.to_string().as_str()))?,
        );

    let request = if let Some(file_id) = file_id {
        client.patch(format!("{DRIVE_UPLOAD_ENDPOINT}/{file_id}?uploadType=multipart"))
    } else {
        client.post(format!("{DRIVE_UPLOAD_ENDPOINT}?uploadType=multipart"))
    };

    let response = request
        .header(AUTHORIZATION, bearer(access_token))
        .multipart(form)
        .send()
        .map_err(|error| AppError::from(error.to_string().as_str()))?
        .error_for_status()
        .map_err(|error| AppError::from(error.to_string().as_str()))?
        .json::<DriveFile>()
        .map_err(|error| AppError::from(error.to_string().as_str()))?;

    Ok(response.id)
}

fn download_file_bytes(access_token: &str, file_id: &str) -> AppResult<Vec<u8>> {
    let client = http_client()?;
    let bytes = client
        .get(format!("{DRIVE_FILES_ENDPOINT}/{file_id}?alt=media"))
        .header(AUTHORIZATION, bearer(access_token))
        .header(CONTENT_TYPE, "application/json")
        .send()
        .map_err(|error| AppError::from(error.to_string().as_str()))?
        .error_for_status()
        .map_err(|error| AppError::from(error.to_string().as_str()))?
        .bytes()
        .map_err(|error| AppError::from(error.to_string().as_str()))?;

    Ok(bytes.to_vec())
}
