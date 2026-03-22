use std::path::{Path, PathBuf};

use crate::models::{ManifestEntry, SyncConflict};
use crate::workspace::WorkspacePaths;

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

pub fn local_path_for_logical_key(paths: &WorkspacePaths, logical_key: &str) -> PathBuf {
    if logical_key == ".ccp/song-categories.json" {
        return paths.song_categories_file.clone();
    }

    let parts = logical_key.split('/').collect::<Vec<_>>();
    match parts.as_slice() {
        ["biblioteca", song_id, "meta.json"] => paths.library_dir.join(song_id).join("meta.json"),
        ["biblioteca", song_id, "content.json"] => paths.library_dir.join(song_id).join("content.json"),
        ["secuencias", file_name] => paths.sequences_dir.join(file_name),
        _ => paths.root.join(logical_key),
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
