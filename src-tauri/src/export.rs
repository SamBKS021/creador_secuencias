use std::fs::{self, File};
use std::path::{Path, PathBuf};
use std::sync::OnceLock;

use docx_rs::{
    AlignmentType, Docx, Document, Header, PageMargin, PageOrientationType, PageSize, Paragraph, Run, RunFonts, Table,
    TableCell, TableRow, WidthType,
};
use regex::Regex;
use serde_json::Value;
use sha2::{Digest, Sha256};

use crate::errors::{AppError, AppResult};
use crate::models::{Sequence, Song, SongChord, SongContentRecord, SongLine, SongSection};
use crate::workspace::validate_safe_id;

const BODY_FONT: &str = "Times New Roman";
const TITLE_FONT: &str = "Cambria";
const CHORD_FONT: &str = "Courier New";
const BODY_SIZE: usize = 28;
const META_SIZE: usize = 24;
const TITLE_SIZE: usize = 32;
const HEADER_SIZE: usize = 28;
const TITLE_COLOR: &str = "1F4E79";
const HEADER_COLOR: &str = "244A73";
const META_COLOR: &str = "5A6F8F";

static CHORD_REGEX: OnceLock<Regex> = OnceLock::new();
static INLINE_BRACKET_CHORD_REGEX: OnceLock<Regex> = OnceLock::new();

fn chord_regex() -> &'static Regex {
    CHORD_REGEX.get_or_init(|| {
        Regex::new(
            r"(?i)([A-G](?:#|b)?(?:maj7|maj|min|m|sus2|sus4|dim|aug|add9|m7|m9|m11|m13|7|9|11|13|6)?(?:/[A-G](?:#|b)?)?)",
        )
        .expect("valid chord regex")
    })
}

fn inline_bracket_chord_regex() -> &'static Regex {
    INLINE_BRACKET_CHORD_REGEX.get_or_init(|| {
        Regex::new(
            r"\[([A-G](?:#|b)?(?:maj7|maj|min|m|sus2|sus4|dim|aug|add9|m7|m9|m11|m13|7|9|11|13|6)?(?:/[A-G](?:#|b)?)?)\]",
        )
        .expect("valid inline chord regex")
    })
}

pub fn export_sequence_docx(
    root: &Path,
    sequence: &Sequence,
    songs: &[Song],
    without_notes: bool,
) -> AppResult<PathBuf> {
    let output_path = export_sequence_docx_path_with_options(root, sequence, without_notes);
    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent)?;
    }

    let document = Document::new()
        .page_size(PageSize::new().size(15840, 12240))
        .page_orient(PageOrientationType::Landscape)
        .page_margin(
            PageMargin::new()
                .top(1700)
                .left(1417)
                .right(1417)
                .bottom(1700)
                .header(850),
        )
        .columns(3);

    let mut doc = Docx::new()
        .default_fonts(base_fonts())
        .default_size(BODY_SIZE)
        .document(document)
        .header(build_header(sequence));

    for item in &sequence.items {
        let Some(song) = songs.iter().find(|song| song.id == item.song_id) else {
            continue;
        };

        let content = load_song_content(root, song).unwrap_or_else(|_| build_fallback_content(song));
        doc = add_song_block(doc, song, &content, without_notes);
    }

    let file = File::create(&output_path)?;
    doc.build()
        .pack(file)
        .map_err(|error: zip::result::ZipError| AppError::Message(error.to_string()))?;

    Ok(output_path)
}

pub fn export_sequence_docx_path(root: &Path, sequence: &Sequence) -> PathBuf {
    export_sequence_docx_path_with_options(root, sequence, false)
}

pub fn export_sequence_docx_path_with_options(root: &Path, sequence: &Sequence, without_notes: bool) -> PathBuf {
    let safe_name = sanitize_file_name(&sequence.title);
    let short_id = short_sequence_tag(&sequence.id);
    let suffix = if without_notes { "_sin_notas" } else { "" };
    root.join("exports")
        .join(format!("{safe_name}_{short_id}{suffix}.docx"))
}

pub fn legacy_export_sequence_docx_path(root: &Path, sequence: &Sequence) -> PathBuf {
    let safe_name = sanitize_file_name(&sequence.title);
    root.join("exports").join(format!("{safe_name}.docx"))
}

fn short_sequence_tag(sequence_id: &str) -> String {
    let trimmed = sequence_id.trim();
    if trimmed.is_empty() {
        return "00000000".into();
    }

    let digest = format!("{:x}", Sha256::digest(trimmed.as_bytes()));
    digest.chars().take(8).collect()
}

fn build_header(sequence: &Sequence) -> Header {
    let header_table = Table::without_borders(vec![TableRow::new(vec![
        TableCell::new()
            .width(6500, WidthType::Dxa)
            .add_paragraph(
                Paragraph::new().add_run(
                    Run::new()
                        .add_text(sequence.title.clone())
                        .bold()
                        .size(HEADER_SIZE)
                        .color(HEADER_COLOR)
                        .fonts(title_fonts()),
                ),
            ),
        TableCell::new()
            .width(6500, WidthType::Dxa)
            .add_paragraph(
                Paragraph::new()
                    .add_run(
                        Run::new()
                            .add_text(display_service_date(&sequence.service_date))
                            .bold()
                            .size(HEADER_SIZE)
                            .color(HEADER_COLOR)
                            .fonts(title_fonts()),
                    )
                    .align(AlignmentType::Right),
            ),
    ])])
    .width(13000, WidthType::Dxa)
    .set_grid(vec![6500, 6500]);

    Header::new()
        .add_table(header_table)
        .add_paragraph(Paragraph::new())
}

fn add_song_block(mut doc: Docx, song: &Song, content: &SongContentRecord, without_notes: bool) -> Docx {
    let title = if song.title.trim().is_empty() {
        "Sin titulo"
    } else {
        song.title.as_str()
    };

    doc = doc
        .add_paragraph(
            Paragraph::new().add_run(
                Run::new()
                    .add_text(title)
                    .bold()
                    .size(TITLE_SIZE)
                    .color(TITLE_COLOR)
                    .fonts(title_fonts()),
            ),
        )
        .add_paragraph(
            Paragraph::new().add_run(
                Run::new()
                    .add_text(display_author(&song.author))
                    .italic()
                    .size(META_SIZE)
                    .color(META_COLOR)
                    .fonts(base_fonts()),
            ),
        );

    if !without_notes && !song.key.trim().is_empty() {
        doc = doc.add_paragraph(
            Paragraph::new()
                .add_run(
                    Run::new()
                        .add_text("Tono: ")
                        .bold()
                        .size(BODY_SIZE)
                        .color(TITLE_COLOR)
                        .fonts(base_fonts()),
                )
                .add_run(
                    Run::new()
                        .add_text(song.key.clone())
                        .bold()
                        .size(BODY_SIZE)
                        .color(TITLE_COLOR)
                        .fonts(base_fonts()),
                ),
        );
    }

    doc = doc.add_paragraph(Paragraph::new());

    for line in normalize_export_lines(content, without_notes) {
        doc = add_song_line(doc, &line, without_notes);
    }

    doc.add_paragraph(Paragraph::new()).add_paragraph(Paragraph::new())
}

fn add_song_line(mut doc: Docx, line: &SongLine, without_notes: bool) -> Docx {
    if !without_notes && !line.chords.is_empty() {
        doc = doc.add_paragraph(
            Paragraph::new().add_run(
                Run::new()
                    .add_text(render_chord_line(&line.chords))
                    .bold()
                    .size(BODY_SIZE)
                    .fonts(chord_fonts()),
            ),
        );
    }

    match line.kind.as_str() {
        "empty" => doc.add_paragraph(Paragraph::new()),
        "instruction" => {
            if line.text.is_empty() {
                doc
            } else if without_notes {
                doc.add_paragraph(
                    Paragraph::new().add_run(
                        Run::new()
                            .add_text(line.text.clone())
                            .bold()
                            .size(BODY_SIZE)
                            .fonts(base_fonts()),
                    ),
                )
            } else {
                doc.add_paragraph(build_text_with_chord_emphasis(
                    &line.text,
                    BODY_SIZE,
                    true,
                    false,
                    BODY_FONT,
                ))
            }
        }
        "chords-only" => doc,
        _ => {
            if line.text.is_empty() {
                doc
            } else {
                doc.add_paragraph(
                    Paragraph::new().add_run(
                        Run::new()
                            .add_text(line.text.clone())
                            .size(BODY_SIZE)
                            .fonts(base_fonts()),
                    ),
                )
            }
        }
    }
}

fn build_text_with_chord_emphasis(
    text: &str,
    size: usize,
    default_bold: bool,
    italic: bool,
    font_name: &str,
) -> Paragraph {
    let mut paragraph = Paragraph::new();
    let mut cursor = 0usize;

    for (start, end) in chord_spans(text) {
        if start > cursor {
            paragraph = paragraph.add_run(styled_text_run(
                &text[cursor..start],
                size,
                default_bold,
                italic,
                font_name,
            ));
        }

        paragraph = paragraph.add_run(styled_text_run(&text[start..end], size, true, italic, font_name));
        cursor = end;
    }

    if cursor < text.len() {
        paragraph = paragraph.add_run(styled_text_run(
            &text[cursor..],
            size,
            default_bold,
            italic,
            font_name,
        ));
    }

    paragraph
}

fn styled_text_run(text: &str, size: usize, bold: bool, italic: bool, font_name: &str) -> Run {
    let fonts = if font_name == CHORD_FONT {
        chord_fonts()
    } else {
        base_fonts()
    };

    let mut run = Run::new().add_text(text.to_string()).size(size).fonts(fonts);

    if bold {
        run = run.bold();
    }

    if italic {
        run = run.italic();
    }

    run
}

fn normalize_export_lines(content: &SongContentRecord, without_notes: bool) -> Vec<SongLine> {
    let mut lines = Vec::new();
    let mut line_counter = 1usize;

    for section in &content.sections {
        let mut section_lines = Vec::new();

        for line in &section.lines {
            let kind = if line.kind.is_empty() {
                "lyric".to_string()
            } else {
                line.kind.clone()
            };

            if without_notes {
                if kind == "chords-only" {
                    continue;
                }

                if kind == "instruction" {
                    let Some(filtered_instruction) = filter_instruction_for_without_notes(&line.text) else {
                        continue;
                    };
                    section_lines.push(SongLine {
                        id: format!("line-{line_counter:04}"),
                        kind,
                        text: filtered_instruction,
                        chords: Vec::new(),
                    });
                    line_counter += 1;
                    continue;
                }

                if kind == "empty" {
                    if section_lines
                        .last()
                        .is_some_and(|prev: &SongLine| prev.kind == "empty")
                    {
                        continue;
                    }
                    section_lines.push(SongLine {
                        id: format!("line-{line_counter:04}"),
                        kind,
                        text: String::new(),
                        chords: Vec::new(),
                    });
                    line_counter += 1;
                    continue;
                }

                let cleaned_text = strip_inline_bracket_chords(&line.text);
                if cleaned_text.trim().is_empty() {
                    continue;
                }

                section_lines.push(SongLine {
                    id: format!("line-{line_counter:04}"),
                    kind,
                    text: cleaned_text,
                    chords: Vec::new(),
                });
                line_counter += 1;
            } else {
                section_lines.push(SongLine {
                    id: format!("line-{line_counter:04}"),
                    kind,
                    text: line.text.clone(),
                    chords: stabilize_line_chords(line),
                });
                line_counter += 1;
            }
        }

        if without_notes {
            while section_lines.first().is_some_and(|line| line.kind == "empty") {
                section_lines.remove(0);
            }
            while section_lines.last().is_some_and(|line| line.kind == "empty") {
                section_lines.pop();
            }
        }

        let section_label = if should_render_label(section) {
            let normalized_label = normalize_section_label(&section.label);
            if without_notes {
                filter_instruction_for_without_notes(&normalized_label)
                    .filter(|_| !section_lines.is_empty())
            } else {
                Some(normalized_label)
            }
        } else {
            None
        };

        if let Some(label_text) = section_label {
            lines.push(SongLine {
                id: format!("line-{line_counter:04}"),
                kind: "instruction".into(),
                text: label_text,
                chords: Vec::new(),
            });
            line_counter += 1;
        }

        let had_content = !section_lines.is_empty();
        lines.extend(section_lines);

        if had_content && (!without_notes || !lines.last().is_some_and(|line| line.kind == "empty")) {
            lines.push(SongLine {
                id: format!("line-{line_counter:04}"),
                kind: "empty".into(),
                text: String::new(),
                chords: Vec::new(),
            });
            line_counter += 1;
        }
    }

    if without_notes {
        lines = prune_orphan_structural_headers(lines);
    }

    while lines.last().is_some_and(|line| line.kind == "empty" && line.text.is_empty()) {
        lines.pop();
    }

    if lines.is_empty() {
        lines.push(SongLine {
            id: "line-0001".into(),
            kind: "empty".into(),
            text: String::new(),
            chords: Vec::new(),
        });
    }

    lines
}

fn prune_orphan_structural_headers(lines: Vec<SongLine>) -> Vec<SongLine> {
    let mut result = Vec::with_capacity(lines.len());
    for index in 0..lines.len() {
        let current = &lines[index];
        if current.kind == "instruction" && is_structural_label_only(&current.text) {
            let has_following_body = lines[index + 1..]
                .iter()
                .take_while(|next| !(next.kind == "instruction" && is_structural_label_only(&next.text)))
                .any(|next| next.kind != "empty");
            if !has_following_body {
                continue;
            }
        }
        result.push(current.clone());
    }

    let mut collapsed: Vec<SongLine> = Vec::with_capacity(result.len());
    for line in result {
        if line.kind == "empty" && (collapsed.is_empty() || collapsed.last().is_some_and(|prev| prev.kind == "empty")) {
            continue;
        }
        collapsed.push(line);
    }
    collapsed
}

fn is_structural_label_only(text: &str) -> bool {
    let trimmed = text.trim().trim_start_matches('[').trim_end_matches(']').trim();
    let upper = trimmed.trim_end_matches(':').trim().to_uppercase();
    is_vocal_section_keyword(&upper)
}

fn is_vocal_section_keyword(upper: &str) -> bool {
    matches!(
        upper,
        "CORO" | "VERSO" | "PUENTE" | "PRECORO" | "PRE-CORO" | "ESTRIBILLO" | "FINAL" | "TAG"
    ) || upper.starts_with("VERSO ")
        || upper.starts_with("CORO ")
        || upper.starts_with("PUENTE ")
        || upper.starts_with("PRECORO ")
        || upper.starts_with("PRE-CORO ")
}

fn is_instrumental_keyword(upper: &str) -> bool {
    upper.starts_with("INTRO")
        || upper.starts_with("INTERLUDIO")
        || upper.starts_with("INSTRUMENTAL")
        || upper.starts_with("SOLO")
        || upper.starts_with("OUTRO")
}

fn filter_instruction_for_without_notes(text: &str) -> Option<String> {
    let cleaned = strip_inline_bracket_chords(text);
    let trimmed = cleaned.trim();
    if trimmed.is_empty() {
        return None;
    }

    let unwrapped = trimmed
        .trim_start_matches(['[', '('])
        .trim_end_matches([']', ')'])
        .trim();
    let upper = unwrapped.to_uppercase();

    if is_instrumental_keyword(&upper) {
        return None;
    }

    if let Some((prefix, rest)) = trimmed.split_once(':') {
        let prefix_upper = prefix.trim().trim_start_matches('[').trim().to_uppercase();
        if is_instrumental_keyword(&prefix_upper) {
            return None;
        }
        if is_vocal_section_keyword(&prefix_upper) {
            let rest_clean = rest
                .trim()
                .trim_start_matches(['(', '['])
                .trim_end_matches([')', ']'])
                .trim();
            if rest_clean.is_empty() || !chord_spans(rest_clean).is_empty() {
                return Some(format!("{}:", prefix.trim().trim_start_matches('[').trim()));
            }
            return Some(format!("{}: {}", prefix.trim().trim_start_matches('[').trim(), rest_clean));
        }
    }

    if is_vocal_section_keyword(upper.trim_end_matches(':').trim()) {
        return Some(trimmed.to_string());
    }

    if !chord_spans(unwrapped).is_empty() {
        return None;
    }

    Some(trimmed.to_string())
}

fn strip_inline_bracket_chords(text: &str) -> String {
    let replaced = inline_bracket_chord_regex().replace_all(text, "");
    let had_leading_space = text.starts_with(' ') || text.starts_with('\t');
    let mut normalized = String::with_capacity(replaced.len());
    let mut prev_space = false;

    for ch in replaced.chars() {
        if ch == ' ' || ch == '\t' {
            if !prev_space && (!normalized.is_empty() || had_leading_space) {
                normalized.push(' ');
            }
            prev_space = true;
        } else {
            normalized.push(ch);
            prev_space = false;
        }
    }

    normalized.trim_end().to_string()
}

fn stabilize_line_chords(line: &SongLine) -> Vec<SongChord> {
    if line.kind == "chords-only" || line.text.is_empty() {
        return line.chords.clone();
    }

    let char_limit = line.text.chars().count();
    line.chords
        .iter()
        .map(|chord| SongChord {
            symbol: chord.symbol.clone(),
            offset: chord.offset.min(char_limit),
        })
        .collect()
}

fn chord_spans(text: &str) -> Vec<(usize, usize)> {
    chord_regex()
        .captures_iter(text)
        .filter_map(|captures| captures.get(1))
        .filter(|matched| has_valid_chord_boundaries(text, matched.start(), matched.end()))
        .map(|matched| (matched.start(), matched.end()))
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

fn load_song_content(root: &Path, song: &Song) -> AppResult<SongContentRecord> {
    let safe_song_id = validate_safe_id(&song.id, "canto")?;
    let content_path = root.join("biblioteca").join(safe_song_id).join("content.json");
    let raw = fs::read_to_string(content_path)?;
    let value: Value = serde_json::from_str(&raw)?;

    if value.get("sections").is_some() {
        serde_json::from_value(value).map_err(Into::into)
    } else {
        Ok(build_fallback_content(song))
    }
}

fn build_fallback_content(song: &Song) -> SongContentRecord {
    let mut lines = Vec::new();
    let mut line_counter = 1usize;

    for lyric_line in song.lyrics.lines() {
        let spans = chord_spans(lyric_line);
        let trimmed = lyric_line.trim();
        let chord_only = is_chord_only_text(lyric_line);

        lines.push(SongLine {
            id: format!("line-{line_counter:04}"),
            kind: if trimmed.is_empty() {
                "empty".into()
            } else if chord_only {
                "chords-only".into()
            } else if is_instruction_text(trimmed) {
                "instruction".into()
            } else {
                "lyric".into()
            },
            text: if chord_only {
                String::new()
            } else {
                lyric_line.to_string()
            },
            chords: if chord_only {
                spans
                    .into_iter()
                    .map(|(start, end)| SongChord {
                        symbol: lyric_line[start..end].to_string(),
                        offset: lyric_line[..start].chars().count(),
                    })
                    .collect()
            } else {
                Vec::new()
            },
        });
        line_counter += 1;
    }

    if lines.is_empty() {
        lines.push(SongLine {
            id: "line-0001".into(),
            kind: "empty".into(),
            text: String::new(),
            chords: Vec::new(),
        });
    }

    SongContentRecord {
        version: 1,
        sections: vec![SongSection {
            id: "section-0001".into(),
            section_type: "custom".into(),
            label: String::new(),
            lines,
        }],
    }
}

fn is_chord_only_text(text: &str) -> bool {
    let spans = chord_spans(text);
    if spans.is_empty() {
        return false;
    }

    let normalized = text.replace('|', " ").replace('/', " ").replace('-', " ");
    let stripped = normalized.split_whitespace().collect::<Vec<_>>();

    !spans.is_empty() && stripped.len() <= spans.len() + 2
}

fn is_instruction_text(text: &str) -> bool {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return false;
    }

    if trimmed.starts_with('[') || trimmed.starts_with('(') {
        return true;
    }

    let uppercase = trimmed.to_uppercase();
    let normalized = uppercase.trim_end_matches(':');

    matches!(
        normalized,
        "INTRO"
            | "CORO"
            | "VERSO"
            | "VERSO 1"
            | "VERSO 2"
            | "VERSO 3"
            | "VERSO 4"
            | "VERSO 5"
            | "PUENTE"
            | "PRECORO"
            | "ESTRIBILLO"
            | "FINAL"
            | "INTERLUDIO"
    ) || normalized.starts_with("VERSO ")
}

fn should_render_label(section: &SongSection) -> bool {
    let label = section.label.trim();
    !label.is_empty() && !(section.section_type == "custom" && label.eq_ignore_ascii_case("CUSTOM"))
}

fn normalize_section_label(label: &str) -> String {
    let trimmed = label.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    if trimmed.ends_with(':') {
        trimmed.to_string()
    } else {
        format!("{trimmed}:")
    }
}

fn render_chord_line(chords: &[SongChord]) -> String {
    let mut line = String::new();

    for chord in chords {
        while line.chars().count() < chord.offset {
            line.push(' ');
        }
        line.push_str(&chord.symbol);
    }

    line.trim_end().to_string()
}

fn base_fonts() -> RunFonts {
    RunFonts::new().ascii(BODY_FONT)
}

fn chord_fonts() -> RunFonts {
    RunFonts::new().ascii(CHORD_FONT)
}

fn title_fonts() -> RunFonts {
    RunFonts::new().ascii(TITLE_FONT)
}

fn display_author(value: &str) -> String {
    if value.trim().is_empty() {
        "Autor pendiente".into()
    } else {
        value.to_string()
    }
}

fn display_service_date(value: &str) -> String {
    if value.trim().is_empty() {
        "Sin fecha".into()
    } else {
        value.to_string()
    }
}

fn sanitize_file_name(value: &str) -> String {
    let normalized = value.trim();
    if normalized.is_empty() {
        return "secuencia".into();
    }

    let mut safe = String::with_capacity(normalized.len());
    for character in normalized.chars() {
        match character {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => safe.push('-'),
            c if c.is_control() => safe.push('-'),
            c if c.is_whitespace() => safe.push('_'),
            c => safe.push(c),
        }
    }

    let trimmed = safe.trim_matches(|c| c == '_' || c == '.' || c == '-').to_string();
    if trimmed.is_empty() {
        return "secuencia".into();
    }

    let stem = trimmed.split('.').next().unwrap_or(&trimmed).to_uppercase();
    if matches!(
        stem.as_str(),
        "CON"
            | "PRN"
            | "AUX"
            | "NUL"
            | "COM1"
            | "COM2"
            | "COM3"
            | "COM4"
            | "COM5"
            | "COM6"
            | "COM7"
            | "COM8"
            | "COM9"
            | "LPT1"
            | "LPT2"
            | "LPT3"
            | "LPT4"
            | "LPT5"
            | "LPT6"
            | "LPT7"
            | "LPT8"
            | "LPT9"
    ) {
        return format!("secuencia_{trimmed}");
    }

    trimmed
}

#[cfg(test)]
mod tests {
    use super::{
        build_fallback_content, export_sequence_docx, export_sequence_docx_path_with_options,
        filter_instruction_for_without_notes, normalize_export_lines, sanitize_file_name,
        strip_inline_bracket_chords,
    };
    use crate::models::{Sequence, SequenceItem, Song, SongChord, SongContentRecord, SongLine, SongSection};
    use std::fs::File;
    use std::io::Read;
    use zip::ZipArchive;

    fn sample_song() -> Song {
        Song {
            id: "canto-0001".into(),
            title: "Sublime Gracia".into(),
            author: "John Newton".into(),
            key: "G".into(),
            lyrics: "[G]Sublime gracia del [C]Señor".into(),
            ..Song::default()
        }
    }

    #[test]
    fn disambiguates_export_paths_for_same_title_and_without_notes() {
        let root = std::path::Path::new("/tmp/workspace");
        let seq_a = Sequence {
            id: "seq-a".into(),
            title: "Adoración Matutina".into(),
            ..Sequence::default()
        };
        let seq_b = Sequence {
            id: "seq-b".into(),
            title: "Adoración Matutina".into(),
            ..Sequence::default()
        };

        let path_a = export_sequence_docx_path_with_options(root, &seq_a, false);
        let path_b = export_sequence_docx_path_with_options(root, &seq_b, false);
        let path_a_clean = export_sequence_docx_path_with_options(root, &seq_a, true);

        assert_ne!(path_a, path_b);
        assert!(path_a_clean.to_string_lossy().ends_with("_sin_notas.docx"));
        assert_ne!(path_a, path_a_clean);
    }

    #[test]
    fn sanitizes_empty_underscores_and_windows_reserved_names() {
        assert_eq!(sanitize_file_name("___"), "secuencia");
        assert_eq!(sanitize_file_name("..."), "secuencia");
        assert_eq!(sanitize_file_name("CON"), "secuencia_CON");
        assert_eq!(sanitize_file_name("nul.txt"), "secuencia_nul.txt");
    }

    #[test]
    fn strips_inline_chords_and_filters_musical_instructions() {
        assert_eq!(
            strip_inline_bracket_chords("[G]Sublime gracia del [C#m7]Señor [x2]"),
            "Sublime gracia del Señor [x2]"
        );
        assert_eq!(filter_instruction_for_without_notes("INTRO: G - C - D"), None);
        assert_eq!(filter_instruction_for_without_notes("(Solo guitarra: Am - F)"), None);
        assert_eq!(
            filter_instruction_for_without_notes("CORO:"),
            Some("CORO:".to_string())
        );
        assert_eq!(
            filter_instruction_for_without_notes("CORO: (G - C)"),
            Some("CORO:".to_string())
        );
        assert_eq!(
            filter_instruction_for_without_notes("(Todos)"),
            Some("(Todos)".to_string())
        );
    }

    #[test]
    fn normalizes_without_notes_dropping_chords_only_and_orphan_headers() {
        let content = SongContentRecord {
            version: 1,
            sections: vec![
                SongSection {
                    id: "sec-1".into(),
                    section_type: "intro".into(),
                    label: "INTRO".into(),
                    lines: vec![SongLine {
                        id: "l1".into(),
                        kind: "chords-only".into(),
                        text: String::new(),
                        chords: vec![SongChord {
                            symbol: "G".into(),
                            offset: 0,
                        }],
                    }],
                },
                SongSection {
                    id: "sec-2".into(),
                    section_type: "chorus".into(),
                    label: "CORO".into(),
                    lines: vec![
                        SongLine {
                            id: "l2".into(),
                            kind: "chords-only".into(),
                            text: String::new(),
                            chords: vec![SongChord {
                                symbol: "C".into(),
                                offset: 0,
                            }],
                        },
                        SongLine {
                            id: "l3".into(),
                            kind: "lyric".into(),
                            text: "[G]Santo eres Tú".into(),
                            chords: vec![SongChord {
                                symbol: "G".into(),
                                offset: 0,
                            }],
                        },
                    ],
                },
            ],
        };

        let normalized = normalize_export_lines(&content, true);
        assert_eq!(normalized.len(), 2);
        assert_eq!(normalized[0].kind, "instruction");
        assert_eq!(normalized[0].text, "CORO:");
        assert_eq!(normalized[1].kind, "lyric");
        assert_eq!(normalized[1].text, "Santo eres Tú");
        assert!(normalized[1].chords.is_empty());
    }

    #[test]
    fn fallback_content_stores_char_offsets_for_spanish_lyrics() {
        let song = Song {
            lyrics: "¿Quién   C   ñá   Am\n¿Quién sino el Señor".into(),
            ..Song::default()
        };
        let content = build_fallback_content(&song);
        let chords = &content.sections[0].lines[0].chords;
        assert_eq!(chords[0].offset, 9);
        assert_eq!(chords[1].offset, 18);
    }

    #[test]
    fn exports_docx_with_and_without_notes() {
        let temp_dir = std::env::temp_dir().join(format!("ccp-export-test-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&temp_dir).unwrap();
        let song = sample_song();
        let sequence = Sequence {
            id: "seq-test-1".into(),
            title: "Servicio Domingo".into(),
            service_date: "2026-04-05".into(),
            items: vec![SequenceItem {
                id: "item-1".into(),
                song_id: song.id.clone(),
                order: 1,
                transition_type: "Entrada suave".into(),
            }],
            ..Sequence::default()
        };

        let clean_path = export_sequence_docx(&temp_dir, &sequence, &[song], true).expect("docx export");
        assert!(clean_path.exists());

        let file = File::open(&clean_path).unwrap();
        let mut archive = ZipArchive::new(file).unwrap();
        let mut document_xml = String::new();
        archive
            .by_name("word/document.xml")
            .unwrap()
            .read_to_string(&mut document_xml)
            .unwrap();

        assert!(document_xml.contains("Sublime gracia del Señor"));
        assert!(!document_xml.contains("Tono:"));
        assert!(!document_xml.contains("[G]"));

        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}
