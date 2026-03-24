use std::fs;
use std::path::PathBuf;

fn main() {
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."));
    let workspace_env_path = manifest_dir
        .parent()
        .map(|path| path.join(".env"))
        .unwrap_or_else(|| PathBuf::from(".env"));

    let _ = dotenvy::from_path(&workspace_env_path);

    println!("cargo:rerun-if-changed={}", workspace_env_path.display());
    println!("cargo:rerun-if-env-changed=APP_UPDATE_ENDPOINT");
    println!("cargo:rerun-if-env-changed=TAURI_UPDATER_PUBLIC_KEY");
    println!("cargo:rerun-if-env-changed=GOOGLE_DRIVE_CLIENT_ID");
    println!("cargo:rerun-if-env-changed=GOOGLE_DRIVE_CLIENT_SECRET");
    println!("cargo:rerun-if-env-changed=SMTP_HOST");
    println!("cargo:rerun-if-env-changed=SMTP_PORT");
    println!("cargo:rerun-if-env-changed=SMTP_USERNAME");
    println!("cargo:rerun-if-env-changed=SMTP_APP_PASSWORD");
    println!("cargo:rerun-if-env-changed=SUPPORT_FROM_EMAIL");
    println!("cargo:rerun-if-env-changed=SUPPORT_TO_EMAIL");
    println!("cargo:rerun-if-env-changed=SUPPORT_FROM_NAME");

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

    if let Ok(smtp_host) = std::env::var("SMTP_HOST") {
        println!("cargo:rustc-env=SMTP_HOST={smtp_host}");
    }

    if let Ok(smtp_port) = std::env::var("SMTP_PORT") {
        println!("cargo:rustc-env=SMTP_PORT={smtp_port}");
    }

    if let Ok(smtp_username) = std::env::var("SMTP_USERNAME") {
        println!("cargo:rustc-env=SMTP_USERNAME={smtp_username}");
    }

    if let Ok(smtp_app_password) = std::env::var("SMTP_APP_PASSWORD") {
        println!("cargo:rustc-env=SMTP_APP_PASSWORD={smtp_app_password}");
    }

    if let Ok(support_from_email) = std::env::var("SUPPORT_FROM_EMAIL") {
        println!("cargo:rustc-env=SUPPORT_FROM_EMAIL={support_from_email}");
    }

    if let Ok(support_to_email) = std::env::var("SUPPORT_TO_EMAIL") {
        println!("cargo:rustc-env=SUPPORT_TO_EMAIL={support_to_email}");
    }

    if let Ok(support_from_name) = std::env::var("SUPPORT_FROM_NAME") {
        println!("cargo:rustc-env=SUPPORT_FROM_NAME={support_from_name}");
    }

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
