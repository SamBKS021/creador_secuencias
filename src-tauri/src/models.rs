use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Preferences {
    pub compact_sidebar: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceConfig {
    pub workspace_root: String,
    pub recent_roots: Vec<String>,
    pub locale: String,
    pub preferences: Preferences,
}

impl Default for WorkspaceConfig {
    fn default() -> Self {
        Self {
            workspace_root: String::new(),
            recent_roots: Vec::new(),
            locale: "es-MX".into(),
            preferences: Preferences::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
#[serde(rename_all = "camelCase")]
pub struct Song {
    pub id: String,
    pub title: String,
    pub title_normalized: String,
    pub author: String,
    pub category: String,
    pub key: String,
    pub tempo: i32,
    pub lyrics: String,
    pub chords: String,
    pub tags: Vec<String>,
    pub source_file_name: String,
    pub source_path: String,
    pub status: String,
    pub play_count: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
#[serde(rename_all = "camelCase")]
pub struct SongMetaRecord {
    pub id: String,
    pub title: String,
    pub title_normalized: String,
    pub author: String,
    pub category: String,
    pub key: String,
    pub tempo: i32,
    pub tags: Vec<String>,
    pub source_file_name: String,
    pub source_path: String,
    pub status: String,
    pub play_count: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
#[serde(rename_all = "camelCase")]
pub struct SongChord {
    pub symbol: String,
    pub offset: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
#[serde(rename_all = "camelCase")]
pub struct SongLine {
    pub id: String,
    pub kind: String,
    pub text: String,
    pub chords: Vec<SongChord>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
#[serde(rename_all = "camelCase")]
pub struct SongSection {
    pub id: String,
    pub section_type: String,
    pub label: String,
    pub lines: Vec<SongLine>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
#[serde(rename_all = "camelCase")]
pub struct SongContentRecord {
    pub version: i32,
    pub sections: Vec<SongSection>,
}

impl Default for SongContentRecord {
    fn default() -> Self {
        Self {
            version: 1,
            sections: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
#[serde(rename_all = "camelCase")]
pub struct SongPayload {
    pub song: Song,
    pub draft_id: Option<String>,
    pub content_draft: Option<SongContentRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
#[serde(rename_all = "camelCase")]
pub struct SequenceItem {
    pub id: String,
    pub song_id: String,
    pub order: i32,
    pub transition_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
#[serde(rename_all = "camelCase")]
pub struct Sequence {
    pub id: String,
    pub title: String,
    pub service_date: String,
    pub notes: String,
    pub items: Vec<SequenceItem>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
#[serde(rename_all = "camelCase")]
pub struct Draft {
    pub id: String,
    pub source_file_name: String,
    pub source_path: String,
    pub suggested_title: String,
    pub form_data: Song,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Stats {
    pub total_songs: usize,
    pub total_sequences: usize,
    pub recent_uploads: Vec<Song>,
    pub upcoming_sequences: Vec<Sequence>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BootstrapPayload {
    pub workspace_root: String,
    pub songs: Vec<Song>,
    pub sequences: Vec<Sequence>,
    pub drafts: Vec<Draft>,
    pub stats: Stats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSelection {
    pub workspace_root: String,
    pub created_structure: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppState {
    pub next_song_id: usize,
    pub next_sequence_id: usize,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            next_song_id: 1,
            next_sequence_id: 1,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OperationResult {
    pub ok: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SongMutationResult {
    pub song: Song,
    pub stats: Stats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SequenceMutationResult {
    pub sequence: Sequence,
    pub stats: Stats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DraftResult {
    pub drafts: Vec<Draft>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportCandidate {
    pub candidate_id: String,
    pub source_file_name: String,
    pub source_path: String,
    pub order: usize,
    pub title_detected: String,
    pub title_normalized: String,
    pub author_detected: String,
    pub key_detected: String,
    pub lyrics: String,
    pub chords: String,
    pub content_draft: SongContentRecord,
    pub matched_song_id: String,
    pub matched_song_title: String,
    pub match_type: String,
    pub confidence: f32,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportDocumentResult {
    pub source_file_name: String,
    pub source_path: String,
    pub candidates: Vec<ImportCandidate>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportBatchResult {
    pub documents: Vec<ImportDocumentResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub file_path: String,
    pub file_name: String,
    pub exported_at: String,
    pub overwritten: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportCheckResult {
    pub exists: bool,
    pub file_path: String,
    pub file_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SequenceExportStatus {
    pub sequence_id: String,
    pub exists: bool,
    pub file_path: String,
    pub file_name: String,
}
