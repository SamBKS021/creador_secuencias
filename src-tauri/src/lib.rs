mod commands;
mod errors;
mod export;
mod importer;
mod models;
mod repository;
mod workspace;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_workspace_config,
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
