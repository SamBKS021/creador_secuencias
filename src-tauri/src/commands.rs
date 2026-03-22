use std::path::PathBuf;

use tauri::AppHandle;
use tauri_plugin_dialog::{DialogExt, FilePath};

use crate::errors::{AppError, AppResult};
use crate::export::{export_sequence_docx as build_docx_export, export_sequence_docx_path};
use crate::importer::{import_docx_batch, normalize_title};
use crate::models::{
    Draft, DraftResult, ExportCheckResult, ExportResult, ImportBatchResult, OperationResult, Sequence,
    Preferences, SequenceExportStatus, SequenceMutationResult, Song, SongMutationResult, SongPayload, WorkspaceConfig,
    WorkspaceSelection,
};
use crate::repository::{
    append_drafts, bootstrap, delete_sequence as delete_sequence_record, delete_song as delete_song_record,
    export_metadata, load_songs, resolve_paths, upsert_sequence, upsert_song,
};
use crate::workspace::{ensure_workspace, load_config, read_json, save_config, update_recent_roots};

fn file_path_to_pathbuf(file_path: FilePath) -> Option<PathBuf> {
    file_path.into_path().ok()
}

fn resolve_root_from_config(app: &AppHandle) -> AppResult<String> {
    let config = load_config(app)?;
    if config.workspace_root.is_empty() {
        return Err(AppError::from("No hay carpeta raiz configurada."));
    }
    Ok(config.workspace_root)
}

fn pick_docx_files(app: &AppHandle) -> Option<Vec<PathBuf>> {
    app.dialog()
        .file()
        .add_filter("Documentos Word", &["docx"])
        .blocking_pick_files()
        .map(|files| files.into_iter().filter_map(file_path_to_pathbuf).collect::<Vec<_>>())
}

fn sanitize_song_categories(categories: Vec<String>) -> Vec<String> {
    let mut sanitized = categories
        .into_iter()
        .map(|category| category.trim().to_string())
        .filter(|category| !category.is_empty())
        .fold(Vec::<String>::new(), |mut acc, category| {
            if !acc.iter().any(|item| item.eq_ignore_ascii_case(&category)) {
                acc.push(category);
            }
            acc
        });

    if sanitized.is_empty() {
        sanitized = Preferences::default().song_categories;
    }

    sanitized
}

#[tauri::command]
pub fn get_workspace_config(app: AppHandle) -> Result<WorkspaceConfig, String> {
    load_config(&app).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn save_song_categories(app: AppHandle, categories: Vec<String>) -> Result<Preferences, String> {
    let mut config = load_config(&app).map_err(|error| error.to_string())?;
    config.preferences.song_categories = sanitize_song_categories(categories);
    save_config(&app, &config).map_err(|error| error.to_string())?;
    Ok(config.preferences)
}

#[tauri::command]
pub fn save_motion_mode(app: AppHandle, motion_mode: String) -> Result<Preferences, String> {
    let normalized = match motion_mode.trim().to_lowercase().as_str() {
        "reduced" => "reduced",
        "off" => "off",
        _ => "normal",
    }
    .to_string();

    let mut config = load_config(&app).map_err(|error| error.to_string())?;
    config.preferences.motion_mode = normalized;
    save_config(&app, &config).map_err(|error| error.to_string())?;
    Ok(config.preferences)
}

#[tauri::command]
pub fn select_workspace_root(app: AppHandle) -> Result<WorkspaceSelection, String> {
    let Some(folder) = app.dialog().file().blocking_pick_folder() else {
        return Err("Seleccion cancelada.".into());
    };

    let Some(root_path) = file_path_to_pathbuf(folder) else {
        return Err("No fue posible resolver la carpeta elegida.".into());
    };

    ensure_workspace(&root_path).map_err(|error| error.to_string())?;

    let mut config = load_config(&app).map_err(|error| error.to_string())?;
    let root_string = root_path.to_string_lossy().to_string();
    update_recent_roots(&mut config, &root_string);
    save_config(&app, &config).map_err(|error| error.to_string())?;

    Ok(WorkspaceSelection {
        workspace_root: root_string,
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
    let sequences: Vec<Sequence> = read_json(&paths.sequences_file).map_err(|error| error.to_string())?;

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
    let sequences: Vec<Sequence> = read_json(&paths.sequences_file).map_err(|error| error.to_string())?;

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
    let sequences: Vec<Sequence> = read_json(&paths.sequences_file).map_err(|error| error.to_string())?;

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
    let sequences: Vec<Sequence> = read_json(&paths.sequences_file).map_err(|error| error.to_string())?;

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
