use std::fs;
use std::path::{Path, PathBuf};

use chrono::Utc;
use tauri::{AppHandle, Manager};

use crate::errors::{AppError, AppResult};
use crate::models::{Draft, Preferences, Sequence, Song, Stats, WorkspaceConfig};

pub const LIBRARY_DIR: &str = "library";
pub const SEQUENCES_DIR: &str = "sequences";
pub const DRAFTS_DIR: &str = "drafts";
pub const EXPORTS_DIR: &str = "exports";

#[derive(Debug, Clone)]
pub struct WorkspacePaths {
    pub root: PathBuf,
    pub songs_file: PathBuf,
    pub sequences_file: PathBuf,
    pub drafts_file: PathBuf,
    pub exports_dir: PathBuf,
}

pub fn now_iso() -> String {
    Utc::now().to_rfc3339()
}

pub fn app_data_dir(app: &AppHandle) -> AppResult<PathBuf> {
    let Some(path) = app.path().app_data_dir().ok() else {
        return Err(AppError::from("No fue posible resolver AppData."));
    };

    fs::create_dir_all(&path)?;
    Ok(path)
}

pub fn config_path(app: &AppHandle) -> AppResult<PathBuf> {
    Ok(app_data_dir(app)?.join("config.json"))
}

pub fn load_config(app: &AppHandle) -> AppResult<WorkspaceConfig> {
    let path = config_path(app)?;
    if !path.exists() {
        return Ok(WorkspaceConfig {
            workspace_root: String::new(),
            recent_roots: Vec::new(),
            locale: "es-MX".into(),
            preferences: Preferences::default(),
        });
    }

    Ok(serde_json::from_str(&fs::read_to_string(path)?)?)
}

pub fn save_config(app: &AppHandle, config: &WorkspaceConfig) -> AppResult<()> {
    let path = config_path(app)?;
    fs::write(path, serde_json::to_string_pretty(config)?)?;
    Ok(())
}

pub fn workspace_paths(root: &Path) -> WorkspacePaths {
    WorkspacePaths {
        root: root.to_path_buf(),
        songs_file: root.join(LIBRARY_DIR).join("songs.json"),
        sequences_file: root.join(SEQUENCES_DIR).join("sequences.json"),
        drafts_file: root.join(DRAFTS_DIR).join("drafts.json"),
        exports_dir: root.join(EXPORTS_DIR),
    }
}

pub fn ensure_workspace(root: &Path) -> AppResult<WorkspacePaths> {
    let paths = workspace_paths(root);

    fs::create_dir_all(root)?;
    fs::create_dir_all(root.join(LIBRARY_DIR))?;
    fs::create_dir_all(root.join(SEQUENCES_DIR))?;
    fs::create_dir_all(root.join(DRAFTS_DIR))?;
    fs::create_dir_all(root.join(EXPORTS_DIR))?;

    ensure_json_file::<Vec<Song>>(&paths.songs_file)?;
    ensure_json_file::<Vec<Sequence>>(&paths.sequences_file)?;
    ensure_json_file::<Vec<Draft>>(&paths.drafts_file)?;

    Ok(paths)
}

fn ensure_json_file<T>(path: &Path) -> AppResult<()>
where
    T: serde::Serialize + Default,
{
    if !path.exists() {
        fs::write(path, serde_json::to_string_pretty(&T::default())?)?;
    }

    Ok(())
}

pub fn read_json<T>(path: &Path) -> AppResult<T>
where
    T: serde::de::DeserializeOwned,
{
    Ok(serde_json::from_str(&fs::read_to_string(path)?)?)
}

pub fn write_json<T>(path: &Path, value: &T) -> AppResult<()>
where
    T: serde::Serialize,
{
    fs::write(path, serde_json::to_string_pretty(value)?)?;
    Ok(())
}

pub fn update_recent_roots(config: &mut WorkspaceConfig, root: &str) {
    let mut recent_roots = vec![root.to_string()];
    recent_roots.extend(config.recent_roots.iter().filter(|item| item.as_str() != root).cloned());
    config.recent_roots = recent_roots.into_iter().take(5).collect();
    config.workspace_root = root.to_string();
}

pub fn compute_stats(songs: &[Song], sequences: &[Sequence]) -> Stats {
    let mut recent_uploads = songs.to_vec();
    recent_uploads.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
    recent_uploads.truncate(3);

    let mut upcoming_sequences = sequences.to_vec();
    upcoming_sequences.sort_by(|left, right| left.service_date.cmp(&right.service_date));
    upcoming_sequences.truncate(3);

    Stats {
        total_songs: songs.len(),
        total_sequences: sequences.len(),
        recent_uploads,
        upcoming_sequences,
    }
}
