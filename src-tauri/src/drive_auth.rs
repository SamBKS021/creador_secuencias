use std::io::{ErrorKind, Read, Write};
use std::net::TcpListener;
use std::time::{Duration, Instant};

use keyring::Entry;
use reqwest::blocking::Client;
use reqwest::Url;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Manager};
use uuid::Uuid;

use crate::drive_client::fetch_account_email;
use crate::errors::{AppError, AppResult};
use crate::models::{DriveAuthStatus, OAuthLocalConfig};
use crate::workspace::{load_oauth_config, save_oauth_config};

const BUNDLED_OAUTH_DEFAULTS: &str =
    include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/oauth.defaults.json"));
const TOKEN_SERVICE: &str = "creador_de_secuencias_google_drive";
const TOKEN_USERNAME: &str = "refresh_token";
const AUTH_SCOPE: &str =
    "https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email";
const OAUTH_TIMEOUT: Duration = Duration::from_secs(180);

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
        configured: !oauth_config.client_id.trim().is_empty(),
        connected: refresh_token.is_some(),
        connected_account_email: oauth_config.connected_account_email,
    })
}

pub fn connect_google_drive(app: &AppHandle) -> AppResult<DriveAuthStatus> {
    let mut oauth_config = load_or_seed_oauth_config(app)?;
    if oauth_config.client_id.trim().is_empty() {
        return Err(AppError::from(
            "No se encontro GOOGLE_DRIVE_CLIENT_ID. Configura el identificador OAuth antes de conectar Drive.",
        ));
    }

    let state = generate_random_token();
    let code_verifier = generate_random_token();
    let code_challenge = pkce_challenge(&code_verifier);
    let (code, redirect_uri) = wait_for_oauth_code(&oauth_config.client_id, &state, &code_challenge)?;
    let token = exchange_authorization_code(&oauth_config, &code, &redirect_uri, &code_verifier)?;
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
    oauth_config.refresh_token_cache.clear();
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
    let mut dirty = false;

    if oauth_config.client_id.trim().is_empty() {
        if let Some(client_id) = option_env!("GOOGLE_DRIVE_CLIENT_ID")
            .map(str::trim)
            .filter(|value| !value.is_empty())
        {
            oauth_config.client_id = client_id.to_string();
            dirty = true;
        } else if let Some(bundled) = load_embedded_oauth_config() {
            oauth_config.client_id = bundled.client_id;
            dirty = true;
        } else if let Some(bundled) = load_bundled_oauth_config(app)? {
            oauth_config.client_id = bundled.client_id;
            dirty = true;
        }
    }

    if oauth_config.client_secret.trim().is_empty() {
        if let Ok(runtime_secret) = std::env::var("GOOGLE_DRIVE_CLIENT_SECRET") {
            let trimmed = runtime_secret.trim();
            if !trimmed.is_empty() {
                oauth_config.client_secret = trimmed.to_string();
            }
        }
    }

    if dirty {
        save_oauth_config(app, &oauth_config)?;
    }

    Ok(oauth_config)
}

fn load_embedded_oauth_config() -> Option<OAuthLocalConfig> {
    let config = parse_oauth_defaults_json(BUNDLED_OAUTH_DEFAULTS)?;
    if config.client_id.trim().is_empty() {
        return None;
    }

    Some(config)
}

fn load_bundled_oauth_config(app: &AppHandle) -> AppResult<Option<OAuthLocalConfig>> {
    let Some(resource_dir) = app.path().resource_dir().ok() else {
        return Ok(None);
    };

    let path = resource_dir.join("oauth.defaults.json");
    if !path.exists() {
        return Ok(None);
    }

    let raw = std::fs::read_to_string(path).map_err(|error| AppError::from(error.to_string().as_str()))?;
    let Some(config) = parse_oauth_defaults_json(&raw) else {
        return Ok(None);
    };

    if config.client_id.trim().is_empty() {
        return Ok(None);
    }

    Ok(Some(config))
}

fn parse_oauth_defaults_json(raw: &str) -> Option<OAuthLocalConfig> {
    let sanitized = raw.trim().trim_start_matches('\u{feff}');
    if sanitized.is_empty() || sanitized == "{}" {
        return None;
    }

    serde_json::from_str::<OAuthLocalConfig>(sanitized).ok()
}

fn generate_random_token() -> String {
    format!("{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple())
}

fn pkce_challenge(verifier: &str) -> String {
    let digest = Sha256::digest(verifier.as_bytes());
    base64_url_encode(&digest)
}

fn base64_url_encode(input: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let mut out = String::with_capacity((input.len() * 4).div_ceil(3));

    for chunk in input.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = chunk.get(1).copied().unwrap_or(0) as u32;
        let b2 = chunk.get(2).copied().unwrap_or(0) as u32;
        let triple = (b0 << 16) | (b1 << 8) | b2;

        out.push(TABLE[((triple >> 18) & 0x3F) as usize] as char);
        out.push(TABLE[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 {
            out.push(TABLE[((triple >> 6) & 0x3F) as usize] as char);
        }
        if chunk.len() > 2 {
            out.push(TABLE[(triple & 0x3F) as usize] as char);
        }
    }

    out
}

fn write_http_response(stream: &mut impl Write, status: &str, content_type: &str, body: &str) {
    let response = format!(
        "HTTP/1.1 {status}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    let _ = stream.write_all(response.as_bytes());
    let _ = stream.flush();
}

fn wait_for_oauth_code(client_id: &str, expected_state: &str, code_challenge: &str) -> AppResult<(String, String)> {
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|error| AppError::from(error.to_string().as_str()))?;
    listener
        .set_nonblocking(true)
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
        .append_pair("prompt", "consent")
        .append_pair("state", expected_state)
        .append_pair("code_challenge", code_challenge)
        .append_pair("code_challenge_method", "S256");

    open::that_detached(auth_url.as_str()).map_err(|error| AppError::from(error.to_string().as_str()))?;

    let deadline = Instant::now() + OAUTH_TIMEOUT;
    loop {
        match listener.accept() {
            Ok((mut stream, _)) => {
                let _ = stream.set_nonblocking(false);
                let _ = stream.set_read_timeout(Some(Duration::from_secs(10)));

                let mut buffer = [0u8; 4096];
                let size = match stream.read(&mut buffer) {
                    Ok(size) if size > 0 => size,
                    _ => continue,
                };

                let request = String::from_utf8_lossy(&buffer[..size]);
                let first_line = request.lines().next().unwrap_or_default();
                let path = first_line.split_whitespace().nth(1).unwrap_or("/");
                if path.starts_with("/favicon.ico") {
                    write_http_response(&mut stream, "404 Not Found", "text/plain; charset=utf-8", "");
                    continue;
                }

                let Ok(url) = Url::parse(&format!("http://localhost{path}")) else {
                    write_http_response(&mut stream, "400 Bad Request", "text/plain; charset=utf-8", "Solicitud invalida");
                    continue;
                };

                let mut code = String::new();
                let mut state = String::new();
                let mut oauth_error = String::new();

                for (key, value) in url.query_pairs() {
                    match key.as_ref() {
                        "code" => code = value.into_owned(),
                        "state" => state = value.into_owned(),
                        "error" => oauth_error = value.into_owned(),
                        _ => {}
                    }
                }

                if code.is_empty() && oauth_error.is_empty() {
                    write_http_response(&mut stream, "404 Not Found", "text/plain; charset=utf-8", "");
                    continue;
                }

                if state != expected_state {
                    write_http_response(
                        &mut stream,
                        "400 Bad Request",
                        "text/plain; charset=utf-8",
                        "Estado OAuth invalido.",
                    );
                    return Err(AppError::from(
                        "La respuesta de autorizacion OAuth no coincide con la sesion iniciada.",
                    ));
                }

                if !oauth_error.is_empty() {
                    write_http_response(
                        &mut stream,
                        "400 Bad Request",
                        "text/html; charset=utf-8",
                        "<!doctype html><html lang=\"es\"><meta charset=\"utf-8\"><body><h1>Autorizacion cancelada</h1><p>Puedes cerrar esta pestana y volver a la aplicacion.</p></body></html>",
                    );
                    return Err(AppError::from(format!(
                        "Google no completo la autorizacion ({oauth_error})."
                    )));
                }

                let success_body = "<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Drive conectado</title><style>:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Inter,Segoe UI,sans-serif;background:radial-gradient(circle at top left,rgba(171,200,245,.26),transparent 30%),radial-gradient(circle at bottom right,rgba(0,36,70,.08),transparent 24%),linear-gradient(180deg,#fbfcfe 0%,#f5f8fc 36%,#edf2f8 100%);color:#191c1e}main{width:min(620px,calc(100vw - 32px));background:rgba(255,255,255,.95);border:1px solid rgba(67,71,78,.1);border-radius:32px;padding:36px;box-shadow:0 36px 90px -34px rgba(0,36,70,.34)}.eyebrow{margin:0 0 12px;font-size:12px;font-weight:800;letter-spacing:.3em;text-transform:uppercase;color:#6f7680}.title{margin:0;font-family:Manrope,Inter,Segoe UI,sans-serif;font-size:40px;line-height:1.02;font-weight:800;color:#002446}.desc{margin:16px 0 0;font-size:17px;line-height:1.75;color:#43474e}.badge{margin-top:26px;display:inline-flex;align-items:center;gap:10px;padding:11px 16px;border-radius:999px;background:#e8f3ff;color:#0b4f87;font-weight:800}.dot{width:11px;height:11px;border-radius:999px;background:#1a73e8;box-shadow:0 0 0 6px rgba(26,115,232,.14)}.line{margin-top:26px;height:1px;background:linear-gradient(90deg,rgba(0,36,70,.14),rgba(0,36,70,0))}.hint{margin-top:22px;font-size:14px;line-height:1.7;color:#5a6069}</style></head><body><main><p class=\"eyebrow\">Google Drive</p><h1 class=\"title\">Cuenta vinculada correctamente</h1><p class=\"desc\">La autorizacion termino bien. Ya puedes volver a la aplicacion para continuar con la sincronizacion de este equipo.</p><div class=\"badge\"><span class=\"dot\"></span>Conexion lista</div><div class=\"line\"></div><p class=\"hint\">Cerraremos esta pestana automaticamente en un momento. Si no ocurre, puedes cerrarla manualmente.</p></main><script>try{history.replaceState({},'', '/drive-conectado')}catch(_){}setTimeout(()=>{window.close()},1200)</script></body></html>";
                write_http_response(&mut stream, "200 OK", "text/html; charset=utf-8", success_body);
                return Ok((code, redirect_uri));
            }
            Err(error) if error.kind() == ErrorKind::WouldBlock => {
                if Instant::now() >= deadline {
                    return Err(AppError::from(
                        "Tiempo de espera agotado esperando la autorizacion de Google Drive.",
                    ));
                }
                std::thread::sleep(Duration::from_millis(50));
            }
            Err(error) => return Err(AppError::from(error.to_string().as_str())),
        }
    }
}

fn oauth_http_client() -> AppResult<Client> {
    Client::builder()
        .connect_timeout(Duration::from_secs(10))
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|error| AppError::from(error.to_string().as_str()))
}

fn exchange_authorization_code(
    config: &OAuthLocalConfig,
    code: &str,
    redirect_uri: &str,
    code_verifier: &str,
) -> AppResult<TokenResponse> {
    let client = oauth_http_client()?;
    let mut params = vec![
        ("client_id", config.client_id.as_str()),
        ("code", code),
        ("grant_type", "authorization_code"),
        ("redirect_uri", redirect_uri),
        ("code_verifier", code_verifier),
    ];
    if !config.client_secret.trim().is_empty() {
        params.push(("client_secret", config.client_secret.trim()));
    }

    client
        .post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .map_err(|error| AppError::from(error.to_string().as_str()))?
        .error_for_status()
        .map_err(|error| AppError::from(error.to_string().as_str()))?
        .json::<TokenResponse>()
        .map_err(|error| AppError::from(error.to_string().as_str()))
}

fn refresh_access_token(config: &OAuthLocalConfig, refresh_token: &str) -> AppResult<TokenResponse> {
    let client = oauth_http_client()?;
    let mut params = vec![
        ("client_id", config.client_id.as_str()),
        ("refresh_token", refresh_token),
        ("grant_type", "refresh_token"),
    ];
    if !config.client_secret.trim().is_empty() {
        params.push(("client_secret", config.client_secret.trim()));
    }

    client
        .post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .map_err(|error| AppError::from(error.to_string().as_str()))?
        .error_for_status()
        .map_err(|error| AppError::from(error.to_string().as_str()))?
        .json::<TokenResponse>()
        .map_err(|error| AppError::from(error.to_string().as_str()))
}

fn save_refresh_token(app: &AppHandle, value: &str) -> AppResult<()> {
    let entry = Entry::new(TOKEN_SERVICE, TOKEN_USERNAME)
        .map_err(|error| AppError::from(format!("No se pudo acceder al almacen seguro del sistema: {error}")))?;
    entry
        .set_password(value)
        .map_err(|error| AppError::from(format!("No se pudo guardar la sesion en el almacen seguro: {error}")))?;

    let mut oauth_config = load_oauth_config(app)?;
    if !oauth_config.refresh_token_cache.is_empty() {
        oauth_config.refresh_token_cache.clear();
        save_oauth_config(app, &oauth_config)?;
    }

    Ok(())
}

fn load_refresh_token(app: &AppHandle) -> AppResult<String> {
    let mut oauth_config = load_oauth_config(app)?;
    let entry = Entry::new(TOKEN_SERVICE, TOKEN_USERNAME).ok();

    if let Some(entry) = &entry {
        if let Ok(password) = entry.get_password() {
            if !password.trim().is_empty() {
                if !oauth_config.refresh_token_cache.is_empty() {
                    oauth_config.refresh_token_cache.clear();
                    let _ = save_oauth_config(app, &oauth_config);
                }
                return Ok(password);
            }
        }
    }

    let legacy_token = oauth_config.refresh_token_cache.trim().to_string();
    if !legacy_token.is_empty() {
        let entry = entry.ok_or_else(|| {
            AppError::from("No se pudo acceder al almacen seguro del sistema para migrar el token.")
        })?;
        entry.set_password(&legacy_token).map_err(|error| {
            AppError::from(format!("No se pudo migrar el token al almacen seguro: {error}"))
        })?;
        oauth_config.refresh_token_cache.clear();
        save_oauth_config(app, &oauth_config)?;
        return Ok(legacy_token);
    }

    Err(AppError::from("No hay refresh token disponible."))
}

fn clear_refresh_token(app: &AppHandle) -> AppResult<()> {
    if let Ok(entry) = Entry::new(TOKEN_SERVICE, TOKEN_USERNAME) {
        let _ = entry.delete_credential();
    }

    let mut oauth_config = load_oauth_config(app)?;
    if !oauth_config.refresh_token_cache.is_empty() {
        oauth_config.refresh_token_cache.clear();
        save_oauth_config(app, &oauth_config)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{base64_url_encode, pkce_challenge};

    #[test]
    fn encodes_rfc7636_pkce_vector() {
        // RFC 7636 Appendix B test vector
        let verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
        assert_eq!(
            pkce_challenge(verifier),
            "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
        );
        assert_eq!(base64_url_encode(b"foobar"), "Zm9vYmFy");
    }
}
