use std::fs;
use std::path::{Path, PathBuf};

use serde_json::Value;
use uuid::Uuid;

use crate::errors::{AppError, AppResult};
use crate::importer::normalize_title;
use crate::models::{
    AppState, BootstrapPayload, Draft, ExportResult, Sequence, SequenceMutationResult, SequenceItem, Song,
    SongChord, SongContentRecord, SongLine, SongMetaRecord, SongMutationResult, SongPayload, SongSection,
};
use crate::workspace::{
    compute_stats, ensure_workspace, now_iso, read_json, write_json, WorkspacePaths,
};

#[derive(Debug, Clone, serde::Deserialize, Default)]
#[serde(default, rename_all = "camelCase")]
struct LegacySongContentRecord {
    lyrics: String,
    chords: String,
}

pub fn bootstrap(root: &Path) -> AppResult<BootstrapPayload> {
    let paths = ensure_workspace(root)?;
    migrate_legacy_workspace_files(&paths)?;
    migrate_legacy_library(&paths)?;
    let songs = load_songs(&paths)?;
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
    migrate_legacy_workspace_files(paths)?;
    let mut drafts: Vec<Draft> = read_json(&paths.drafts_file)?;
    drafts_to_add.append(&mut drafts);
    write_json(&paths.drafts_file, &drafts_to_add)?;
    Ok(drafts_to_add)
}

pub fn upsert_song(paths: &WorkspacePaths, payload: &SongPayload) -> AppResult<SongMutationResult> {
    migrate_legacy_workspace_files(paths)?;
    migrate_legacy_library(paths)?;

    let mut drafts: Vec<Draft> = read_json(&paths.drafts_file)?;
    let sequences: Vec<Sequence> = read_json(&paths.sequences_file)?;
    let timestamp = now_iso();

    let mut song = payload.song.clone();
    let existing_song = if song.id.is_empty() {
        None
    } else {
        let song_dir = paths.library_dir.join(&song.id);
        if song_dir.exists() {
            load_song_from_dir(&song_dir).ok()
        } else {
            None
        }
    };

    if song.id.is_empty() {
        song.id = next_song_id(paths)?;
    }

    if let Some(existing) = &existing_song {
        song.created_at = existing.created_at.clone();
        if song.source_file_name.is_empty() {
            song.source_file_name = existing.source_file_name.clone();
        }
        if song.source_path.is_empty() {
            song.source_path = existing.source_path.clone();
        }
        if song.status.is_empty() {
            song.status = existing.status.clone();
        }
        if song.play_count == 0 {
            song.play_count = existing.play_count;
        }
    } else if song.created_at.is_empty() {
        song.created_at = timestamp.clone();
    }

    song.updated_at = timestamp;
    song.title_normalized = normalize_title(&song.title);
    if song.status.is_empty() {
        song.status = "published".into();
    }

    let persisted_song = persist_song(paths, &song, payload.content_draft.as_ref())?;

    if let Some(target_draft_id) = payload.draft_id.as_deref() {
        drafts.retain(|draft| draft.id != target_draft_id);
        write_json(&paths.drafts_file, &drafts)?;
    }

    let songs = load_songs(paths)?;

    Ok(SongMutationResult {
        song: persisted_song,
        stats: compute_stats(&songs, &sequences),
    })
}

pub fn delete_song(paths: &WorkspacePaths, song_id: &str) -> AppResult<()> {
    migrate_legacy_workspace_files(paths)?;
    migrate_legacy_library(paths)?;

    let song_dir = paths.library_dir.join(song_id);
    if song_dir.exists() {
        fs::remove_dir_all(song_dir)?;
    }

    let mut sequences: Vec<Sequence> = read_json(&paths.sequences_file)?;
    for sequence in &mut sequences {
        sequence.items.retain(|item| item.song_id != song_id);
    }

    write_json(&paths.sequences_file, &sequences)?;
    Ok(())
}

pub fn upsert_sequence(paths: &WorkspacePaths, payload: &Sequence) -> AppResult<SequenceMutationResult> {
    migrate_legacy_workspace_files(paths)?;
    let songs = load_songs(paths)?;
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
    migrate_legacy_workspace_files(paths)?;
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

pub fn load_songs(paths: &WorkspacePaths) -> AppResult<Vec<Song>> {
    migrate_legacy_workspace_files(paths)?;
    migrate_legacy_library(paths)?;

    let mut songs = fs::read_dir(&paths.library_dir)?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| path.is_dir())
        .filter_map(|path| load_song_from_dir(&path).ok())
        .collect::<Vec<_>>();

    songs.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
    Ok(songs)
}

fn load_song_from_dir(song_dir: &Path) -> AppResult<Song> {
    let meta: SongMetaRecord = read_json(&song_dir.join("meta.json"))?;
    let content = load_song_content(&song_dir.join("content.json"))?;

    Ok(build_song_from_records(meta, content))
}

fn persist_song(paths: &WorkspacePaths, song: &Song, content_draft: Option<&SongContentRecord>) -> AppResult<Song> {
    let song_dir = paths.library_dir.join(&song.id);
    fs::create_dir_all(&song_dir)?;

    let title_normalized = normalize_title(&song.title);
    let meta = SongMetaRecord {
        id: song.id.clone(),
        title: song.title.clone(),
        title_normalized: title_normalized.clone(),
        author: song.author.clone(),
        category: song.category.clone(),
        key: song.key.clone(),
        tempo: song.tempo,
        tags: song.tags.clone(),
        source_file_name: song.source_file_name.clone(),
        source_path: song.source_path.clone(),
        status: song.status.clone(),
        play_count: song.play_count,
        created_at: song.created_at.clone(),
        updated_at: song.updated_at.clone(),
    };

    let content = resolve_song_content(song, content_draft);

    write_json(&song_dir.join("meta.json"), &meta)?;
    write_json(&song_dir.join("content.json"), &content)?;

    Ok(build_song_from_records(meta, content))
}

fn resolve_song_content(song: &Song, content_draft: Option<&SongContentRecord>) -> SongContentRecord {
    if let Some(draft) = content_draft {
        let flattened_lyrics = flatten_lyrics(draft);
        let flattened_chords = flatten_chords(draft);

        if normalized_multiline_eq(&flattened_lyrics, &song.lyrics)
            && normalized_multiline_eq(&flattened_chords, &song.chords)
        {
            return stabilize_content_ids(draft);
        }
    }

    build_content_from_flat(&song.lyrics, &song.chords)
}

fn build_song_from_records(meta: SongMetaRecord, content: SongContentRecord) -> Song {
    Song {
        id: meta.id,
        title: meta.title.clone(),
        title_normalized: if meta.title_normalized.is_empty() {
            normalize_title(&meta.title)
        } else {
            meta.title_normalized
        },
        author: meta.author,
        category: meta.category,
        key: meta.key,
        tempo: meta.tempo,
        lyrics: flatten_lyrics(&content),
        chords: flatten_chords(&content),
        tags: meta.tags,
        source_file_name: meta.source_file_name,
        source_path: meta.source_path,
        status: meta.status,
        play_count: meta.play_count,
        created_at: meta.created_at,
        updated_at: meta.updated_at,
    }
}

fn load_song_content(path: &Path) -> AppResult<SongContentRecord> {
    let raw = fs::read_to_string(path)?;
    let value: Value = serde_json::from_str(&raw)?;

    if value.get("sections").is_some() {
        let content: SongContentRecord = serde_json::from_value(value)?;
        Ok(stabilize_content_ids(&content))
    } else {
        let legacy: LegacySongContentRecord = serde_json::from_str(&raw)?;
        Ok(build_content_from_flat(&legacy.lyrics, &legacy.chords))
    }
}

fn stabilize_content_ids(content: &SongContentRecord) -> SongContentRecord {
    let mut section_counter = 1usize;
    let mut line_counter = 1usize;

    let sections = if content.sections.is_empty() {
        vec![SongSection {
            id: format!("section-{section_counter:04}"),
            section_type: "custom".into(),
            label: "CUSTOM".into(),
            lines: vec![SongLine {
                id: format!("line-{line_counter:04}"),
                kind: "empty".into(),
                text: String::new(),
                chords: Vec::new(),
            }],
        }]
    } else {
        content
            .sections
            .iter()
            .map(|section| {
                let section_id = format!("section-{section_counter:04}");
                section_counter += 1;

                let mut lines = if section.lines.is_empty() {
                    vec![SongLine {
                        id: format!("line-{line_counter:04}"),
                        kind: "empty".into(),
                        text: String::new(),
                        chords: Vec::new(),
                    }]
                } else {
                    section
                        .lines
                        .iter()
                        .map(|line| {
                            let stable_line = stabilize_line(line, line_counter);
                            line_counter += 1;
                            stable_line
                        })
                        .collect::<Vec<_>>()
                };

                if lines.is_empty() {
                    lines.push(SongLine {
                        id: format!("line-{line_counter:04}"),
                        kind: "empty".into(),
                        text: String::new(),
                        chords: Vec::new(),
                    });
                    line_counter += 1;
                }

                SongSection {
                    id: section_id,
                    section_type: if section.section_type.is_empty() {
                        "custom".into()
                    } else {
                        section.section_type.clone()
                    },
                    label: if section.label.is_empty() {
                        "CUSTOM".into()
                    } else {
                        section.label.clone()
                    },
                    lines,
                }
            })
            .collect()
    };

    SongContentRecord {
        version: if content.version <= 0 { 1 } else { content.version },
        sections,
    }
}

fn stabilize_line(line: &SongLine, index: usize) -> SongLine {
    SongLine {
        id: format!("line-{index:04}"),
        kind: if line.kind.is_empty() {
            "lyric".into()
        } else {
            line.kind.clone()
        },
        text: line.text.clone(),
        chords: stabilize_chords(&line.chords, &line.kind, &line.text),
    }
}

fn stabilize_chords(chords: &[SongChord], line_kind: &str, text: &str) -> Vec<SongChord> {
    let limit = text.chars().count();

    if line_kind == "chords-only" || text.is_empty() {
        return chords.to_vec();
    }

    if chords.iter().all(|chord| chord.offset <= limit) {
        chords.to_vec()
    } else {
        Vec::new()
    }
}

fn build_content_from_flat(lyrics: &str, chords: &str) -> SongContentRecord {
    let mut lines = Vec::new();
    let mut line_counter = 1usize;

    for lyric_line in lyrics.lines() {
        lines.push(SongLine {
            id: format!("line-{line_counter:04}"),
            kind: if lyric_line.trim().is_empty() {
                "empty".into()
            } else if is_instruction_line(lyric_line) {
                "instruction".into()
            } else {
                "lyric".into()
            },
            text: lyric_line.to_string(),
            chords: Vec::new(),
        });
        line_counter += 1;
    }

    if !chords.trim().is_empty() {
        if !lines.is_empty() && !lines.last().is_some_and(|line| line.kind == "empty") {
            lines.push(SongLine {
                id: format!("line-{line_counter:04}"),
                kind: "empty".into(),
                text: String::new(),
                chords: Vec::new(),
            });
            line_counter += 1;
        }

        for chord_line in chords.lines() {
            let parsed_chords = parse_chords(chord_line);
            lines.push(SongLine {
                id: format!("line-{line_counter:04}"),
                kind: if chord_line.trim().is_empty() {
                    "empty".into()
                } else if parsed_chords.is_empty() {
                    "instruction".into()
                } else {
                    "chords-only".into()
                },
                text: if parsed_chords.is_empty() {
                    chord_line.to_string()
                } else {
                    String::new()
                },
                chords: parsed_chords,
            });
            line_counter += 1;
        }
    }

    if lines.is_empty() {
        lines.push(SongLine {
            id: "line-0001".into(),
            kind: "empty".into(),
            text: String::new(),
            chords: Vec::new(),
        });
    }

    SongContentRecord {
        version: 1,
        sections: vec![SongSection {
            id: "section-0001".into(),
            section_type: "custom".into(),
            label: "CUSTOM".into(),
            lines,
        }],
    }
}

fn flatten_lyrics(content: &SongContentRecord) -> String {
    let mut blocks = Vec::new();

    for section in &content.sections {
        if should_render_label(section) {
            blocks.push(section.label.clone());
        }

        for line in &section.lines {
            match line.kind.as_str() {
                "lyric" | "instruction" => blocks.push(line.text.clone()),
                "empty" => blocks.push(String::new()),
                _ => {}
            }
        }

        blocks.push(String::new());
    }

    while blocks.last().is_some_and(|value| value.is_empty()) {
        blocks.pop();
    }

    blocks.join("\n")
}

fn flatten_chords(content: &SongContentRecord) -> String {
    let mut blocks = Vec::new();

    for section in &content.sections {
        if should_render_label(section) {
            blocks.push(section.label.clone());
        }

        for line in &section.lines {
            if !line.chords.is_empty() {
                blocks.push(render_chord_line(&line.chords));
            } else if line.kind == "instruction" && !line.text.is_empty() {
                blocks.push(line.text.clone());
            } else if line.kind == "empty" {
                blocks.push(String::new());
            }
        }

        blocks.push(String::new());
    }

    while blocks.last().is_some_and(|value| value.is_empty()) {
        blocks.pop();
    }

    blocks.join("\n")
}

fn should_render_label(section: &SongSection) -> bool {
    !(section.section_type == "custom" && section.label.eq_ignore_ascii_case("CUSTOM"))
}

fn render_chord_line(chords: &[SongChord]) -> String {
    let mut line = String::new();

    for chord in chords {
        while line.len() < chord.offset {
            line.push(' ');
        }
        line.push_str(&chord.symbol);
    }

    line.trim_end().to_string()
}

fn parse_chords(text: &str) -> Vec<SongChord> {
    let chord_regex = regex::Regex::new(
        r"(?i)([A-G](?:#|b)?(?:maj7|maj|min|m|sus2|sus4|dim|aug|add9|m7|m9|m11|m13|7|9|11|13|6)?(?:/[A-G](?:#|b)?)?)",
    )
    .expect("valid chord regex");

    chord_regex
        .captures_iter(text)
        .filter_map(|captures| captures.get(1))
        .filter(|matched| has_valid_chord_boundaries(text, matched.start(), matched.end()))
        .map(|matched| SongChord {
            symbol: matched.as_str().to_string(),
            offset: matched.start(),
        })
        .collect()
}

fn has_valid_chord_boundaries(text: &str, start: usize, end: usize) -> bool {
    let previous = text[..start].chars().next_back();
    let next = text[end..].chars().next();
    is_valid_chord_boundary(previous) && is_valid_chord_boundary(next)
}

fn is_valid_chord_boundary(character: Option<char>) -> bool {
    match character {
        None => true,
        Some(value) => !value.is_alphanumeric() && value != '#' && value != 'b' && value != '/',
    }
}

fn normalized_multiline_eq(left: &str, right: &str) -> bool {
    normalize_multiline(left) == normalize_multiline(right)
}

fn normalize_multiline(value: &str) -> String {
    value
        .lines()
        .map(|line| line.trim_end())
        .collect::<Vec<_>>()
        .join("\n")
        .trim()
        .to_string()
}

fn is_instruction_line(text: &str) -> bool {
    let trimmed = text.trim();
    trimmed.starts_with('[') || trimmed.starts_with('(')
}

fn migrate_legacy_library(paths: &WorkspacePaths) -> AppResult<()> {
    if !paths.legacy_songs_file.exists() {
        return Ok(());
    }

    let legacy_songs: Vec<Song> = read_json(&paths.legacy_songs_file)?;
    if legacy_songs.is_empty() {
        fs::remove_file(&paths.legacy_songs_file)?;
        return Ok(());
    }

    for song in &legacy_songs {
        persist_song(paths, song, None)?;
    }

    sync_next_song_id(paths, &legacy_songs)?;
    fs::remove_file(&paths.legacy_songs_file)?;
    Ok(())
}

fn migrate_legacy_workspace_files(paths: &WorkspacePaths) -> AppResult<()> {
    migrate_legacy_json_file::<Vec<Sequence>>(&paths.legacy_sequences_file, &paths.sequences_file)?;
    migrate_legacy_json_file::<Vec<Draft>>(&paths.legacy_drafts_file, &paths.drafts_file)?;
    Ok(())
}

fn migrate_legacy_json_file<T>(legacy_path: &PathBuf, target_path: &PathBuf) -> AppResult<()>
where
    T: serde::Serialize + serde::de::DeserializeOwned,
{
    if !legacy_path.exists() {
        return Ok(());
    }

    let target_is_empty = fs::read_to_string(target_path)
        .map(|content| {
            let trimmed = content.trim();
            trimmed == "[]" || trimmed == "{}" || trimmed == "null"
        })
        .unwrap_or(false);

    if target_is_empty {
        let legacy_value: T = read_json(legacy_path)?;
        write_json(target_path, &legacy_value)?;
    }

    fs::remove_file(legacy_path)?;
    Ok(())
}

fn next_song_id(paths: &WorkspacePaths) -> AppResult<String> {
    let mut app_state: AppState = read_json(&paths.app_state_file)?;
    let song_id = format!("canto-{:04}", app_state.next_song_id);
    app_state.next_song_id += 1;
    write_json(&paths.app_state_file, &app_state)?;
    Ok(song_id)
}

fn sync_next_song_id(paths: &WorkspacePaths, songs: &[Song]) -> AppResult<()> {
    let max_song_id = songs
        .iter()
        .filter_map(|song| parse_song_id(&song.id))
        .max()
        .unwrap_or(0);

    let mut app_state: AppState = read_json(&paths.app_state_file)?;
    app_state.next_song_id = app_state.next_song_id.max(max_song_id + 1);
    write_json(&paths.app_state_file, &app_state)?;
    Ok(())
}

fn parse_song_id(song_id: &str) -> Option<usize> {
    song_id
        .strip_prefix("canto-")
        .and_then(|value| value.parse::<usize>().ok())
}
