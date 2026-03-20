use std::path::PathBuf;

use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::{DialogExt, FilePath};

use crate::errors::{AppError, AppResult};
use crate::export::export_sequence_docx as build_docx_export;
use crate::models::{
    Draft, DraftResult, ExportResult, OperationResult, Sequence, SequenceMutationResult, Song,
    SongMutationResult, SongPayload, WorkspaceConfig, WorkspaceSelection,
};
use crate::repository::{
    append_drafts, bootstrap, delete_sequence as delete_sequence_record, delete_song as delete_song_record,
    export_metadata, resolve_paths, upsert_sequence, upsert_song,
};
use crate::workspace::{ensure_workspace, load_config, read_json, save_config, update_recent_roots};

fn file_path_to_pathbuf(file_path: FilePath) -> Option<PathBuf> {
    file_path.into_path().ok()
}

fn resolve_root_from_config(app: &AppHandle) -> AppResult<String> {
    let config = load_config(app)?;
    if config.workspace_root.is_empty() {
        return Err(AppError::from("No hay carpeta raíz configurada."));
    }
    Ok(config.workspace_root)
}

#[tauri::command]
pub fn get_workspace_config(app: AppHandle) -> Result<WorkspaceConfig, String> {
    load_config(&app).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn select_workspace_root(app: AppHandle) -> Result<WorkspaceSelection, String> {
    let Some(folder) = app.dialog().file().blocking_pick_folder() else {
        return Err("Selección cancelada.".into());
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
            "library".into(),
            "sequences".into(),
            "drafts".into(),
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

    let Some(files) = app
        .dialog()
        .file()
        .add_filter("Documentos Word", &["docx"])
        .blocking_pick_files()
    else {
        return Ok(DraftResult {
            drafts: read_json(&paths.drafts_file).map_err(|error| error.to_string())?,
        });
    };

    let drafts = files
        .into_iter()
        .filter_map(file_path_to_pathbuf)
        .map(|path| {
            let source_file_name = path
                .file_name()
                .map(|item| item.to_string_lossy().to_string())
                .unwrap_or_else(|| "archivo.docx".into());
            let created_at = crate::workspace::now_iso();
            Draft {
                id: uuid::Uuid::new_v4().to_string(),
                source_file_name: source_file_name.clone(),
                source_path: path.to_string_lossy().to_string(),
                suggested_title: source_file_name.trim_end_matches(".docx").replace('_', " "),
                form_data: Song {
                    id: String::new(),
                    title: source_file_name.trim_end_matches(".docx").replace('_', " "),
                    author: String::new(),
                    category: "Contemporánea".into(),
                    key: "G Major".into(),
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
pub fn save_song(app: AppHandle, payload: SongPayload) -> Result<SongMutationResult, String> {
    let root = resolve_root_from_config(&app).map_err(|error| error.to_string())?;
    let paths = resolve_paths(&root).map_err(|error| error.to_string())?;
    upsert_song(&paths, &payload.song, payload.draft_id.as_deref()).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn update_song(app: AppHandle, payload: SongPayload) -> Result<SongMutationResult, String> {
    let root = resolve_root_from_config(&app).map_err(|error| error.to_string())?;
    let paths = resolve_paths(&root).map_err(|error| error.to_string())?;
    upsert_song(&paths, &payload.song, payload.draft_id.as_deref()).map_err(|error| error.to_string())
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
pub fn export_sequence_docx(app: AppHandle, sequence_id: String) -> Result<ExportResult, String> {
    let root = resolve_root_from_config(&app).map_err(|error| error.to_string())?;
    let paths = ensure_workspace(PathBuf::from(&root).as_path()).map_err(|error| error.to_string())?;
    let songs: Vec<Song> = read_json(&paths.songs_file).map_err(|error| error.to_string())?;
    let sequences: Vec<Sequence> = read_json(&paths.sequences_file).map_err(|error| error.to_string())?;

    let Some(sequence) = sequences.into_iter().find(|item| item.id == sequence_id) else {
        return Err("No se encontró la secuencia a exportar.".into());
    };

    let file_path =
        build_docx_export(PathBuf::from(&root).as_path(), &sequence, &songs).map_err(|error| error.to_string())?;

    Ok(export_metadata(&file_path))
}

#[tauri::command]
pub fn open_exports_folder(app: AppHandle) -> Result<OperationResult, String> {
    let root = resolve_root_from_config(&app).map_err(|error| error.to_string())?;
    let paths = ensure_workspace(PathBuf::from(&root).as_path()).map_err(|error| error.to_string())?;
    open::that_detached(paths.exports_dir).map_err(|error| error.to_string())?;
    Ok(OperationResult { ok: true })
}
