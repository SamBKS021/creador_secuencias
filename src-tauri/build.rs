use std::fs;
use std::path::PathBuf;

fn main() {
    let _ = dotenvy::from_filename("../.env");

    println!("cargo:rerun-if-changed=../.env");
    println!("cargo:rerun-if-env-changed=APP_UPDATE_ENDPOINT");
    println!("cargo:rerun-if-env-changed=TAURI_UPDATER_PUBLIC_KEY");
    println!("cargo:rerun-if-env-changed=GOOGLE_DRIVE_CLIENT_ID");
    println!("cargo:rerun-if-env-changed=GOOGLE_DRIVE_CLIENT_SECRET");

    if let Ok(endpoint) = std::env::var("APP_UPDATE_ENDPOINT") {
        println!("cargo:rustc-env=APP_UPDATE_ENDPOINT={endpoint}");
    }

    if let Ok(public_key) = std::env::var("TAURI_UPDATER_PUBLIC_KEY") {
        println!("cargo:rustc-env=TAURI_UPDATER_PUBLIC_KEY={public_key}");
    }

    if let Ok(client_id) = std::env::var("GOOGLE_DRIVE_CLIENT_ID") {
        println!("cargo:rustc-env=GOOGLE_DRIVE_CLIENT_ID={client_id}");
    }

    if let Ok(client_secret) = std::env::var("GOOGLE_DRIVE_CLIENT_SECRET") {
        println!("cargo:rustc-env=GOOGLE_DRIVE_CLIENT_SECRET={client_secret}");
    }

    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."));
    let oauth_defaults_path = manifest_dir.join("oauth.defaults.json");
    let client_id = std::env::var("GOOGLE_DRIVE_CLIENT_ID").unwrap_or_default();
    let client_secret = std::env::var("GOOGLE_DRIVE_CLIENT_SECRET").unwrap_or_default();

    if !client_id.trim().is_empty() && !client_secret.trim().is_empty() {
        let oauth_defaults = serde_json::json!({
            "clientId": client_id,
            "clientSecret": client_secret,
        });
        let _ = fs::write(
            &oauth_defaults_path,
            serde_json::to_string_pretty(&oauth_defaults).unwrap_or_else(|_| "{}".into()),
        );
    } else if !oauth_defaults_path.exists() {
        let _ = fs::write(&oauth_defaults_path, "{}");
    }

    println!("cargo:rerun-if-changed={}", oauth_defaults_path.display());

    tauri_build::build()
}
