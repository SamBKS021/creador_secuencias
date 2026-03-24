import { invoke } from '@tauri-apps/api/core'

export function getWorkspaceConfig() {
  return invoke('get_workspace_config')
}

export function getSongCategories() {
  return invoke('get_song_categories')
}

export function saveSongCategories(categories) {
  return invoke('save_song_categories', { categories })
}

export function saveMotionMode(motionMode) {
  return invoke('save_motion_mode', { motionMode })
}

export function saveThemeMode(themeMode) {
  return invoke('save_theme_mode', { themeMode })
}

export function selectWorkspaceRoot() {
  return invoke('select_workspace_root')
}

export function bootstrapApp(workspaceRoot) {
  return invoke('bootstrap_app', { workspaceRoot })
}

export function getDriveAuthStatus() {
  return invoke('get_drive_auth_status')
}

export function connectGoogleDrive() {
  return invoke('connect_google_drive')
}

export function disconnectGoogleDrive() {
  return invoke('disconnect_google_drive')
}

export function getSyncStatus() {
  return invoke('get_sync_status')
}

export function getAppVersion() {
  return invoke('get_app_version')
}

export function checkAppUpdate() {
  return invoke('check_app_update')
}

export function getUpdateNoticeManifest() {
  return invoke('get_update_notice_manifest')
}

export function installAppUpdate() {
  return invoke('install_app_update')
}

export function dismissAppUpdate(version) {
  return invoke('dismiss_app_update', { version })
}

export function syncWorkspaceNow(reason = 'manual', mode = 'merge') {
  return invoke('sync_workspace_now', { reason, mode })
}

export function resolveSyncConflict(payload) {
  return invoke('resolve_sync_conflict', { payload })
}

export function exitApplication() {
  return invoke('exit_application')
}

export function minimizeMainWindow() {
  return invoke('minimize_main_window')
}

export function toggleMaximizeMainWindow() {
  return invoke('toggle_maximize_main_window')
}

export function closeMainWindow() {
  return invoke('close_main_window')
}

export function openSongFiles() {
  return invoke('open_song_files')
}

export function importSongDocxBatch() {
  return invoke('import_song_docx_batch')
}

export function saveSong(payload) {
  const { draftId, contentDraft, ...song } = payload
  return invoke('save_song', {
    payload: {
      song: {
        ...song,
        chords: '',
      },
      draftId: draftId || null,
      contentDraft: contentDraft || null,
    },
  })
}

export function updateSong(payload) {
  const { draftId, contentDraft, ...song } = payload
  return invoke('update_song', {
    payload: {
      song: {
        ...song,
        chords: '',
      },
      draftId: draftId || null,
      contentDraft: contentDraft || null,
    },
  })
}

export function saveSequence(payload) {
  return invoke('save_sequence', { payload })
}

export function deleteSequence(sequenceId) {
  return invoke('delete_sequence', { sequenceId })
}

export function deleteSong(songId) {
  return invoke('delete_song', { songId })
}

export function checkSequenceExportDocx(sequenceId) {
  return invoke('check_sequence_docx_export', { sequenceId })
}

export function getSequenceExportStatuses() {
  return invoke('get_sequence_export_statuses')
}

export function openExportedSequenceDocx(sequenceId) {
  return invoke('open_exported_sequence_docx', { sequenceId })
}

export function exportSequenceDocx(sequenceId, overwrite = false) {
  return invoke('export_sequence_docx', { sequenceId, overwrite })
}

export function openExportsFolder() {
  return invoke('open_exports_folder')
}
