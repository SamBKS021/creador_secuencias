use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
#[serde(rename_all = "camelCase")]
pub struct Preferences {
    pub compact_sidebar: bool,
    pub motion_mode: String,
}

impl Default for Preferences {
    fn default() -> Self {
        Self {
            compact_sidebar: false,
            motion_mode: "normal".into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
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
    pub song_categories: Vec<String>,
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

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
#[serde(rename_all = "camelCase")]
pub struct OAuthLocalConfig {
    pub client_id: String,
    pub client_secret: String,
    pub connected_account_email: String,
    pub refresh_token_cache: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
#[serde(rename_all = "camelCase")]
pub struct DriveAuthStatus {
    pub configured: bool,
    pub connected: bool,
    pub connected_account_email: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
#[serde(rename_all = "camelCase")]
pub struct ManifestEntry {
    pub logical_key: String,
    pub hash: String,
    pub updated_at: String,
    pub deleted_at: String,
    pub file_id: String,
    pub entity_type: String,
    pub entity_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
#[serde(rename_all = "camelCase")]
pub struct ManifestRecord {
    pub entries: Vec<ManifestEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
#[serde(rename_all = "camelCase")]
pub struct SyncConflict {
    pub logical_key: String,
    pub entity_type: String,
    pub entity_id: String,
    pub title: String,
    pub local_hash: String,
    pub remote_hash: String,
    pub local_deleted: bool,
    pub remote_deleted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
#[serde(rename_all = "camelCase")]
pub struct SyncStateRecord {
    pub device_id: String,
    pub last_sync_at: String,
    pub last_sync_result: String,
    pub auth_account_email: String,
    pub remote_manifest_file_id: String,
    pub baseline_entries: Vec<ManifestEntry>,
    pub pending_conflicts: Vec<SyncConflict>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
    pub configured: bool,
    pub connected: bool,
    pub connected_account_email: String,
    pub last_synced_account_email: String,
    pub needs_initial_sync_choice: bool,
    pub syncing: bool,
    pub last_sync_at: String,
    pub last_sync_result: String,
    pub pending_conflicts: Vec<SyncConflict>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
#[serde(rename_all = "camelCase")]
pub struct SyncResult {
    pub applied_downloads: usize,
    pub applied_uploads: usize,
    pub detected_conflicts: usize,
    pub last_sync_at: String,
    pub last_sync_result: String,
    pub pending_conflicts: Vec<SyncConflict>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolveConflictPayload {
    pub logical_key: String,
    pub resolution: String,
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
