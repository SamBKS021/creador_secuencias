use std::path::Path;

use uuid::Uuid;

use crate::errors::{AppError, AppResult};
use crate::models::{
    BootstrapPayload, Draft, ExportResult, Sequence, SequenceMutationResult, SequenceItem, Song,
    SongMutationResult,
};
use crate::workspace::{
    compute_stats, ensure_workspace, now_iso, read_json, write_json, WorkspacePaths,
};

pub fn bootstrap(root: &Path) -> AppResult<BootstrapPayload> {
    let paths = ensure_workspace(root)?;
    let songs: Vec<Song> = read_json(&paths.songs_file)?;
    let sequences: Vec<Sequence> = read_json(&paths.sequences_file)?;
    let drafts: Vec<Draft> = read_json(&paths.drafts_file)?;

    Ok(BootstrapPayload {
        workspace_root: paths.root.to_string_lossy().to_string(),
        stats: compute_stats(&songs, &sequences),
        songs,
        sequences,
        drafts,
    })
}

pub fn append_drafts(paths: &WorkspacePaths, mut drafts_to_add: Vec<Draft>) -> AppResult<Vec<Draft>> {
    let mut drafts: Vec<Draft> = read_json(&paths.drafts_file)?;
    drafts_to_add.append(&mut drafts);
    write_json(&paths.drafts_file, &drafts_to_add)?;
    Ok(drafts_to_add)
}

pub fn upsert_song(paths: &WorkspacePaths, payload: &Song, draft_id: Option<&str>) -> AppResult<SongMutationResult> {
    let mut songs: Vec<Song> = read_json(&paths.songs_file)?;
    let mut drafts: Vec<Draft> = read_json(&paths.drafts_file)?;
    let sequences: Vec<Sequence> = read_json(&paths.sequences_file)?;
    let timestamp = now_iso();

    let mut song = payload.clone();
    if song.id.is_empty() {
        song.id = Uuid::new_v4().to_string();
    }
    if song.created_at.is_empty() {
        song.created_at = timestamp.clone();
    }
    song.updated_at = timestamp;
    if song.status.is_empty() {
        song.status = "published".into();
    }

    match songs.iter().position(|item| item.id == song.id) {
        Some(index) => songs[index] = song.clone(),
        None => songs.insert(0, song.clone()),
    }

    if let Some(target_draft_id) = draft_id {
        drafts.retain(|draft| draft.id != target_draft_id);
        write_json(&paths.drafts_file, &drafts)?;
    }

    write_json(&paths.songs_file, &songs)?;

    Ok(SongMutationResult {
        song,
        stats: compute_stats(&songs, &sequences),
    })
}

pub fn delete_song(paths: &WorkspacePaths, song_id: &str) -> AppResult<()> {
    let mut songs: Vec<Song> = read_json(&paths.songs_file)?;
    let mut sequences: Vec<Sequence> = read_json(&paths.sequences_file)?;

    songs.retain(|song| song.id != song_id);
    for sequence in &mut sequences {
        sequence.items.retain(|item| item.song_id != song_id);
    }

    write_json(&paths.songs_file, &songs)?;
    write_json(&paths.sequences_file, &sequences)?;
    Ok(())
}

pub fn upsert_sequence(paths: &WorkspacePaths, payload: &Sequence) -> AppResult<SequenceMutationResult> {
    let songs: Vec<Song> = read_json(&paths.songs_file)?;
    let mut sequences: Vec<Sequence> = read_json(&paths.sequences_file)?;
    let timestamp = now_iso();

    let mut sequence = payload.clone();
    if sequence.id.is_empty() {
        sequence.id = Uuid::new_v4().to_string();
    }
    if sequence.created_at.is_empty() {
        sequence.created_at = timestamp.clone();
    }
    sequence.updated_at = timestamp;
    sequence.items = sequence
        .items
        .iter()
        .enumerate()
        .map(|(index, item)| SequenceItem {
            id: if item.id.is_empty() {
                Uuid::new_v4().to_string()
            } else {
                item.id.clone()
            },
            song_id: item.song_id.clone(),
            order: (index + 1) as i32,
            transition_type: if item.transition_type.is_empty() {
                "Transición libre".into()
            } else {
                item.transition_type.clone()
            },
        })
        .collect();

    match sequences.iter().position(|item| item.id == sequence.id) {
        Some(index) => sequences[index] = sequence.clone(),
        None => sequences.insert(0, sequence.clone()),
    }

    write_json(&paths.sequences_file, &sequences)?;

    Ok(SequenceMutationResult {
        sequence,
        stats: compute_stats(&songs, &sequences),
    })
}

pub fn delete_sequence(paths: &WorkspacePaths, sequence_id: &str) -> AppResult<()> {
    let mut sequences: Vec<Sequence> = read_json(&paths.sequences_file)?;
    sequences.retain(|sequence| sequence.id != sequence_id);
    write_json(&paths.sequences_file, &sequences)?;
    Ok(())
}

pub fn resolve_paths(root: &str) -> AppResult<WorkspacePaths> {
    if root.is_empty() {
        return Err(AppError::from("Selecciona una carpeta raíz para continuar."));
    }

    ensure_workspace(Path::new(root))
}

pub fn export_metadata(file_path: &Path) -> ExportResult {
    ExportResult {
        file_path: file_path.to_string_lossy().to_string(),
        file_name: file_path
            .file_name()
            .map(|item| item.to_string_lossy().to_string())
            .unwrap_or_else(|| "secuencia.docx".into()),
        exported_at: now_iso(),
    }
}
