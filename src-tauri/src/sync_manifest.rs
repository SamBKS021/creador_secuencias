use std::path::{Path, PathBuf};

use crate::errors::{AppError, AppResult};
use crate::models::{ManifestEntry, SyncConflict};
use crate::workspace::{validate_safe_id, WorkspacePaths};

pub const REMOTE_MANIFEST_NAME: &str = "ccp-manifest.json";

pub fn remote_file_name_for_logical_key(logical_key: &str) -> String {
    if logical_key == ".ccp/song-categories.json" {
        return "song-categories.json".into();
    }

    let parts = logical_key.split('/').collect::<Vec<_>>();
    match parts.as_slice() {
        ["biblioteca", song_id, "meta.json"] => format!("song-{song_id}-meta.json"),
        ["biblioteca", song_id, "content.json"] => format!("song-{song_id}-content.json"),
        ["secuencias", file_name] => format!("sequence-{file_name}"),
        _ => logical_key.replace('/', "__"),
    }
}

pub fn local_path_for_logical_key(paths: &WorkspacePaths, logical_key: &str) -> AppResult<PathBuf> {
    if logical_key == ".ccp/song-categories.json" {
        return Ok(paths.song_categories_file.clone());
    }

    if logical_key.contains('\\') || logical_key.contains('\0') {
        return Err(AppError::from(format!(
            "Clave de sincronizacion no permitida: {logical_key}"
        )));
    }

    let parts = logical_key.split('/').collect::<Vec<_>>();
    match parts.as_slice() {
        ["biblioteca", song_id, "meta.json"] => {
            let safe_id = validate_safe_id(song_id, "canto")?;
            Ok(paths.library_dir.join(safe_id).join("meta.json"))
        }
        ["biblioteca", song_id, "content.json"] => {
            let safe_id = validate_safe_id(song_id, "canto")?;
            Ok(paths.library_dir.join(safe_id).join("content.json"))
        }
        ["secuencias", file_name] => {
            let Some(sequence_id) = file_name.strip_suffix(".json") else {
                return Err(AppError::from(format!(
                    "Clave de sincronizacion no permitida: {logical_key}"
                )));
            };
            let safe_id = validate_safe_id(sequence_id, "secuencia")?;
            Ok(paths.sequences_dir.join(format!("{safe_id}.json")))
        }
        _ => Err(AppError::from(format!(
            "Clave de sincronizacion no permitida: {logical_key}"
        ))),
    }
}

pub fn conflict_title(entry: Option<&ManifestEntry>, logical_key: &str) -> String {
    if let Some(entry) = entry {
        if !entry.entity_id.is_empty() {
            return entry.entity_id.clone();
        }
    }

    logical_key.to_string()
}

pub fn is_deleted(entry: Option<&ManifestEntry>) -> bool {
    entry
        .map(|item| !item.deleted_at.is_empty())
        .unwrap_or(false)
}

pub fn signature(entry: Option<&ManifestEntry>) -> String {
    match entry {
        None => "__missing__".into(),
        Some(item) if !item.deleted_at.is_empty() => "__deleted__".into(),
        Some(item) => item.hash.clone(),
    }
}

pub fn build_conflict(
    logical_key: &str,
    local: Option<&ManifestEntry>,
    remote: Option<&ManifestEntry>,
) -> SyncConflict {
    let seed = local.or(remote);

    SyncConflict {
        logical_key: logical_key.into(),
        entity_type: seed.map(|item| item.entity_type.clone()).unwrap_or_default(),
        entity_id: seed.map(|item| item.entity_id.clone()).unwrap_or_default(),
        title: conflict_title(seed, logical_key),
        local_hash: local.map(|item| item.hash.clone()).unwrap_or_default(),
        remote_hash: remote.map(|item| item.hash.clone()).unwrap_or_default(),
        local_deleted: is_deleted(local),
        remote_deleted: is_deleted(remote),
    }
}

pub fn ensure_parent_dir(path: &Path) -> std::io::Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::local_path_for_logical_key;
    use crate::workspace::workspace_paths;
    use std::path::Path;

    #[test]
    fn allows_valid_logical_keys() {
        let paths = workspace_paths(Path::new("/tmp/ccp-test"));
        assert!(local_path_for_logical_key(&paths, ".ccp/song-categories.json").is_ok());
        assert!(local_path_for_logical_key(&paths, "biblioteca/canto-0001/meta.json").is_ok());
        assert!(local_path_for_logical_key(&paths, "biblioteca/canto-0001/content.json").is_ok());
        assert!(local_path_for_logical_key(&paths, "secuencias/sec-1.json").is_ok());
    }

    #[test]
    fn rejects_path_traversal_and_unknown_keys() {
        let paths = workspace_paths(Path::new("/tmp/ccp-test"));
        assert!(local_path_for_logical_key(&paths, "../../etc/passwd").is_err());
        assert!(local_path_for_logical_key(&paths, "biblioteca/../meta.json").is_err());
        assert!(local_path_for_logical_key(&paths, "biblioteca/canto-1/../../evil").is_err());
        assert!(local_path_for_logical_key(&paths, "secuencias/..\\evil.json").is_err());
        assert!(local_path_for_logical_key(&paths, "/abs/path.json").is_err());
        assert!(local_path_for_logical_key(&paths, "otros/archivo.json").is_err());
    }
}
