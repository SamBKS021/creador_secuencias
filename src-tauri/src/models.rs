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
#[serde(rename_all = "camelCase")]
pub struct Song {
    pub id: String,
    pub title: String,
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
#[serde(rename_all = "camelCase")]
pub struct SongPayload {
    #[serde(flatten)]
    pub song: Song,
    pub draft_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SequenceItem {
    pub id: String,
    pub song_id: String,
    pub order: i32,
    pub transition_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
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
pub struct ExportResult {
    pub file_path: String,
    pub file_name: String,
    pub exported_at: String,
}
