use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use std::time::Duration;

use reqwest::blocking::{multipart, Client};
use reqwest::Url;
use serde::Deserialize;
use tauri::AppHandle;

use crate::errors::{AppError, AppResult};
use crate::models::{SupportAttachment, SupportConfig, SupportRequestPayload, SupportSubmissionResult};
use crate::workspace::load_config;

const MAX_ATTACHMENTS: usize = 5;
const MAX_TOTAL_ATTACHMENT_BYTES: u64 = 20 * 1024 * 1024;
const ALLOWED_EXTENSIONS: [&str; 7] = ["png", "jpg", "jpeg", "webp", "gif", "pdf", "docx"];
static DEV_ENV_VALUES: OnceLock<HashMap<String, String>> = OnceLock::new();

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct SupportEndpointResponse {
    #[serde(default)]
    message_id: String,
    #[serde(default)]
    id: String,
}

fn load_dev_env_if_present() -> &'static HashMap<String, String> {
    DEV_ENV_VALUES.get_or_init(|| {
        let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let mut values = HashMap::new();
        let candidate_paths = [
            manifest_dir
                .parent()
                .map(|path| path.join(".env"))
                .unwrap_or_else(|| PathBuf::from(".env")),
            std::env::current_dir()
                .map(|path| path.join(".env"))
                .unwrap_or_else(|_| PathBuf::from(".env")),
            manifest_dir.join(".env"),
        ];

        let Some(content) = candidate_paths
            .iter()
            .find(|path| path.exists())
            .and_then(|path| fs::read_to_string(path).ok())
        else {
            return values;
        };

        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }

            let Some((key, value)) = trimmed.split_once('=') else {
                continue;
            };

            let parsed_key = key.trim();
            let parsed_value = value.trim().trim_matches('"').trim_matches('\'');
            if !parsed_key.is_empty() && !parsed_value.is_empty() {
                values.insert(parsed_key.to_string(), parsed_value.to_string());
            }
        }

        values
    })
}

fn resolve_config_value(key: &str, compiled: Option<&'static str>) -> String {
    let dev_env_values = load_dev_env_if_present();

    std::env::var(key)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .or_else(|| dev_env_values.get(key).cloned().filter(|value| !value.is_empty()))
        .or_else(|| {
            compiled
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty())
        })
        .unwrap_or_default()
}

fn resolve_support_endpoint(app: &AppHandle) -> String {
    let from_env = resolve_config_value("SUPPORT_ENDPOINT_URL", option_env!("SUPPORT_ENDPOINT_URL"));
    if !from_env.is_empty() {
        return from_env;
    }

    load_config(app)
        .map(|config| config.support_endpoint_url.trim().to_string())
        .unwrap_or_default()
}

fn is_valid_endpoint_url(value: &str) -> bool {
    let Ok(url) = Url::parse(value) else {
        return false;
    };

    matches!(url.scheme(), "https" | "http") && url.host_str().is_some()
}

pub fn get_support_config(app: &AppHandle) -> SupportConfig {
    let endpoint_url = resolve_support_endpoint(app);
    let recipient_email = resolve_config_value("SUPPORT_TO_EMAIL", option_env!("SUPPORT_TO_EMAIL"));

    SupportConfig {
        configured: is_valid_endpoint_url(&endpoint_url),
        recipient_email,
        allowed_extensions: ALLOWED_EXTENSIONS.iter().map(|item| item.to_string()).collect(),
        max_attachments: MAX_ATTACHMENTS,
        max_total_bytes: MAX_TOTAL_ATTACHMENT_BYTES,
    }
}

pub fn build_attachment_metadata(files: Vec<PathBuf>) -> AppResult<Vec<SupportAttachment>> {
    files
        .into_iter()
        .map(|path| build_single_attachment_metadata(&path))
        .collect()
}

pub fn send_support_request(app: &AppHandle, payload: &SupportRequestPayload) -> AppResult<SupportSubmissionResult> {
    let endpoint_url = resolve_support_endpoint(app);
    if !is_valid_endpoint_url(&endpoint_url) {
        return Err(AppError::from(
            "El canal de soporte no esta configurado. Configura SUPPORT_ENDPOINT_URL o supportEndpointUrl en config.json.",
        ));
    }

    let request_type = normalize_request_type(&payload.request_type);
    let contact_name = sanitize_header_line(&payload.contact_name);
    if contact_name.is_empty() {
        return Err(AppError::from("Escribe tu nombre antes de enviar la solicitud."));
    }
    if contact_name.chars().count() > 80 {
        return Err(AppError::from("El nombre es demasiado largo. Usa maximo 80 caracteres."));
    }

    let subject_body = sanitize_header_line(&payload.subject);
    if subject_body.is_empty() {
        return Err(AppError::from("La cabecera del mensaje no puede quedar vacia."));
    }
    if subject_body.chars().count() > 120 {
        return Err(AppError::from("La cabecera es demasiado larga. Usa maximo 120 caracteres."));
    }

    let message = payload.message.trim();
    if message.is_empty() {
        return Err(AppError::from("Describe la mejora o el error antes de enviar."));
    }
    if message.chars().count() > 6000 {
        return Err(AppError::from("El mensaje es demasiado largo. Usa maximo 6000 caracteres."));
    }

    validate_attachment_list(&payload.attachments)?;

    let mut total_bytes = 0_u64;
    let mut attachment_files = Vec::with_capacity(payload.attachments.len());
    for item in &payload.attachments {
        let validated = build_single_attachment_metadata(Path::new(&item.file_path))?;
        total_bytes += validated.size_bytes;
        let bytes = fs::read(&validated.file_path)?;
        attachment_files.push((validated.file_name, bytes));
    }

    if total_bytes > MAX_TOTAL_ATTACHMENT_BYTES {
        return Err(AppError::from(format!(
            "Los adjuntos superan el limite total de {} MB.",
            MAX_TOTAL_ATTACHMENT_BYTES / (1024 * 1024)
        )));
    }

    let request_label = request_type_label(request_type);
    let subject = format!("{} - {} - {}", request_type_prefix(request_type), subject_body, contact_name);
    let version = env!("CARGO_PKG_VERSION");
    let platform = format!("{}-{}", std::env::consts::OS, std::env::consts::ARCH);

    let mut form = multipart::Form::new()
        .text("requestType", request_type.to_string())
        .text("requestLabel", request_label.to_string())
        .text("contactName", contact_name)
        .text("subject", subject)
        .text("subjectBody", subject_body)
        .text("message", message.to_string())
        .text("appVersion", version.to_string())
        .text("platform", platform);

    for (file_name, bytes) in attachment_files {
        let mime = mime_for_file(&file_name);
        let part = multipart::Part::bytes(bytes)
            .file_name(file_name)
            .mime_str(mime)
            .map_err(|error| AppError::from(error.to_string().as_str()))?;
        form = form.part("attachments", part);
    }

    let client = Client::builder()
        .connect_timeout(Duration::from_secs(10))
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|error| AppError::from(error.to_string().as_str()))?;

    let response = client
        .post(&endpoint_url)
        .multipart(form)
        .send()
        .map_err(|error| AppError::from(error.to_string().as_str()))?
        .error_for_status()
        .map_err(|error| AppError::from(error.to_string().as_str()))?;

    let body_text = response.text().unwrap_or_default();
    let parsed = serde_json::from_str::<SupportEndpointResponse>(&body_text).unwrap_or_default();
    let message_id = if !parsed.message_id.is_empty() {
        parsed.message_id
    } else {
        parsed.id
    };

    Ok(SupportSubmissionResult {
        ok: true,
        message_id,
    })
}

fn sanitize_header_line(value: &str) -> String {
    value
        .chars()
        .map(|ch| if ch == '\r' || ch == '\n' || ch.is_control() { ' ' } else { ch })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn build_single_attachment_metadata(path: &Path) -> AppResult<SupportAttachment> {
    if !path.exists() {
        return Err(AppError::from("Uno de los archivos adjuntos ya no existe en la ruta seleccionada."));
    }

    let extension = normalized_extension(path)?;
    if !ALLOWED_EXTENSIONS.contains(&extension.as_str()) {
        return Err(AppError::from(
            "Solo se permiten imagenes, archivos PDF o documentos DOCX en soporte.",
        ));
    }

    let metadata = fs::metadata(path)?;
    if !metadata.is_file() {
        return Err(AppError::from("Uno de los adjuntos seleccionados no es un archivo valido."));
    }

    let file_name = path
        .file_name()
        .map(|item| item.to_string_lossy().to_string())
        .ok_or_else(|| AppError::from("No se pudo leer el nombre de uno de los adjuntos."))?;

    Ok(SupportAttachment {
        file_name,
        file_path: path.to_string_lossy().to_string(),
        size_bytes: metadata.len(),
    })
}

fn normalized_extension(path: &Path) -> AppResult<String> {
    path.extension()
        .and_then(|item| item.to_str())
        .map(|item| item.trim().to_lowercase())
        .filter(|item| !item.is_empty())
        .ok_or_else(|| AppError::from("Uno de los adjuntos no tiene una extension soportada."))
}

fn validate_attachment_list(attachments: &[SupportAttachment]) -> AppResult<()> {
    if attachments.len() > MAX_ATTACHMENTS {
        return Err(AppError::from(format!(
            "Puedes adjuntar hasta {} archivos por envio.",
            MAX_ATTACHMENTS
        )));
    }

    Ok(())
}

fn normalize_request_type(value: &str) -> &str {
    match value.trim().to_lowercase().as_str() {
        "mejora" => "mejora",
        _ => "bug",
    }
}

fn request_type_label(value: &str) -> &str {
    match value {
        "mejora" => "Propuesta de mejora",
        _ => "Reporte de error",
    }
}

fn request_type_prefix(value: &str) -> &str {
    match value {
        "mejora" => "[MEJORA]",
        _ => "[BUG]",
    }
}

fn mime_for_file(file_name: &str) -> &'static str {
    let lower = file_name.to_lowercase();
    if lower.ends_with(".png") {
        "image/png"
    } else if lower.ends_with(".jpg") || lower.ends_with(".jpeg") {
        "image/jpeg"
    } else if lower.ends_with(".webp") {
        "image/webp"
    } else if lower.ends_with(".gif") {
        "image/gif"
    } else if lower.ends_with(".pdf") {
        "application/pdf"
    } else {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    }
}

#[cfg(test)]
mod tests {
    use super::{is_valid_endpoint_url, sanitize_header_line};

    #[test]
    fn strips_newlines_and_control_chars_from_header_fields() {
        assert_eq!(
            sanitize_header_line("  Juan\r\nBcc: evil@example.com\t"),
            "Juan Bcc: evil@example.com"
        );
    }

    #[test]
    fn validates_http_and_https_endpoints() {
        assert!(is_valid_endpoint_url("https://soporte.ejemplo.org/tickets"));
        assert!(is_valid_endpoint_url("http://localhost:8787/support"));
        assert!(!is_valid_endpoint_url("ftp://ejemplo.org"));
        assert!(!is_valid_endpoint_url(""));
    }
}
