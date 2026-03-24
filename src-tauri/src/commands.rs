use std::path::PathBuf;

use tauri::AppHandle;
use tauri::Manager;
use tauri_plugin_dialog::{DialogExt, FilePath};

use crate::drive_auth::{
    connect_google_drive as connect_google_drive_account, disconnect_google_drive as disconnect_google_drive_account,
    get_drive_auth_status as load_drive_auth_status,
};
use crate::errors::AppResult;
use crate::export::{export_sequence_docx as build_docx_export, export_sequence_docx_path};
use crate::importer::{import_docx_batch, normalize_title};
use crate::models::{
    AppUpdateStatus, Draft, DraftResult, ExportCheckResult, ExportResult, ImportBatchResult, OperationResult,
    Preferences, ResolveConflictPayload, Sequence, SequenceExportStatus, SequenceMutationResult, Song,
    SongMutationResult, SongPayload, SupportConfig, SupportRequestPayload, SupportSubmissionResult, SyncResult,
    SyncStatus, UpdateNoticeManifest, WorkspaceConfig, WorkspaceSelection,
};
use crate::repository::{
    append_drafts, bootstrap, delete_sequence as delete_sequence_record, delete_song as delete_song_record,
    export_metadata, load_sequences, load_song_categories, load_songs, resolve_paths, save_song_categories_record,
    upsert_sequence, upsert_song,
};
use crate::support::{
    build_attachment_metadata, get_support_config as load_support_config, send_support_request as dispatch_support_request,
};
use crate::sync::{get_sync_status as load_sync_status, resolve_sync_conflict as run_conflict_resolution, sync_workspace_now as run_sync};
use crate::update::{
    check_app_update as load_app_update, dismiss_app_update as dismiss_pending_app_update,
    get_app_version as load_app_version, get_update_notice_manifest as load_update_notice_manifest,
    install_app_update as run_app_update_install,
};
use crate::workspace::{ensure_managed_workspace_config, ensure_workspace, read_json, save_config};

fn file_path_to_pathbuf(file_path: FilePath) -> Option<PathBuf> {
    file_path.into_path().ok()
}

fn resolve_root_from_config(app: &AppHandle) -> AppResult<String> {
    let config = ensure_managed_workspace_config(app)?;
    Ok(config.workspace_root)
}

fn pick_docx_files(app: &AppHandle) -> Option<Vec<PathBuf>> {
    app.dialog()
        .file()
        .add_filter("Documentos Word", &["docx"])
        .blocking_pick_files()
        .map(|files| files.into_iter().filter_map(file_path_to_pathbuf).collect::<Vec<_>>())
}

fn pick_support_files(app: &AppHandle) -> Option<Vec<PathBuf>> {
    app.dialog()
        .file()
        .add_filter("Adjuntos de soporte", &["png", "jpg", "jpeg", "webp", "gif", "pdf", "docx"])
        .blocking_pick_files()
        .map(|files| files.into_iter().filter_map(file_path_to_pathbuf).collect::<Vec<_>>())
}

#[tauri::command]
pub fn get_workspace_config(app: AppHandle) -> Result<WorkspaceConfig, String> {
    ensure_managed_workspace_config(&app).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_support_config() -> Result<SupportConfig, String> {
    Ok(load_support_config())
}

#[tauri::command]
pub fn pick_support_attachments(app: AppHandle) -> Result<Vec<crate::models::SupportAttachment>, String> {
    let Some(files) = pick_support_files(&app) else {
        return Ok(Vec::new());
    };

    build_attachment_metadata(files).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn send_support_request(payload: SupportRequestPayload) -> Result<SupportSubmissionResult, String> {
    dispatch_support_request(&payload).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn save_song_categories(app: AppHandle, categories: Vec<String>) -> Result<Vec<String>, String> {
    let root = resolve_root_from_config(&app).map_err(|error| error.to_string())?;
    let paths = resolve_paths(&root).map_err(|error| error.to_string())?;
    save_song_categories_record(&paths, &categories).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn save_motion_mode(app: AppHandle, motion_mode: String) -> Result<Preferences, String> {
    let normalized = match motion_mode.trim().to_lowercase().as_str() {
        "reduced" => "reduced",
        "off" => "off",
        _ => "normal",
    }
    .to_string();

    let mut config = ensure_managed_workspace_config(&app).map_err(|error| error.to_string())?;
    config.preferences.motion_mode = normalized;
    save_config(&app, &config).map_err(|error| error.to_string())?;
    Ok(config.preferences)
}

#[tauri::command]
pub fn save_theme_mode(app: AppHandle, theme_mode: String) -> Result<Preferences, String> {
    let normalized = match theme_mode.trim().to_lowercase().as_str() {
        "dark" => "dark",
        "retro" => "retro",
        _ => "light",
    }
    .to_string();

    let mut config = ensure_managed_workspace_config(&app).map_err(|error| error.to_string())?;
    config.preferences.theme_mode = normalized;
    save_config(&app, &config).map_err(|error| error.to_string())?;
    Ok(config.preferences)
}

#[tauri::command]
pub fn select_workspace_root(app: AppHandle) -> Result<WorkspaceSelection, String> {
    let config = ensure_managed_workspace_config(&app).map_err(|error| error.to_string())?;

    Ok(WorkspaceSelection {
        workspace_root: config.workspace_root,
        created_structure: vec![
            "biblioteca".into(),
            "secuencias".into(),
            "recursos".into(),
            ".ccp".into(),
            "exports".into(),
        ],
    })
}

#[tauri::command]
pub fn bootstrap_app(app: AppHandle, workspace_root: String) -> Result<crate::models::BootstrapPayload, String> {
    let root = if workspace_root.is_empty() {
        resolve_root_from_config(&app)
    } else {
        Ok(workspace_root)
    }
    .map_err(|error| error.to_string())?;

    bootstrap(PathBuf::from(root).as_path()).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn open_song_files(app: AppHandle) -> Result<DraftResult, String> {
    let root = resolve_root_from_config(&app).map_err(|error| error.to_string())?;
    let paths = ensure_workspace(PathBuf::from(&root).as_path()).map_err(|error| error.to_string())?;

    let Some(files) = pick_docx_files(&app) else {
        return Ok(DraftResult {
            drafts: read_json(&paths.drafts_file).map_err(|error| error.to_string())?,
        });
    };

    let drafts = files
        .into_iter()
        .map(|path| {
            let source_file_name = path
                .file_name()
                .map(|item| item.to_string_lossy().to_string())
                .unwrap_or_else(|| "archivo.docx".into());
            let suggested_title = source_file_name.trim_end_matches(".docx").replace('_', " ");
            let created_at = crate::workspace::now_iso();

            Draft {
                id: uuid::Uuid::new_v4().to_string(),
                source_file_name: source_file_name.clone(),
                source_path: path.to_string_lossy().to_string(),
                suggested_title: suggested_title.clone(),
                form_data: Song {
                    id: String::new(),
                    title: suggested_title.clone(),
                    title_normalized: normalize_title(&suggested_title),
                    author: String::new(),
                    category: "Contemporanea".into(),
                    key: "C".into(),
                    tempo: 72,
                    lyrics: String::new(),
                    chords: String::new(),
                    tags: Vec::new(),
                    source_file_name,
                    source_path: path.to_string_lossy().to_string(),
                    status: "draft".into(),
                    play_count: 0,
                    created_at: created_at.clone(),
                    updated_at: created_at.clone(),
                },
                created_at,
            }
        })
        .collect::<Vec<_>>();

    let drafts = append_drafts(&paths, drafts).map_err(|error| error.to_string())?;
    Ok(DraftResult { drafts })
}

#[tauri::command]
pub fn import_song_docx_batch(app: AppHandle) -> Result<ImportBatchResult, String> {
    let root = resolve_root_from_config(&app).map_err(|error| error.to_string())?;
    let paths = ensure_workspace(PathBuf::from(&root).as_path()).map_err(|error| error.to_string())?;

    let Some(files) = pick_docx_files(&app) else {
        return Ok(ImportBatchResult {
            documents: Vec::new(),
        });
    };

    if files.iter().any(|path| {
        path.extension()
            .and_then(|extension| extension.to_str())
            .map(|extension| !extension.eq_ignore_ascii_case("docx"))
            .unwrap_or(true)
    }) {
        return Err("Solo se soportan archivos .docx.".into());
    }

    let songs = load_songs(&paths).map_err(|error| error.to_string())?;
    import_docx_batch(&files, &songs).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn save_song(app: AppHandle, payload: SongPayload) -> Result<SongMutationResult, String> {
    let root = resolve_root_from_config(&app).map_err(|error| error.to_string())?;
    let paths = resolve_paths(&root).map_err(|error| error.to_string())?;
    upsert_song(&paths, &payload).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn update_song(app: AppHandle, payload: SongPayload) -> Result<SongMutationResult, String> {
    let root = resolve_root_from_config(&app).map_err(|error| error.to_string())?;
    let paths = resolve_paths(&root).map_err(|error| error.to_string())?;
    upsert_song(&paths, &payload).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn save_sequence(app: AppHandle, payload: Sequence) -> Result<SequenceMutationResult, String> {
    let root = resolve_root_from_config(&app).map_err(|error| error.to_string())?;
    let paths = resolve_paths(&root).map_err(|error| error.to_string())?;
    upsert_sequence(&paths, &payload).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn delete_sequence(app: AppHandle, sequence_id: String) -> Result<OperationResult, String> {
    let root = resolve_root_from_config(&app).map_err(|error| error.to_string())?;
    let paths = resolve_paths(&root).map_err(|error| error.to_string())?;
    delete_sequence_record(&paths, &sequence_id).map_err(|error| error.to_string())?;
    Ok(OperationResult { ok: true })
}

#[tauri::command]
pub fn delete_song(app: AppHandle, song_id: String) -> Result<OperationResult, String> {
    let root = resolve_root_from_config(&app).map_err(|error| error.to_string())?;
    let paths = resolve_paths(&root).map_err(|error| error.to_string())?;
    delete_song_record(&paths, &song_id).map_err(|error| error.to_string())?;
    Ok(OperationResult { ok: true })
}

#[tauri::command]
pub fn check_sequence_docx_export(app: AppHandle, sequence_id: String) -> Result<ExportCheckResult, String> {
    let root = resolve_root_from_config(&app).map_err(|error| error.to_string())?;
    let paths = ensure_workspace(PathBuf::from(&root).as_path()).map_err(|error| error.to_string())?;
    let sequences = load_sequences(&paths).map_err(|error| error.to_string())?;

    let Some(sequence) = sequences.into_iter().find(|item| item.id == sequence_id) else {
        return Err("No se encontro la secuencia a exportar.".into());
    };

    let file_path = export_sequence_docx_path(PathBuf::from(&root).as_path(), &sequence);

    Ok(ExportCheckResult {
        exists: file_path.exists(),
        file_path: file_path.to_string_lossy().to_string(),
        file_name: file_path
            .file_name()
            .map(|item| item.to_string_lossy().to_string())
            .unwrap_or_else(|| "secuencia.docx".into()),
    })
}

#[tauri::command]
pub fn get_sequence_export_statuses(app: AppHandle) -> Result<Vec<SequenceExportStatus>, String> {
    let root = resolve_root_from_config(&app).map_err(|error| error.to_string())?;
    let paths = ensure_workspace(PathBuf::from(&root).as_path()).map_err(|error| error.to_string())?;
    let sequences = load_sequences(&paths).map_err(|error| error.to_string())?;

    Ok(sequences
        .into_iter()
        .map(|sequence| {
            let file_path = export_sequence_docx_path(PathBuf::from(&root).as_path(), &sequence);
            SequenceExportStatus {
                sequence_id: sequence.id,
                exists: file_path.exists(),
                file_path: file_path.to_string_lossy().to_string(),
                file_name: file_path
                    .file_name()
                    .map(|item| item.to_string_lossy().to_string())
                    .unwrap_or_else(|| "secuencia.docx".into()),
            }
        })
        .collect())
}

#[tauri::command]
pub fn open_exported_sequence_docx(app: AppHandle, sequence_id: String) -> Result<OperationResult, String> {
    let root = resolve_root_from_config(&app).map_err(|error| error.to_string())?;
    let paths = ensure_workspace(PathBuf::from(&root).as_path()).map_err(|error| error.to_string())?;
    let sequences = load_sequences(&paths).map_err(|error| error.to_string())?;

    let Some(sequence) = sequences.into_iter().find(|item| item.id == sequence_id) else {
        return Err("No se encontro la secuencia solicitada.".into());
    };

    let file_path = export_sequence_docx_path(PathBuf::from(&root).as_path(), &sequence);
    if !file_path.exists() {
        return Err("Todavia no existe un documento exportado para esta secuencia.".into());
    }

    open::that_detached(file_path).map_err(|error| error.to_string())?;
    Ok(OperationResult { ok: true })
}

#[tauri::command]
pub fn export_sequence_docx(app: AppHandle, sequence_id: String, overwrite: bool) -> Result<ExportResult, String> {
    let root = resolve_root_from_config(&app).map_err(|error| error.to_string())?;
    let paths = ensure_workspace(PathBuf::from(&root).as_path()).map_err(|error| error.to_string())?;
    let songs = load_songs(&paths).map_err(|error| error.to_string())?;
    let sequences = load_sequences(&paths).map_err(|error| error.to_string())?;

    let Some(sequence) = sequences.into_iter().find(|item| item.id == sequence_id) else {
        return Err("No se encontro la secuencia a exportar.".into());
    };

    let target_path = export_sequence_docx_path(PathBuf::from(&root).as_path(), &sequence);
    let already_exists = target_path.exists();
    if already_exists && !overwrite {
        return Err("El archivo de exportacion ya existe.".into());
    }

    let file_path =
        build_docx_export(PathBuf::from(&root).as_path(), &sequence, &songs).map_err(|error| error.to_string())?;
    open::that_detached(&file_path).map_err(|error| error.to_string())?;

    Ok(export_metadata(&file_path, already_exists))
}

#[tauri::command]
pub fn open_exports_folder(app: AppHandle) -> Result<OperationResult, String> {
    let root = resolve_root_from_config(&app).map_err(|error| error.to_string())?;
    let paths = ensure_workspace(PathBuf::from(&root).as_path()).map_err(|error| error.to_string())?;
    open::that_detached(paths.exports_dir).map_err(|error| error.to_string())?;
    Ok(OperationResult { ok: true })
}

#[tauri::command]
pub fn get_song_categories(app: AppHandle) -> Result<Vec<String>, String> {
    let root = resolve_root_from_config(&app).map_err(|error| error.to_string())?;
    let paths = resolve_paths(&root).map_err(|error| error.to_string())?;
    load_song_categories(&paths).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_drive_auth_status(app: AppHandle) -> Result<crate::models::DriveAuthStatus, String> {
    load_drive_auth_status(&app).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn connect_google_drive(app: AppHandle) -> Result<crate::models::DriveAuthStatus, String> {
    connect_google_drive_account(&app).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn disconnect_google_drive(app: AppHandle) -> Result<crate::models::DriveAuthStatus, String> {
    disconnect_google_drive_account(&app).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_sync_status(app: AppHandle) -> Result<SyncStatus, String> {
    load_sync_status(&app).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn sync_workspace_now(app: AppHandle, reason: String, mode: Option<String>) -> Result<SyncResult, String> {
    run_sync(&app, &reason, mode.as_deref().unwrap_or("merge")).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn resolve_sync_conflict(app: AppHandle, payload: ResolveConflictPayload) -> Result<SyncResult, String> {
    run_conflict_resolution(&app, &payload).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_app_version(app: AppHandle) -> Result<String, String> {
    Ok(load_app_version(&app))
}

#[tauri::command]
pub async fn check_app_update(app: AppHandle) -> Result<AppUpdateStatus, String> {
    load_app_update(&app).await.map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_update_notice_manifest(app: AppHandle) -> Result<Option<UpdateNoticeManifest>, String> {
    load_update_notice_manifest(&app).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn install_app_update(app: AppHandle) -> Result<OperationResult, String> {
    run_app_update_install(app).await.map_err(|error| error.to_string())
}

#[tauri::command]
pub fn dismiss_app_update(app: AppHandle, version: String) -> Result<OperationResult, String> {
    dismiss_pending_app_update(&app, &version).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn exit_application(app: AppHandle) -> Result<OperationResult, String> {
    app.exit(0);
    Ok(OperationResult { ok: true })
}

#[tauri::command]
pub fn minimize_main_window(app: AppHandle) -> Result<OperationResult, String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "No se encontro la ventana principal.".to_string())?;
    window.minimize().map_err(|error| error.to_string())?;
    Ok(OperationResult { ok: true })
}

#[tauri::command]
pub fn toggle_maximize_main_window(app: AppHandle) -> Result<OperationResult, String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "No se encontro la ventana principal.".to_string())?;
    let is_maximized = window.is_maximized().map_err(|error| error.to_string())?;
    if is_maximized {
        window.unmaximize().map_err(|error| error.to_string())?;
    } else {
        window.maximize().map_err(|error| error.to_string())?;
    }
    Ok(OperationResult { ok: true })
}

#[tauri::command]
pub fn close_main_window(app: AppHandle) -> Result<OperationResult, String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "No se encontro la ventana principal.".to_string())?;
    window.close().map_err(|error| error.to_string())?;
    Ok(OperationResult { ok: true })
}
