fn main() {
    let _ = dotenvy::from_filename("../.env");

    println!("cargo:rerun-if-changed=../.env");
    println!("cargo:rerun-if-env-changed=APP_UPDATE_ENDPOINT");
    println!("cargo:rerun-if-env-changed=TAURI_UPDATER_PUBLIC_KEY");

    if let Ok(endpoint) = std::env::var("APP_UPDATE_ENDPOINT") {
        println!("cargo:rustc-env=APP_UPDATE_ENDPOINT={endpoint}");
    }

    if let Ok(public_key) = std::env::var("TAURI_UPDATER_PUBLIC_KEY") {
        println!("cargo:rustc-env=TAURI_UPDATER_PUBLIC_KEY={public_key}");
    }

    tauri_build::build()
}
