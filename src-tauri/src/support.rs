use std::fs;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use std::time::Duration;

use lettre::message::header::ContentType;
use lettre::message::{Attachment, Mailbox, Message, MultiPart, SinglePart};
use lettre::transport::smtp::authentication::Credentials;
use lettre::{SmtpTransport, Transport};

use crate::errors::{AppError, AppResult};
use crate::models::{SupportAttachment, SupportConfig, SupportRequestPayload, SupportSubmissionResult};

const DEFAULT_SMTP_HOST: &str = "smtp.gmail.com";
const DEFAULT_SMTP_PORT: u16 = 587;
const MAX_ATTACHMENTS: usize = 5;
const MAX_TOTAL_ATTACHMENT_BYTES: u64 = 20 * 1024 * 1024;
const ALLOWED_EXTENSIONS: [&str; 7] = ["png", "jpg", "jpeg", "webp", "gif", "pdf", "docx"];
static DEV_ENV_VALUES: OnceLock<HashMap<String, String>> = OnceLock::new();

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
        .or_else(|| compiled.map(|value| value.trim().to_string()).filter(|value| !value.is_empty()))
        .unwrap_or_default()
}

pub fn get_support_config() -> SupportConfig {
    let recipient_email = resolve_config_value("SUPPORT_TO_EMAIL", option_env!("SUPPORT_TO_EMAIL"));
    let from_email = resolve_config_value("SUPPORT_FROM_EMAIL", option_env!("SUPPORT_FROM_EMAIL"));
    let smtp_username = resolve_config_value("SMTP_USERNAME", option_env!("SMTP_USERNAME"));
    let smtp_password = resolve_config_value("SMTP_APP_PASSWORD", option_env!("SMTP_APP_PASSWORD"));

    SupportConfig {
        configured: !recipient_email.is_empty()
            && !from_email.is_empty()
            && !smtp_username.is_empty()
            && !smtp_password.is_empty(),
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

pub fn send_support_request(payload: &SupportRequestPayload) -> AppResult<SupportSubmissionResult> {
    let config = get_support_config();
    if !config.configured {
        let mut missing = Vec::new();
        if resolve_config_value("SMTP_USERNAME", option_env!("SMTP_USERNAME")).is_empty() {
            missing.push("SMTP_USERNAME");
        }
        if resolve_config_value("SMTP_APP_PASSWORD", option_env!("SMTP_APP_PASSWORD")).is_empty() {
            missing.push("SMTP_APP_PASSWORD");
        }
        if resolve_config_value("SUPPORT_FROM_EMAIL", option_env!("SUPPORT_FROM_EMAIL")).is_empty() {
            missing.push("SUPPORT_FROM_EMAIL");
        }
        if resolve_config_value("SUPPORT_TO_EMAIL", option_env!("SUPPORT_TO_EMAIL")).is_empty() {
            missing.push("SUPPORT_TO_EMAIL");
        }
        return Err(AppError::from(
            format!(
                "El canal de soporte no esta configurado en este build. Faltan: {}.",
                if missing.is_empty() {
                    "SMTP_USERNAME, SMTP_APP_PASSWORD, SUPPORT_FROM_EMAIL o SUPPORT_TO_EMAIL".to_string()
                } else {
                    missing.join(", ")
                }
            ),
        ));
    }

    let request_type = normalize_request_type(&payload.request_type);
    let contact_name = payload.contact_name.trim();
    if contact_name.is_empty() {
        return Err(AppError::from("Escribe tu nombre antes de enviar la solicitud."));
    }
    if contact_name.chars().count() > 80 {
        return Err(AppError::from("El nombre es demasiado largo. Usa maximo 80 caracteres."));
    }

    let subject_body = payload.subject.trim();
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
    let attachment_parts = payload
        .attachments
        .iter()
        .map(|item| {
            let validated = build_single_attachment_metadata(Path::new(&item.file_path))?;
            total_bytes += validated.size_bytes;
            let bytes = fs::read(&validated.file_path)?;
            Ok(Attachment::new(validated.file_name.clone()).body(bytes, content_type_for_file(&validated.file_name)))
        })
        .collect::<AppResult<Vec<_>>>()?;

    if total_bytes > MAX_TOTAL_ATTACHMENT_BYTES {
        return Err(AppError::from(format!(
            "Los adjuntos superan el limite total de {} MB.",
            MAX_TOTAL_ATTACHMENT_BYTES / (1024 * 1024)
        )));
    }

    let request_label = request_type_label(request_type);
    let subject = format!("{} - {} - {}", request_type_prefix(request_type), subject_body, contact_name);
    let escaped_message = escape_html(message);
    let escaped_contact_name = escape_html(contact_name);
    let version = env!("CARGO_PKG_VERSION");
    let platform = format!("{}-{}", std::env::consts::OS, std::env::consts::ARCH);

    let html = format!(
        concat!(
            "<div style=\"margin:0;padding:24px;background:#eef4ff;font-family:Arial,sans-serif;color:#183153;\">",
            "<div style=\"max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #d8e4ff;border-radius:22px;overflow:hidden;box-shadow:0 18px 50px rgba(19,54,108,0.08);\">",
            "<div style=\"padding:24px 28px;background:linear-gradient(135deg,#1f6feb 0%,#7aa8ff 100%);color:#ffffff;\">",
            "<p style=\"margin:0 0 8px 0;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;opacity:0.82;\">Centro Musical</p>",
            "<h1 style=\"margin:0;font-size:28px;line-height:1.2;\">{request_label}</h1>",
            "<p style=\"margin:10px 0 0 0;font-size:15px;line-height:1.6;opacity:0.92;\">Solicitud enviada desde la seccion de soporte de la app.</p>",
            "</div>",
            "<div style=\"padding:28px;\">",
            "<div style=\"display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-bottom:24px;\">",
            "<div style=\"padding:16px 18px;background:#f7faff;border:1px solid #dbe7ff;border-radius:16px;\">",
            "<p style=\"margin:0 0 6px 0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#5c78a6;\">Tipo</p>",
            "<p style=\"margin:0;font-size:18px;font-weight:700;color:#163766;\">{request_label}</p>",
            "</div>",
            "<div style=\"padding:16px 18px;background:#f7faff;border:1px solid #dbe7ff;border-radius:16px;\">",
            "<p style=\"margin:0 0 6px 0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#5c78a6;\">Nombre</p>",
            "<p style=\"margin:0;font-size:18px;font-weight:700;color:#163766;\">{escaped_contact_name}</p>",
            "</div>",
            "</div>",
            "<div style=\"margin-bottom:22px;\">",
            "<p style=\"margin:0 0 10px 0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#5c78a6;\">Mensaje</p>",
            "<div style=\"padding:20px;background:#ffffff;border:1px solid #dbe7ff;border-radius:18px;font-size:16px;line-height:1.8;color:#203a61;white-space:pre-wrap;\">{escaped_message}</div>",
            "</div>",
            "<div style=\"padding:18px 20px;background:#f7faff;border:1px solid #dbe7ff;border-radius:18px;\">",
            "<p style=\"margin:0 0 8px 0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#5c78a6;\">Datos tecnicos</p>",
            "<p style=\"margin:0;font-size:14px;line-height:1.8;color:#49658f;\">Version app: <strong style=\"color:#163766;\">{version}</strong><br />Plataforma: <strong style=\"color:#163766;\">{platform}</strong></p>",
            "</div>",
            "</div>",
            "</div>",
            "</div>"
        ),
        request_label = request_label,
        escaped_contact_name = escaped_contact_name,
        escaped_message = escaped_message,
        version = version,
        platform = platform,
    );

    let text = format!(
        "Tipo: {request_label}\nNombre: {contact_name}\n\nMensaje:\n{message}\n\n---\nVersion app: {version}\nPlataforma: {platform}"
    );

    let from_email = resolve_config_value("SUPPORT_FROM_EMAIL", option_env!("SUPPORT_FROM_EMAIL"));
    let from_name = resolve_config_value("SUPPORT_FROM_NAME", option_env!("SUPPORT_FROM_NAME"));
    let from_name = if from_name.is_empty() {
        "Centro Musical".to_string()
    } else {
        from_name
    };

    let from_mailbox = Mailbox::new(Some(from_name), from_email.parse()?);
    let to_mailbox = Mailbox::new(None, config.recipient_email.parse()?);

    let alternative = MultiPart::alternative()
        .singlepart(SinglePart::plain(text))
        .singlepart(SinglePart::html(html));

    let mut multipart = MultiPart::mixed().multipart(alternative);

    for part in attachment_parts {
        multipart = multipart.singlepart(part);
    }

    let message = Message::builder()
        .from(from_mailbox)
        .to(to_mailbox)
        .subject(subject)
        .multipart(multipart)?;

    let smtp_host = resolve_config_value("SMTP_HOST", option_env!("SMTP_HOST"));
    let smtp_host = if smtp_host.is_empty() {
        DEFAULT_SMTP_HOST.to_string()
    } else {
        smtp_host
    };
    let smtp_port = resolve_config_value("SMTP_PORT", option_env!("SMTP_PORT"))
        .parse::<u16>()
        .ok()
        .unwrap_or(DEFAULT_SMTP_PORT);
    let smtp_username = resolve_config_value("SMTP_USERNAME", option_env!("SMTP_USERNAME"));
    let smtp_password = resolve_config_value("SMTP_APP_PASSWORD", option_env!("SMTP_APP_PASSWORD"));

    let mailer = SmtpTransport::starttls_relay(&smtp_host)?
        .port(smtp_port)
        .credentials(Credentials::new(
            smtp_username,
            smtp_password,
        ))
        .timeout(Some(Duration::from_secs(30)))
        .build();

    let response = mailer.send(&message)?;
    let message_id = response.message().next().unwrap_or_default().to_string();

    Ok(SupportSubmissionResult {
        ok: true,
        message_id,
    })
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

fn escape_html(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

fn content_type_for_file(file_name: &str) -> ContentType {
    let lower = file_name.to_lowercase();
    let mime = if lower.ends_with(".png") {
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
    };

    mime.parse().expect("mime type valido")
}
