use std::env;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::time::Duration;

use keyring::Entry;
use reqwest::blocking::Client;
use reqwest::Url;
use serde::Deserialize;
use tauri::AppHandle;

use crate::drive_client::fetch_account_email;
use crate::errors::{AppError, AppResult};
use crate::models::{DriveAuthStatus, OAuthLocalConfig};
use crate::workspace::{load_oauth_config, save_oauth_config};

const TOKEN_SERVICE: &str = "creador_de_secuencias_google_drive";
const TOKEN_USERNAME: &str = "refresh_token";
const AUTH_SCOPE: &str =
    "https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email";

#[derive(Debug, Deserialize)]
struct TokenResponse {
    #[serde(default)]
    access_token: String,
    #[serde(default)]
    refresh_token: String,
}

pub fn get_drive_auth_status(app: &AppHandle) -> AppResult<DriveAuthStatus> {
    let oauth_config = load_or_seed_oauth_config(app)?;
    let refresh_token = load_refresh_token(app).ok().filter(|value| !value.is_empty());

    Ok(DriveAuthStatus {
        configured: !oauth_config.client_id.is_empty() && !oauth_config.client_secret.is_empty(),
        connected: refresh_token.is_some(),
        connected_account_email: oauth_config.connected_account_email,
    })
}

pub fn connect_google_drive(app: &AppHandle) -> AppResult<DriveAuthStatus> {
    let mut oauth_config = load_or_seed_oauth_config(app)?;
    if oauth_config.client_id.is_empty() || oauth_config.client_secret.is_empty() {
        return Err(AppError::from(
            "No se encontraron credenciales OAuth locales. Configura GOOGLE_DRIVE_CLIENT_ID y GOOGLE_DRIVE_CLIENT_SECRET.",
        ));
    }

    let (code, redirect_uri) = wait_for_oauth_code(&oauth_config.client_id)?;
    let token = exchange_authorization_code(&oauth_config, &code, &redirect_uri)?;
    let refresh_token = if token.refresh_token.is_empty() {
        load_refresh_token(app).unwrap_or_default()
    } else {
        token.refresh_token
    };

    if refresh_token.is_empty() {
        return Err(AppError::from("Google no devolvio refresh token para esta autorizacion."));
    }

    save_refresh_token(app, &refresh_token)?;
    let email = fetch_account_email(&token.access_token)?;
    oauth_config.connected_account_email = email;
    oauth_config.refresh_token_cache = refresh_token;
    save_oauth_config(app, &oauth_config)?;

    get_drive_auth_status(app)
}

pub fn disconnect_google_drive(app: &AppHandle) -> AppResult<DriveAuthStatus> {
    let mut oauth_config = load_or_seed_oauth_config(app)?;
    oauth_config.connected_account_email.clear();
    oauth_config.refresh_token_cache.clear();
    save_oauth_config(app, &oauth_config)?;
    clear_refresh_token(app)?;
    get_drive_auth_status(app)
}

pub fn access_token_from_refresh(app: &AppHandle) -> AppResult<String> {
    let oauth_config = load_or_seed_oauth_config(app)?;
    let refresh_token = load_refresh_token(app).map_err(|_| {
        AppError::from("No hay una sesion valida de Google Drive en este equipo. Vuelve a conectar Drive.")
    })?;
    let token = refresh_access_token(&oauth_config, &refresh_token)?;
    Ok(token.access_token)
}

fn load_or_seed_oauth_config(app: &AppHandle) -> AppResult<OAuthLocalConfig> {
    let mut oauth_config = load_oauth_config(app)?;
    if !oauth_config.client_id.is_empty() && !oauth_config.client_secret.is_empty() {
        return Ok(oauth_config);
    }

    dotenvy::dotenv().ok();
    let client_id = env::var("GOOGLE_DRIVE_CLIENT_ID").unwrap_or_default();
    let client_secret = env::var("GOOGLE_DRIVE_CLIENT_SECRET").unwrap_or_default();

    if client_id.is_empty() || client_secret.is_empty() {
        return Ok(oauth_config);
    }

    oauth_config.client_id = client_id;
    oauth_config.client_secret = client_secret;
    save_oauth_config(app, &oauth_config)?;
    Ok(oauth_config)
}

fn wait_for_oauth_code(client_id: &str) -> AppResult<(String, String)> {
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|error| AppError::from(error.to_string().as_str()))?;
    listener
        .set_nonblocking(false)
        .map_err(|error| AppError::from(error.to_string().as_str()))?;
    let port = listener
        .local_addr()
        .map_err(|error| AppError::from(error.to_string().as_str()))?
        .port();
    let redirect_uri = format!("http://127.0.0.1:{port}");

    let mut auth_url = Url::parse("https://accounts.google.com/o/oauth2/v2/auth")
        .map_err(|error| AppError::from(error.to_string().as_str()))?;
    auth_url
        .query_pairs_mut()
        .append_pair("client_id", client_id)
        .append_pair("redirect_uri", &redirect_uri)
        .append_pair("response_type", "code")
        .append_pair("scope", AUTH_SCOPE)
        .append_pair("access_type", "offline")
        .append_pair("prompt", "consent");

    open::that_detached(auth_url.as_str()).map_err(|error| AppError::from(error.to_string().as_str()))?;

    let (mut stream, _) = listener
        .accept()
        .map_err(|error| AppError::from(error.to_string().as_str()))?;
    stream
        .set_read_timeout(Some(Duration::from_secs(120)))
        .map_err(|error| AppError::from(error.to_string().as_str()))?;

    let mut buffer = [0u8; 4096];
    let size = stream
        .read(&mut buffer)
        .map_err(|error| AppError::from(error.to_string().as_str()))?;
    let request = String::from_utf8_lossy(&buffer[..size]);
    let first_line = request.lines().next().unwrap_or_default();
    let path = first_line.split_whitespace().nth(1).unwrap_or("/");
    let url = Url::parse(&format!("http://localhost{path}")).map_err(|error| AppError::from(error.to_string().as_str()))?;
    let code = url
        .query_pairs()
        .find(|(key, _)| key == "code")
        .map(|(_, value)| value.to_string())
        .unwrap_or_default();

    let response = "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\n\r\n<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Drive conectado</title><style>:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Inter,Segoe UI,sans-serif;background:radial-gradient(circle at top left,rgba(171,200,245,.26),transparent 30%),radial-gradient(circle at bottom right,rgba(0,36,70,.08),transparent 24%),linear-gradient(180deg,#fbfcfe 0%,#f5f8fc 36%,#edf2f8 100%);color:#191c1e}main{width:min(620px,calc(100vw - 32px));background:rgba(255,255,255,.95);border:1px solid rgba(67,71,78,.1);border-radius:32px;padding:36px;box-shadow:0 36px 90px -34px rgba(0,36,70,.34)}.eyebrow{margin:0 0 12px;font-size:12px;font-weight:800;letter-spacing:.3em;text-transform:uppercase;color:#6f7680}.title{margin:0;font-family:Manrope,Inter,Segoe UI,sans-serif;font-size:40px;line-height:1.02;font-weight:800;color:#002446}.desc{margin:16px 0 0;font-size:17px;line-height:1.75;color:#43474e}.badge{margin-top:26px;display:inline-flex;align-items:center;gap:10px;padding:11px 16px;border-radius:999px;background:#e8f3ff;color:#0b4f87;font-weight:800}.dot{width:11px;height:11px;border-radius:999px;background:#1a73e8;box-shadow:0 0 0 6px rgba(26,115,232,.14)}.line{margin-top:26px;height:1px;background:linear-gradient(90deg,rgba(0,36,70,.14),rgba(0,36,70,0))}.hint{margin-top:22px;font-size:14px;line-height:1.7;color:#5a6069}</style></head><body><main><p class=\"eyebrow\">Google Drive</p><h1 class=\"title\">Cuenta vinculada correctamente</h1><p class=\"desc\">La autorizacion termino bien. Ya puedes volver a la aplicacion para continuar con la sincronizacion de este equipo.</p><div class=\"badge\"><span class=\"dot\"></span>Conexion lista</div><div class=\"line\"></div><p class=\"hint\">Cerraremos esta pestana automaticamente en un momento. Si no ocurre, puedes cerrarla manualmente.</p></main><script>try{history.replaceState({},'', '/drive-conectado')}catch(_){}setTimeout(()=>{window.close()},1200)</script></body></html>";
    stream
        .write_all(response.as_bytes())
        .map_err(|error| AppError::from(error.to_string().as_str()))?;

    if code.is_empty() {
        return Err(AppError::from("No se recibio codigo de autorizacion desde Google."));
    }

    Ok((code, redirect_uri))
}

fn exchange_authorization_code(config: &OAuthLocalConfig, code: &str, redirect_uri: &str) -> AppResult<TokenResponse> {
    let client = Client::builder()
        .build()
        .map_err(|error| AppError::from(error.to_string().as_str()))?;

    client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("client_id", config.client_id.as_str()),
            ("client_secret", config.client_secret.as_str()),
            ("code", code),
            ("grant_type", "authorization_code"),
            ("redirect_uri", redirect_uri),
        ])
        .send()
        .map_err(|error| AppError::from(error.to_string().as_str()))?
        .error_for_status()
        .map_err(|error| AppError::from(error.to_string().as_str()))?
        .json::<TokenResponse>()
        .map_err(|error| AppError::from(error.to_string().as_str()))
}

fn refresh_access_token(config: &OAuthLocalConfig, refresh_token: &str) -> AppResult<TokenResponse> {
    let client = Client::builder()
        .build()
        .map_err(|error| AppError::from(error.to_string().as_str()))?;

    client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("client_id", config.client_id.as_str()),
            ("client_secret", config.client_secret.as_str()),
            ("refresh_token", refresh_token),
            ("grant_type", "refresh_token"),
        ])
        .send()
        .map_err(|error| AppError::from(error.to_string().as_str()))?
        .error_for_status()
        .map_err(|error| AppError::from(error.to_string().as_str()))?
        .json::<TokenResponse>()
        .map_err(|error| AppError::from(error.to_string().as_str()))
}

fn save_refresh_token(app: &AppHandle, value: &str) -> AppResult<()> {
    let mut oauth_config = load_or_seed_oauth_config(app)?;
    oauth_config.refresh_token_cache = value.to_string();
    save_oauth_config(app, &oauth_config)?;

    if let Ok(entry) = Entry::new(TOKEN_SERVICE, TOKEN_USERNAME) {
        let _ = entry.set_password(value);
    }

    Ok(())
}

fn load_refresh_token(app: &AppHandle) -> AppResult<String> {
    if let Ok(entry) = Entry::new(TOKEN_SERVICE, TOKEN_USERNAME) {
        if let Ok(password) = entry.get_password() {
            if !password.trim().is_empty() {
                return Ok(password);
            }
        }
    }

    let oauth_config = load_or_seed_oauth_config(app)?;
    if !oauth_config.refresh_token_cache.trim().is_empty() {
        return Ok(oauth_config.refresh_token_cache);
    }

    Err(AppError::from("No hay refresh token disponible."))
}

fn clear_refresh_token(app: &AppHandle) -> AppResult<()> {
    if let Ok(entry) = Entry::new(TOKEN_SERVICE, TOKEN_USERNAME) {
        let _ = entry.delete_credential();
    }

    let mut oauth_config = load_or_seed_oauth_config(app)?;
    oauth_config.refresh_token_cache.clear();
    save_oauth_config(app, &oauth_config)?;
    Ok(())
}
