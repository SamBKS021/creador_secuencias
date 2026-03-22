use std::collections::HashMap;

use reqwest::Url;
use semver::Version;
use serde::Deserialize;
use tauri::AppHandle;

use crate::drive_auth::access_token_from_refresh;
use crate::drive_client::load_update_notice_manifest;
use crate::errors::{AppError, AppResult};
use crate::models::{AppUpdateStatus, OperationResult, UpdateNoticeManifest};
use crate::workspace::{ensure_managed_workspace_config, save_config};

fn updater_runtime_config() -> Option<(String, String)> {
    let endpoint = option_env!("APP_UPDATE_ENDPOINT")
        .unwrap_or_default()
        .trim()
        .to_string();
    let public_key = option_env!("TAURI_UPDATER_PUBLIC_KEY")
        .unwrap_or_default()
        .trim()
        .to_string();

    if endpoint.is_empty() || public_key.is_empty() {
        return None;
    }

    Some((endpoint, public_key))
}

fn split_release_notes(value: &str) -> Vec<String> {
    value
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(|line| line.trim_start_matches("- ").trim_start_matches("* ").to_string())
        .collect()
}

#[derive(Debug, Deserialize)]
struct RemotePlatformAsset {
    url: String,
    #[allow(dead_code)]
    signature: String,
}

#[derive(Debug, Deserialize)]
struct RemoteReleaseManifest {
    version: String,
    #[serde(default)]
    notes: String,
    #[serde(default, alias = "pub_date")]
    pub_date: String,
    platforms: HashMap<String, RemotePlatformAsset>,
}

fn current_update_target() -> String {
    let os = match std::env::consts::OS {
        "windows" => "windows",
        "macos" => "darwin",
        "linux" => "linux",
        other => other,
    };

    let arch = match std::env::consts::ARCH {
        "x86_64" => "x86_64",
        "aarch64" => "aarch64",
        "x86" => "i686",
        other => other,
    };

    format!("{os}-{arch}")
}

fn load_drive_notice(app: &AppHandle) -> Option<UpdateNoticeManifest> {
    let access_token = access_token_from_refresh(app).ok()?;
    load_update_notice_manifest(&access_token).ok().flatten()
}

pub fn get_app_version(app: &AppHandle) -> String {
    app.package_info().version.to_string()
}

pub fn get_update_notice_manifest(app: &AppHandle) -> AppResult<Option<UpdateNoticeManifest>> {
    Ok(load_drive_notice(app))
}

pub fn dismiss_app_update(app: &AppHandle, version: &str) -> AppResult<OperationResult> {
    let mut config = ensure_managed_workspace_config(app)?;
    config.dismissed_update_version = version.trim().to_string();
    save_config(app, &config)?;
    Ok(OperationResult { ok: true })
}

pub async fn check_app_update(app: &AppHandle) -> AppResult<AppUpdateStatus> {
    let current_version = get_app_version(app);
    let dismissed_version = ensure_managed_workspace_config(app)?.dismissed_update_version;

    let Some((endpoint, public_key)) = updater_runtime_config() else {
        return Ok(AppUpdateStatus {
            configured: false,
            current_version,
            dismissed_version,
            ..AppUpdateStatus::default()
        });
    };

    let _ = public_key;
    let endpoint = Url::parse(&endpoint).map_err(|error| AppError::from(error.to_string().as_str()))?;

    let remote = reqwest::Client::new()
        .get(endpoint)
        .send()
        .await
        .map_err(|error| AppError::from(error.to_string().as_str()))?
        .error_for_status()
        .map_err(|error| AppError::from(error.to_string().as_str()))?
        .json::<RemoteReleaseManifest>()
        .await
        .map_err(|error| AppError::from(error.to_string().as_str()))?;

    let current = Version::parse(&current_version).unwrap_or_else(|_| Version::new(0, 0, 0));
    let latest = Version::parse(&remote.version).map_err(|error| AppError::from(error.to_string().as_str()))?;
    let target = current_update_target();

    let Some(platform) = remote.platforms.get(&target) else {
        return Ok(AppUpdateStatus {
            configured: true,
            current_version,
            dismissed_version,
            source: "github".into(),
            ..AppUpdateStatus::default()
        });
    };

    if latest <= current {
        return Ok(AppUpdateStatus {
            configured: true,
            current_version,
            dismissed_version,
            source: "github".into(),
            ..AppUpdateStatus::default()
        });
    }

    let latest_version = latest.to_string();
    let mut title = "Actualización disponible".to_string();
    let mut release_notes = split_release_notes(&remote.notes);
    let mut source = "github".to_string();

    if let Some(manifest) = load_drive_notice(app) {
        if manifest.visible && manifest.version == latest_version {
            if !manifest.title.trim().is_empty() {
                title = manifest.title;
            }

            if !manifest.notes.is_empty() {
                release_notes = manifest.notes;
            }

            source = "github+drive".into();
        }
    }

    Ok(AppUpdateStatus {
        configured: true,
        available: true,
        current_version,
        latest_version,
        title,
        release_notes,
        pub_date: remote.pub_date,
        download_url: platform.url.clone(),
        source,
        dismissed_version,
        ..AppUpdateStatus::default()
    })
}

pub async fn install_app_update(_app: AppHandle) -> AppResult<OperationResult> {
    let Some((_endpoint, _public_key)) = updater_runtime_config() else {
        return Err(AppError::from(
            "El updater no está configurado en este build. Falta APP_UPDATE_ENDPOINT o TAURI_UPDATER_PUBLIC_KEY.",
        ));
    };

    Err(AppError::from(
        "La instalación automática del update todavía no está habilitada en este instalador. Primero validaremos el primer release publicado en GitHub.",
    ))
}
