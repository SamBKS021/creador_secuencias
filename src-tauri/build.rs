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

    tauri_build::build()
}
