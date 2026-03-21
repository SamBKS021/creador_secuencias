use std::fs::File;
use std::io::Read;
use std::path::Path;

use regex::Regex;
use roxmltree::{Document, Node};
use unicode_normalization::{char::is_combining_mark, UnicodeNormalization};
use uuid::Uuid;
use zip::ZipArchive;

use crate::errors::{AppError, AppResult};
use crate::models::{
    ImportBatchResult, ImportCandidate, ImportDocumentResult, Song, SongChord, SongContentRecord, SongLine, SongSection,
};

#[derive(Debug, Clone)]
struct ParsedParagraph {
    text: String,
    is_bold: bool,
    has_highlight: bool,
    max_size: i32,
    has_hyperlink: bool,
}

#[derive(Debug, Default)]
struct CandidateBuilder {
    title: String,
    paragraphs: Vec<ParsedParagraph>,
}

pub fn normalize_title(title: &str) -> String {
    let without_accents = title
        .nfd()
        .filter(|character| !is_combining_mark(*character))
        .collect::<String>();

    let collapsed = without_accents
        .chars()
        .map(|character| {
            if character.is_alphanumeric() || character.is_whitespace() {
                character.to_ascii_lowercase()
            } else {
                ' '
            }
        })
        .collect::<String>();

    collapsed.split_whitespace().collect::<Vec<_>>().join(" ")
}

pub fn import_docx_batch(file_paths: &[std::path::PathBuf], songs: &[Song]) -> AppResult<ImportBatchResult> {
    let documents = file_paths
        .iter()
        .map(|path| parse_docx_document(path, songs))
        .collect::<AppResult<Vec<_>>>()?;

    Ok(ImportBatchResult { documents })
}

fn parse_docx_document(path: &Path, songs: &[Song]) -> AppResult<ImportDocumentResult> {
    if path
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.eq_ignore_ascii_case("docx"))
        != Some(true)
    {
        return Err(AppError::from("Solo se soportan archivos .docx."));
    }

    let xml = read_document_xml(path)?;
    let paragraphs = parse_paragraphs(&xml)?;
    let candidates = build_candidates(&paragraphs, path, songs);

    let source_file_name = path
        .file_name()
        .map(|item| item.to_string_lossy().to_string())
        .unwrap_or_else(|| "archivo.docx".into());

    let warnings = if candidates.is_empty() {
        vec!["No se detectaron cantos con suficiente confianza en este archivo.".into()]
    } else {
        Vec::new()
    };

    Ok(ImportDocumentResult {
        source_file_name,
        source_path: path.to_string_lossy().to_string(),
        candidates,
        warnings,
    })
}

fn read_document_xml(path: &Path) -> AppResult<String> {
    let file = File::open(path)?;
    let mut archive = ZipArchive::new(file).map_err(|error| AppError::Message(error.to_string()))?;
    let mut xml_file = archive
        .by_name("word/document.xml")
        .map_err(|error| AppError::Message(error.to_string()))?;
    let mut xml = String::new();
    xml_file.read_to_string(&mut xml)?;
    Ok(xml)
}

fn parse_paragraphs(xml: &str) -> AppResult<Vec<ParsedParagraph>> {
    let document = Document::parse(xml).map_err(|error| AppError::Message(error.to_string()))?;
    let paragraphs = document
        .descendants()
        .filter(|node| node.is_element() && node.tag_name().name() == "p")
        .filter_map(parse_paragraph)
        .collect::<Vec<_>>();

    Ok(paragraphs)
}

fn parse_paragraph(node: Node<'_, '_>) -> Option<ParsedParagraph> {
    let text = node
        .descendants()
        .filter(|child| child.is_element() && child.tag_name().name() == "t")
        .filter_map(|child| child.text())
        .collect::<String>();

    let normalized = text.replace('\u{00A0}', " ");
    if normalized.trim().is_empty() {
        return Some(ParsedParagraph {
            text: String::new(),
            is_bold: false,
            has_highlight: false,
            max_size: 0,
            has_hyperlink: false,
        });
    }

    let is_bold = node
        .descendants()
        .any(|child| child.is_element() && child.tag_name().name() == "b");
    let has_highlight = node
        .descendants()
        .any(|child| child.is_element() && child.tag_name().name() == "highlight");
    let has_hyperlink = node
        .descendants()
        .any(|child| child.is_element() && (child.tag_name().name() == "hyperlink" || child.tag_name().name() == "instrText"));
    let max_size = node
        .descendants()
        .filter(|child| {
            child.is_element() && (child.tag_name().name() == "sz" || child.tag_name().name() == "szCs")
        })
        .filter_map(|child| child.attribute(("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "val")))
        .filter_map(|value| value.parse::<i32>().ok())
        .max()
        .unwrap_or(0);

    Some(ParsedParagraph {
        text: normalized,
        is_bold,
        has_highlight,
        max_size,
        has_hyperlink,
    })
}

fn build_candidates(paragraphs: &[ParsedParagraph], path: &Path, songs: &[Song]) -> Vec<ImportCandidate> {
    let mut builders = Vec::new();
    let mut current = CandidateBuilder::default();
    let mut seen_content = false;

    for paragraph in paragraphs {
        let text = paragraph.text.trim();
        if text.is_empty() {
            if !current.title.is_empty() {
                current.paragraphs.push(paragraph.clone());
            }
            continue;
        }

        if is_title_paragraph(paragraph) {
            if !current.title.is_empty() && seen_content {
                builders.push(current);
                current = CandidateBuilder::default();
                seen_content = false;
            }

            if current.title.is_empty() {
                current.title = text.to_string();
                continue;
            }
        }

        if !current.title.is_empty() {
            current.paragraphs.push(paragraph.clone());
            seen_content = true;
        }
    }

    if !current.title.is_empty() {
        builders.push(current);
    }

    builders
        .into_iter()
        .enumerate()
        .map(|(index, builder)| build_import_candidate(index, builder, path, songs))
        .collect()
}

fn is_title_paragraph(paragraph: &ParsedParagraph) -> bool {
    let text = paragraph.text.trim();
    if text.is_empty() || is_metadata_line(text) || is_section_header(text) || is_chord_line(text) {
        return false;
    }

    let word_count = text.split_whitespace().count();
    if word_count > 10 {
        return false;
    }

    let uppercase_ratio = text.chars().filter(|character| character.is_uppercase()).count() as f32
        / text.chars().filter(|character| character.is_alphabetic()).count().max(1) as f32;

    uppercase_ratio > 0.7
        || paragraph.has_highlight
        || (paragraph.is_bold && paragraph.max_size >= 28)
        || (paragraph.is_bold && word_count <= 5)
}

fn build_import_candidate(index: usize, builder: CandidateBuilder, path: &Path, songs: &[Song]) -> ImportCandidate {
    let title_detected = builder.title.trim().to_string();
    let title_normalized = normalize_title(&title_detected);
    let author_detected = detect_author(&builder.paragraphs);
    let key_detected = detect_key(&builder.paragraphs);
    let content_draft = build_content_draft(&builder.paragraphs);
    let lyrics = flatten_lyrics(&content_draft);
    let chords = flatten_chords(&content_draft);
    let matched_song = songs
        .iter()
        .find(|song| normalize_title(&song.title) == title_normalized);

    let mut warnings = Vec::new();
    if matched_song.is_some() {
        warnings.push("Ya existe un canto con este título. Guardar como nuevo sigue permitido.".into());
    }

    ImportCandidate {
        candidate_id: Uuid::new_v4().to_string(),
        source_file_name: path
            .file_name()
            .map(|item| item.to_string_lossy().to_string())
            .unwrap_or_else(|| "archivo.docx".into()),
        source_path: path.to_string_lossy().to_string(),
        order: index + 1,
        title_detected,
        title_normalized,
        author_detected,
        key_detected,
        lyrics,
        chords,
        content_draft,
        matched_song_id: matched_song.map(|song| song.id.clone()).unwrap_or_default(),
        matched_song_title: matched_song.map(|song| song.title.clone()).unwrap_or_default(),
        match_type: if matched_song.is_some() {
            "title-exact".into()
        } else {
            String::new()
        },
        confidence: if matched_song.is_some() { 1.0 } else { 0.72 },
        warnings,
    }
}

fn build_content_draft(paragraphs: &[ParsedParagraph]) -> SongContentRecord {
    let mut lines = Vec::new();
    let section_index = 1;
    let mut line_index = 1;

    for paragraph in paragraphs {
        let text = paragraph.text.trim().to_string();
        if text.is_empty() {
            if !lines.is_empty() {
                lines.push(SongLine {
                    id: format!("line-temp-{line_index}"),
                    kind: "empty".into(),
                    text: String::new(),
                    chords: Vec::new(),
                });
                line_index += 1;
            }
            continue;
        }

        if is_metadata_line(&text) {
            continue;
        }

        if is_section_header(&text) {
            lines.push(SongLine {
                id: format!("line-temp-{line_index}"),
                kind: "instruction".into(),
                text,
                chords: Vec::new(),
            });
            line_index += 1;
            continue;
        }

        let (kind, chords) = if is_chord_line(&text) {
            ("chords-only".to_string(), parse_chords(&text))
        } else {
            ("lyric".to_string(), Vec::new())
        };

        lines.push(SongLine {
            id: format!("line-temp-{line_index}"),
            kind,
            text,
            chords,
        });
        line_index += 1;
    }

    if lines.is_empty() {
        lines.push(SongLine {
            id: "line-temp-1".into(),
            kind: "empty".into(),
            text: String::new(),
            chords: Vec::new(),
        });
    }

    SongContentRecord {
        version: 1,
        sections: vec![SongSection {
            id: format!("section-temp-{section_index}"),
            section_type: "custom".into(),
            label: "CUSTOM".into(),
            lines,
        }],
    }
}

fn detect_author(paragraphs: &[ParsedParagraph]) -> String {
    paragraphs
        .iter()
        .find(|paragraph| paragraph.has_hyperlink)
        .map(|paragraph| paragraph.text.trim().to_string())
        .unwrap_or_default()
}

fn detect_key(paragraphs: &[ParsedParagraph]) -> String {
    let key_regex = Regex::new(r"(?i)tono:\s*([A-G][#b]?(?:m|maj|min|sus|dim|aug|7|9|11|13)?)").unwrap();
    for paragraph in paragraphs {
        if let Some(captures) = key_regex.captures(paragraph.text.trim()) {
            if let Some(value) = captures.get(1) {
                return value.as_str().to_string();
            }
        }
    }

    String::new()
}

fn is_metadata_line(text: &str) -> bool {
    let normalized = text.trim().to_lowercase();
    normalized.starts_with("tono:")
        || normalized.starts_with("fuente:")
        || normalized.starts_with("autor:")
        || normalized.starts_with("capo:")
}

fn is_section_header(text: &str) -> bool {
    let normalized = text.trim().to_uppercase();
    normalized.starts_with('[')
        || normalized.starts_with("INTRO")
        || normalized.starts_with("VERSO")
        || normalized.starts_with("CORO")
        || normalized.starts_with("PUENTE")
        || normalized.starts_with("PRECORO")
        || normalized.starts_with("ESTRIBILLO")
        || normalized.starts_with("FINAL")
        || normalized.starts_with("INTERLUDIO")
}

fn is_chord_line(text: &str) -> bool {
    let chords = parse_chords(text);
    if chords.is_empty() {
        return false;
    }

    let normalized = text
        .replace('|', " ")
        .replace('/', " ")
        .replace('-', " ");
    let stripped = normalized
        .split_whitespace()
        .collect::<Vec<_>>();

    chords.len() >= 1 && stripped.len() <= chords.len() + 2
}

fn parse_chords(text: &str) -> Vec<SongChord> {
    let chord_regex = Regex::new(
        r"(?i)([A-G](?:#|b)?(?:maj7|maj|min|m|sus2|sus4|dim|aug|add9|m7|m9|m11|m13|7|9|11|13|6)?(?:/[A-G](?:#|b)?)?)",
    )
    .unwrap();

    chord_regex
        .captures_iter(text)
        .filter_map(|captures| captures.get(1))
        .filter(|matched| has_valid_chord_boundaries(text, matched.start(), matched.end()))
        .map(|matched| SongChord {
            symbol: matched.as_str().to_string(),
            offset: matched.start(),
        })
        .collect()
}

fn has_valid_chord_boundaries(text: &str, start: usize, end: usize) -> bool {
    let previous = text[..start].chars().next_back();
    let next = text[end..].chars().next();
    is_valid_chord_boundary(previous) && is_valid_chord_boundary(next)
}

fn is_valid_chord_boundary(character: Option<char>) -> bool {
    match character {
        None => true,
        Some(value) => !value.is_alphanumeric() && value != '#' && value != 'b' && value != '/',
    }
}

fn flatten_lyrics(content: &SongContentRecord) -> String {
    let mut blocks = Vec::new();

    for section in &content.sections {
        if section.section_type != "custom" || section.label != "CUSTOM" {
            blocks.push(section.label.clone());
        }

        for line in &section.lines {
            match line.kind.as_str() {
                "lyric" | "instruction" => blocks.push(line.text.clone()),
                "chords-only" => blocks.push(render_chord_line(&line.chords)),
                "empty" => blocks.push(String::new()),
                _ => {}
            }
        }

        blocks.push(String::new());
    }

    while blocks.last().is_some_and(|value| value.is_empty()) {
        blocks.pop();
    }

    blocks.join("\n")
}

fn flatten_chords(content: &SongContentRecord) -> String {
    let mut blocks = Vec::new();

    for section in &content.sections {
        if section.section_type != "custom" || section.label != "CUSTOM" {
            blocks.push(section.label.clone());
        }

        for line in &section.lines {
            if !line.chords.is_empty() {
                blocks.push(render_chord_line(&line.chords));
            } else if line.kind == "instruction" && !line.text.is_empty() {
                blocks.push(line.text.clone());
            } else if line.kind == "empty" {
                blocks.push(String::new());
            }
        }

        blocks.push(String::new());
    }

    while blocks.last().is_some_and(|value| value.is_empty()) {
        blocks.pop();
    }

    blocks.join("\n")
}

fn render_chord_line(chords: &[SongChord]) -> String {
    let mut line = String::new();

    for chord in chords {
        while line.len() < chord.offset {
            line.push(' ');
        }
        line.push_str(&chord.symbol);
    }

    line.trim_end().to_string()
}
