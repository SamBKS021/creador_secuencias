use tauri::Manager;

mod commands;
mod drive_auth;
mod drive_client;
mod errors;
mod export;
mod importer;
mod models;
mod repository;
mod sync;
mod sync_manifest;
mod workspace;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.maximize();
                let _ = window.show();
                let _ = window.set_focus();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_workspace_config,
            commands::get_song_categories,
            commands::save_song_categories,
            commands::save_motion_mode,
            commands::get_drive_auth_status,
            commands::connect_google_drive,
            commands::disconnect_google_drive,
            commands::get_sync_status,
            commands::sync_workspace_now,
            commands::resolve_sync_conflict,
            commands::exit_application,
            commands::minimize_main_window,
            commands::toggle_maximize_main_window,
            commands::close_main_window,
            commands::select_workspace_root,
            commands::bootstrap_app,
            commands::open_song_files,
            commands::import_song_docx_batch,
            commands::save_song,
            commands::update_song,
            commands::save_sequence,
            commands::delete_sequence,
            commands::delete_song,
            commands::check_sequence_docx_export,
            commands::get_sequence_export_statuses,
            commands::open_exported_sequence_docx,
            commands::export_sequence_docx,
            commands::open_exports_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
