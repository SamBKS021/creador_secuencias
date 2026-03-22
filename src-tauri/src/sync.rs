use std::collections::{BTreeMap, BTreeSet};
use std::fs;

use tauri::AppHandle;

use crate::drive_auth::{access_token_from_refresh, get_drive_auth_status};
use crate::drive_client::{
    delete_remote_file, download_logical_file, fetch_account_email, load_remote_manifest, save_remote_manifest,
    upload_logical_file,
};
use crate::errors::{AppError, AppResult};
use crate::models::{
    ManifestEntry, ManifestRecord, ResolveConflictPayload, SyncConflict, SyncResult, SyncStateRecord, SyncStatus,
};
use crate::repository::{build_local_manifest, resolve_paths, write_manifest};
use crate::sync_manifest::{build_conflict, ensure_parent_dir, local_path_for_logical_key, signature};
use crate::workspace::{load_config, now_iso, read_json, write_json};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum SyncMode {
    Merge,
    Push,
    Pull,
}

pub fn get_sync_status(app: &AppHandle) -> AppResult<SyncStatus> {
    let auth = get_drive_auth_status(app)?;
    let workspace_root = load_config(app)?.workspace_root;
    if workspace_root.is_empty() {
        return Ok(SyncStatus {
            configured: auth.configured,
            connected: auth.connected,
            connected_account_email: auth.connected_account_email,
            ..SyncStatus::default()
        });
    }

    let paths = resolve_paths(&workspace_root)?;
    let sync_state: SyncStateRecord = read_json(&paths.sync_state_file).unwrap_or_default();
    let needs_initial_sync_choice = auth.connected
        && !auth.connected_account_email.trim().is_empty()
        && (sync_state.last_sync_at.is_empty() || sync_state.auth_account_email != auth.connected_account_email);

    Ok(SyncStatus {
        configured: auth.configured,
        connected: auth.connected,
        connected_account_email: auth.connected_account_email,
        last_synced_account_email: sync_state.auth_account_email,
        needs_initial_sync_choice,
        syncing: false,
        last_sync_at: sync_state.last_sync_at,
        last_sync_result: sync_state.last_sync_result,
        pending_conflicts: sync_state.pending_conflicts,
    })
}

pub fn sync_workspace_now(app: &AppHandle, _reason: &str, mode: &str) -> AppResult<SyncResult> {
    let auth = get_drive_auth_status(app)?;
    let workspace_root = load_config(app)?.workspace_root;
    if workspace_root.is_empty() {
        return Err(AppError::from("No hay carpeta de trabajo configurada para sincronizar."));
    }

    if !auth.configured {
        return Err(AppError::from(
            "Las credenciales OAuth locales no estan configuradas en este equipo.",
        ));
    }

    if !auth.connected {
        return Err(AppError::from(
            "No hay una sesion valida de Google Drive en este equipo. Vuelve a conectar Drive.",
        ));
    }

    let access_token = access_token_from_refresh(app)?;
    let paths = resolve_paths(&workspace_root)?;
    let mut sync_state: SyncStateRecord = read_json(&paths.sync_state_file).unwrap_or_default();
    if sync_state.device_id.is_empty() {
        sync_state.device_id = uuid::Uuid::new_v4().to_string();
    }

    let sync_mode = parse_sync_mode(mode);
    let needs_initial_sync_choice = auth.connected
        && !auth.connected_account_email.trim().is_empty()
        && (sync_state.last_sync_at.is_empty() || sync_state.auth_account_email != auth.connected_account_email);
    if needs_initial_sync_choice && sync_mode == SyncMode::Merge {
        return Err(AppError::from(
            "Esta cuenta aun no tiene direccion inicial de sincronizacion. Elige si quieres subir lo local o bajar lo que ya existe en Drive.",
        ));
    }

    let auth_email = fetch_account_email(&access_token).unwrap_or(auth.connected_account_email);
    match sync_mode {
        SyncMode::Push => run_force_push_sync(&access_token, &paths, &mut sync_state, &auth_email),
        SyncMode::Pull => run_force_pull_sync(&access_token, &paths, &mut sync_state, &auth_email),
        SyncMode::Merge => run_merge_sync(&access_token, &paths, &mut sync_state, &auth_email),
    }
}

pub fn resolve_sync_conflict(app: &AppHandle, payload: &ResolveConflictPayload) -> AppResult<SyncResult> {
    let access_token = access_token_from_refresh(app)?;
    let workspace_root = load_config(app)?.workspace_root;
    if workspace_root.is_empty() {
        return Err(AppError::from("No hay carpeta de trabajo configurada."));
    }

    let paths = resolve_paths(&workspace_root)?;
    let mut sync_state: SyncStateRecord = read_json(&paths.sync_state_file).unwrap_or_default();
    let conflict = sync_state
        .pending_conflicts
        .iter()
        .find(|item| item.logical_key == payload.logical_key)
        .cloned()
        .ok_or_else(|| AppError::from("No se encontro el conflicto solicitado."))?;

    let (remote_manifest_file_id, mut remote_manifest) = load_remote_manifest(&access_token)?;
    let current_manifest = build_local_manifest(&paths)?;
    let local = current_manifest
        .entries
        .iter()
        .find(|entry| entry.logical_key == conflict.logical_key);
    let remote = remote_manifest
        .entries
        .iter()
        .find(|entry| entry.logical_key == conflict.logical_key);
    let remote_cloned = remote.cloned();

    match payload.resolution.trim().to_lowercase().as_str() {
        "local" => {
            upload_local_change(
                &access_token,
                &paths,
                &conflict.logical_key,
                local,
                remote_cloned.as_ref(),
                &mut remote_manifest,
            )?;
        }
        "remote" => {
            apply_remote_change(&access_token, &paths, &conflict.logical_key, remote_cloned.as_ref())?;
        }
        _ => return Err(AppError::from("Resolucion de conflicto invalida.")),
    }

    let remote_manifest_file_id = save_remote_manifest(
        &access_token,
        if remote_manifest_file_id.is_empty() {
            None
        } else {
            Some(remote_manifest_file_id.as_str())
        },
        &remote_manifest,
    )?;

    let mut final_local_manifest = build_local_manifest(&paths)?;
    merge_file_ids_from_remote(&mut final_local_manifest, &remote_manifest);
    write_manifest(&paths, &final_local_manifest)?;

    sync_state.remote_manifest_file_id = remote_manifest_file_id;
    sync_state.last_sync_at = now_iso();
    sync_state.last_sync_result = "conflicto resuelto".into();
    sync_state.pending_conflicts = sync_state
        .pending_conflicts
        .into_iter()
        .filter(|item| item.logical_key != conflict.logical_key)
        .collect();
    sync_state.baseline_entries = final_local_manifest
        .entries
        .iter()
        .filter(|entry| !sync_state.pending_conflicts.iter().any(|item| item.logical_key == entry.logical_key))
        .cloned()
        .collect();
    write_json(&paths.sync_state_file, &sync_state)?;

    Ok(SyncResult {
        applied_downloads: if payload.resolution == "remote" { 1 } else { 0 },
        applied_uploads: if payload.resolution == "local" { 1 } else { 0 },
        detected_conflicts: sync_state.pending_conflicts.len(),
        last_sync_at: sync_state.last_sync_at,
        last_sync_result: sync_state.last_sync_result,
        pending_conflicts: sync_state.pending_conflicts,
    })
}

pub fn try_sync_on_lifecycle(app: &AppHandle, reason: &str) {
    let _ = sync_workspace_now(app, reason, "merge");
}

fn run_merge_sync(
    access_token: &str,
    paths: &crate::workspace::WorkspacePaths,
    sync_state: &mut SyncStateRecord,
    auth_email: &str,
) -> AppResult<SyncResult> {
    let current_manifest = build_local_manifest(paths)?;
    let (remote_manifest_file_id, mut remote_manifest) = load_remote_manifest(access_token)?;
    let baseline_map = sync_state
        .baseline_entries
        .iter()
        .cloned()
        .map(|entry| (entry.logical_key.clone(), entry))
        .collect::<BTreeMap<_, _>>();
    let current_map = current_manifest
        .entries
        .iter()
        .cloned()
        .map(|entry| (entry.logical_key.clone(), entry))
        .collect::<BTreeMap<_, _>>();
    let remote_map = remote_manifest
        .entries
        .iter()
        .cloned()
        .map(|entry| (entry.logical_key.clone(), entry))
        .collect::<BTreeMap<_, _>>();

    let mut keys = BTreeSet::new();
    keys.extend(baseline_map.keys().cloned());
    keys.extend(current_map.keys().cloned());
    keys.extend(remote_map.keys().cloned());

    let mut applied_uploads = 0usize;
    let mut applied_downloads = 0usize;
    let mut pending_conflicts = Vec::<SyncConflict>::new();
    let mut remote_dirty = false;

    for logical_key in keys {
        let baseline = baseline_map.get(&logical_key);
        let local = current_map.get(&logical_key);
        let remote = remote_map.get(&logical_key);
        let local_changed = signature(local) != signature(baseline);
        let remote_changed = signature(remote) != signature(baseline);

        if local_changed && remote_changed {
            if signature(local) != signature(remote) {
                pending_conflicts.push(build_conflict(&logical_key, local, remote));
            }
            continue;
        }

        if local_changed && !remote_changed {
            if upload_local_change(access_token, paths, &logical_key, local, remote, &mut remote_manifest)? {
                applied_uploads += 1;
                remote_dirty = true;
            }
            continue;
        }

        if !local_changed && remote_changed {
            if apply_remote_change(access_token, paths, &logical_key, remote)? {
                applied_downloads += 1;
            }
        }
    }

    let remote_manifest_file_id = if remote_dirty {
        save_remote_manifest(
            access_token,
            if remote_manifest_file_id.is_empty() {
                None
            } else {
                Some(remote_manifest_file_id.as_str())
            },
            &remote_manifest,
        )?
    } else {
        remote_manifest_file_id
    };

    finalize_sync(
        paths,
        sync_state,
        auth_email,
        &remote_manifest,
        remote_manifest_file_id,
        pending_conflicts,
        applied_uploads,
        applied_downloads,
        if applied_uploads == 0 && applied_downloads == 0 {
            "sin cambios"
        } else {
            "ok"
        },
    )
}

fn run_force_push_sync(
    access_token: &str,
    paths: &crate::workspace::WorkspacePaths,
    sync_state: &mut SyncStateRecord,
    auth_email: &str,
) -> AppResult<SyncResult> {
    let current_manifest = build_local_manifest(paths)?;
    let current_map = current_manifest
        .entries
        .iter()
        .cloned()
        .map(|entry| (entry.logical_key.clone(), entry))
        .collect::<BTreeMap<_, _>>();
    let (remote_manifest_file_id, mut remote_manifest) = load_remote_manifest(access_token)?;
    let remote_map = remote_manifest
        .entries
        .iter()
        .cloned()
        .map(|entry| (entry.logical_key.clone(), entry))
        .collect::<BTreeMap<_, _>>();

    let mut applied_uploads = 0usize;
    for (logical_key, local_entry) in &current_map {
        if upload_local_change(
            access_token,
            paths,
            logical_key,
            Some(local_entry),
            remote_map.get(logical_key),
            &mut remote_manifest,
        )? {
            applied_uploads += 1;
        }
    }

    let deleted_at = now_iso();
    for (logical_key, remote_entry) in &remote_map {
        if current_map.contains_key(logical_key) {
            continue;
        }

        if !remote_entry.file_id.is_empty() {
            let _ = delete_remote_file(access_token, &remote_entry.file_id);
        }

        upsert_remote_manifest_entry(
            &mut remote_manifest,
            ManifestEntry {
                logical_key: remote_entry.logical_key.clone(),
                hash: String::new(),
                updated_at: deleted_at.clone(),
                deleted_at: deleted_at.clone(),
                file_id: String::new(),
                entity_type: remote_entry.entity_type.clone(),
                entity_id: remote_entry.entity_id.clone(),
            },
        );
    }

    let remote_manifest_file_id = save_remote_manifest(
        access_token,
        if remote_manifest_file_id.is_empty() {
            None
        } else {
            Some(remote_manifest_file_id.as_str())
        },
        &remote_manifest,
    )?;

    finalize_sync(
        paths,
        sync_state,
        auth_email,
        &remote_manifest,
        remote_manifest_file_id,
        Vec::new(),
        applied_uploads,
        0,
        "ok (local -> drive)",
    )
}

fn run_force_pull_sync(
    access_token: &str,
    paths: &crate::workspace::WorkspacePaths,
    sync_state: &mut SyncStateRecord,
    auth_email: &str,
) -> AppResult<SyncResult> {
    let current_manifest = build_local_manifest(paths)?;
    let current_map = current_manifest
        .entries
        .iter()
        .cloned()
        .map(|entry| (entry.logical_key.clone(), entry))
        .collect::<BTreeMap<_, _>>();
    let (remote_manifest_file_id, remote_manifest) = load_remote_manifest(access_token)?;
    let remote_map = remote_manifest
        .entries
        .iter()
        .cloned()
        .map(|entry| (entry.logical_key.clone(), entry))
        .collect::<BTreeMap<_, _>>();

    let remote_has_live_entries = remote_map
        .values()
        .any(|entry| entry.deleted_at.is_empty() && !entry.file_id.is_empty());
    if !remote_has_live_entries {
        return Err(AppError::from(
            "Drive aun no tiene respaldos para descargar con esta cuenta.",
        ));
    }

    let mut applied_downloads = 0usize;
    for remote_entry in remote_map.values() {
        if apply_remote_change(access_token, paths, &remote_entry.logical_key, Some(remote_entry))? {
            applied_downloads += 1;
        }
    }

    for local_entry in current_map.values() {
        if remote_map.contains_key(&local_entry.logical_key) {
            continue;
        }

        let local_path = local_path_for_logical_key(paths, &local_entry.logical_key);
        if local_path.exists() {
            fs::remove_file(local_path)?;
            applied_downloads += 1;
        }
    }

    finalize_sync(
        paths,
        sync_state,
        auth_email,
        &remote_manifest,
        remote_manifest_file_id,
        Vec::new(),
        0,
        applied_downloads,
        "ok (drive -> local)",
    )
}

fn finalize_sync(
    paths: &crate::workspace::WorkspacePaths,
    sync_state: &mut SyncStateRecord,
    auth_email: &str,
    remote_manifest: &ManifestRecord,
    remote_manifest_file_id: String,
    pending_conflicts: Vec<SyncConflict>,
    applied_uploads: usize,
    applied_downloads: usize,
    last_sync_result: &str,
) -> AppResult<SyncResult> {
    let mut final_local_manifest = build_local_manifest(paths)?;
    merge_file_ids_from_remote(&mut final_local_manifest, remote_manifest);
    write_manifest(paths, &final_local_manifest)?;

    sync_state.remote_manifest_file_id = remote_manifest_file_id;
    sync_state.auth_account_email = auth_email.to_string();
    sync_state.last_sync_at = now_iso();
    sync_state.last_sync_result = last_sync_result.to_string();
    sync_state.pending_conflicts = pending_conflicts.clone();
    sync_state.baseline_entries = final_local_manifest
        .entries
        .iter()
        .filter(|entry| !pending_conflicts.iter().any(|conflict| conflict.logical_key == entry.logical_key))
        .cloned()
        .collect();
    write_json(&paths.sync_state_file, sync_state)?;

    Ok(SyncResult {
        applied_downloads,
        applied_uploads,
        detected_conflicts: pending_conflicts.len(),
        last_sync_at: sync_state.last_sync_at.clone(),
        last_sync_result: sync_state.last_sync_result.clone(),
        pending_conflicts,
    })
}

fn upload_local_change(
    access_token: &str,
    paths: &crate::workspace::WorkspacePaths,
    logical_key: &str,
    local: Option<&ManifestEntry>,
    remote: Option<&ManifestEntry>,
    remote_manifest: &mut ManifestRecord,
) -> AppResult<bool> {
    let Some(local) = local else {
        return Ok(false);
    };

    if !local.deleted_at.is_empty() {
        if let Some(remote) = remote {
            if !remote.file_id.is_empty() {
                let _ = delete_remote_file(access_token, &remote.file_id);
            }
        }
        upsert_remote_manifest_entry(
            remote_manifest,
            ManifestEntry {
                file_id: String::new(),
                ..local.clone()
            },
        );
        return Ok(true);
    }

    let path = local_path_for_logical_key(paths, logical_key);
    let bytes = fs::read(path)?;
    let existing_file_id = remote.and_then(|entry| (!entry.file_id.is_empty()).then_some(entry.file_id.as_str()));
    let file_id = upload_logical_file(access_token, logical_key, existing_file_id, &bytes)?;
    upsert_remote_manifest_entry(
        remote_manifest,
        ManifestEntry {
            file_id,
            ..local.clone()
        },
    );
    Ok(true)
}

fn apply_remote_change(
    access_token: &str,
    paths: &crate::workspace::WorkspacePaths,
    logical_key: &str,
    remote: Option<&ManifestEntry>,
) -> AppResult<bool> {
    let Some(remote) = remote else {
        return Ok(false);
    };

    let path = local_path_for_logical_key(paths, logical_key);
    if !remote.deleted_at.is_empty() {
        if path.exists() {
            fs::remove_file(path)?;
        }
        return Ok(true);
    }

    if remote.file_id.is_empty() {
        return Ok(false);
    }

    let bytes = download_logical_file(access_token, &remote.file_id)?;
    ensure_parent_dir(&path)?;
    fs::write(path, bytes)?;
    Ok(true)
}

fn upsert_remote_manifest_entry(remote_manifest: &mut ManifestRecord, entry: ManifestEntry) {
    match remote_manifest
        .entries
        .iter()
        .position(|item| item.logical_key == entry.logical_key)
    {
        Some(index) => remote_manifest.entries[index] = entry,
        None => remote_manifest.entries.push(entry),
    }

    remote_manifest
        .entries
        .sort_by(|left, right| left.logical_key.cmp(&right.logical_key));
}

fn merge_file_ids_from_remote(local_manifest: &mut ManifestRecord, remote_manifest: &ManifestRecord) {
    let remote_map = remote_manifest
        .entries
        .iter()
        .map(|entry| (entry.logical_key.clone(), entry.file_id.clone()))
        .collect::<BTreeMap<_, _>>();

    for entry in &mut local_manifest.entries {
        if let Some(file_id) = remote_map.get(&entry.logical_key) {
            entry.file_id = file_id.clone();
        }
    }
}

fn parse_sync_mode(mode: &str) -> SyncMode {
    match mode.trim().to_lowercase().as_str() {
        "push" => SyncMode::Push,
        "pull" => SyncMode::Pull,
        _ => SyncMode::Merge,
    }
}
