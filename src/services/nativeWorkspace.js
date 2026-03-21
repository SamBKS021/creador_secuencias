import { invoke } from '@tauri-apps/api/core'

export function getWorkspaceConfig() {
  return invoke('get_workspace_config')
}

export function selectWorkspaceRoot() {
  return invoke('select_workspace_root')
}

export function bootstrapApp(workspaceRoot) {
  return invoke('bootstrap_app', { workspaceRoot })
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
      song,
      draftId: draftId || null,
      contentDraft: contentDraft || null,
    },
  })
}

export function updateSong(payload) {
  const { draftId, contentDraft, ...song } = payload
  return invoke('update_song', {
    payload: {
      song,
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

export function exportSequenceDocx(sequenceId) {
  return invoke('export_sequence_docx', { sequenceId })
}

export function openExportsFolder() {
  return invoke('open_exports_folder')
}
