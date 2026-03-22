use reqwest::Url;
use tauri::{AppHandle, Emitter};
use tauri_plugin_updater::UpdaterExt;

use crate::drive_auth::access_token_from_refresh;
use crate::drive_client::load_update_notice_manifest;
use crate::errors::{AppError, AppResult};
use crate::models::{AppUpdateStatus, OperationResult, UpdateInstallProgress, UpdateNoticeManifest};
use crate::workspace::{ensure_managed_workspace_config, save_config};

const UPDATE_PROGRESS_EVENT: &str = "app-update-progress";

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

    let endpoint = Url::parse(&endpoint).map_err(|error| AppError::from(error.to_string().as_str()))?;
    let updater = app
        .updater_builder()
        .pubkey(public_key)
        .endpoints(vec![endpoint])
        .map_err(|error| AppError::from(error.to_string().as_str()))?
        .build()
        .map_err(|error| AppError::from(error.to_string().as_str()))?;

    let Some(update) = updater
        .check()
        .await
        .map_err(|error| AppError::from(error.to_string().as_str()))?
    else {
        return Ok(AppUpdateStatus {
            configured: true,
            current_version,
            dismissed_version,
            ..AppUpdateStatus::default()
        });
    };

    let latest_version = update.version.to_string();
    let mut title = "Actualización disponible".to_string();
    let mut release_notes = split_release_notes(update.body.as_deref().unwrap_or_default());
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
        pub_date: update.date.map(|value| value.to_string()).unwrap_or_default(),
        download_url: update.download_url.to_string(),
        source,
        dismissed_version,
        ..AppUpdateStatus::default()
    })
}

pub async fn install_app_update(app: AppHandle) -> AppResult<OperationResult> {
    let Some((endpoint, public_key)) = updater_runtime_config() else {
        return Err(AppError::from(
            "El updater no está configurado en este build. Falta APP_UPDATE_ENDPOINT o TAURI_UPDATER_PUBLIC_KEY.",
        ));
    };

    let endpoint = Url::parse(&endpoint).map_err(|error| AppError::from(error.to_string().as_str()))?;
    let updater = app
        .updater_builder()
        .pubkey(public_key)
        .endpoints(vec![endpoint])
        .map_err(|error| AppError::from(error.to_string().as_str()))?
        .build()
        .map_err(|error| AppError::from(error.to_string().as_str()))?;

    let Some(update) = updater
        .check()
        .await
        .map_err(|error| AppError::from(error.to_string().as_str()))?
    else {
        return Err(AppError::from("No hay una actualización disponible para instalar."));
    };

    let _ = app.emit(
        UPDATE_PROGRESS_EVENT,
        UpdateInstallProgress {
            stage: "starting".into(),
            downloaded: 0,
            total: 0,
            percent: 0.0,
            detail: "Preparando la descarga de la actualización...".into(),
        },
    );

    let mut downloaded = 0u64;
    let app_handle = app.clone();
    update
        .download_and_install(
            move |chunk_length: usize, content_length: Option<u64>| {
                downloaded = downloaded.saturating_add(chunk_length as u64);
                let total = content_length.unwrap_or_default();
                let percent = if total > 0 {
                    (downloaded as f32 / total as f32) * 100.0
                } else {
                    0.0
                };

                let _ = app_handle.emit(
                    UPDATE_PROGRESS_EVENT,
                    UpdateInstallProgress {
                        stage: "downloading".into(),
                        downloaded,
                        total,
                        percent,
                        detail: if total > 0 {
                            format!("Descargando actualización... {:.0}%", percent)
                        } else {
                            "Descargando actualización...".into()
                        },
                    },
                );
            },
            {
                let app_handle = app.clone();
                move || {
                    let _ = app_handle.emit(
                        UPDATE_PROGRESS_EVENT,
                        UpdateInstallProgress {
                            stage: "installing".into(),
                            downloaded: 0,
                            total: 0,
                            percent: 100.0,
                            detail: "Instalando actualización...".into(),
                        },
                    );
                }
            },
        )
        .await
        .map_err(|error| AppError::from(error.to_string().as_str()))?;

    let _ = app.emit(
        UPDATE_PROGRESS_EVENT,
        UpdateInstallProgress {
            stage: "restarting".into(),
            downloaded: 0,
            total: 0,
            percent: 100.0,
            detail: "Reiniciando la aplicación...".into(),
        },
    );

    app.restart();
}
