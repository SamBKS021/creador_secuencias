use std::fs::{self, File};
use std::path::{Path, PathBuf};

use docx_rs::{
    AlignmentType, Docx, Document, Header, PageMargin, PageOrientationType, PageSize, Paragraph, Run, RunFonts, Table,
    TableCell, TableRow, WidthType,
};
use regex::Regex;
use serde_json::Value;

use crate::errors::{AppError, AppResult};
use crate::models::{Sequence, Song, SongChord, SongContentRecord, SongLine, SongSection};

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

pub fn export_sequence_docx(root: &Path, sequence: &Sequence, songs: &[Song]) -> AppResult<PathBuf> {
    let output_path = export_sequence_docx_path(root, sequence);

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
        doc = add_song_block(doc, song, &content);
    }

    let file = File::create(&output_path)?;
    doc.build()
        .pack(file)
        .map_err(|error: zip::result::ZipError| AppError::Message(error.to_string()))?;

    Ok(output_path)
}

pub fn export_sequence_docx_path(root: &Path, sequence: &Sequence) -> PathBuf {
    let safe_name = sanitize_file_name(&sequence.title);
    root.join("exports").join(format!("{safe_name}.docx"))
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

fn add_song_block(mut doc: Docx, song: &Song, content: &SongContentRecord) -> Docx {
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

    if !song.key.trim().is_empty() {
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

    for line in normalize_export_lines(content) {
        doc = add_song_line(doc, &line);
    }

    doc.add_paragraph(Paragraph::new()).add_paragraph(Paragraph::new())
}

fn add_song_line(mut doc: Docx, line: &SongLine) -> Docx {
    if !line.chords.is_empty() {
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

fn normalize_export_lines(content: &SongContentRecord) -> Vec<SongLine> {
    let mut lines = Vec::new();
    let mut line_counter = 1usize;

    for section in &content.sections {
        if should_render_label(section) {
            lines.push(SongLine {
                id: format!("line-{line_counter:04}"),
                kind: "instruction".into(),
                text: normalize_section_label(&section.label),
                chords: Vec::new(),
            });
            line_counter += 1;
        }

        for line in &section.lines {
            lines.push(SongLine {
                id: format!("line-{line_counter:04}"),
                kind: if line.kind.is_empty() {
                    "lyric".into()
                } else {
                    line.kind.clone()
                },
                text: line.text.clone(),
                chords: stabilize_line_chords(line),
            });
            line_counter += 1;
        }

        if !section.lines.is_empty() {
            lines.push(SongLine {
                id: format!("line-{line_counter:04}"),
                kind: "empty".into(),
                text: String::new(),
                chords: Vec::new(),
            });
            line_counter += 1;
        }
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

fn stabilize_line_chords(line: &SongLine) -> Vec<SongChord> {
    if line.kind == "chords-only" || line.text.is_empty() {
        return line.chords.clone();
    }

    if line.chords.iter().all(|chord| chord.offset <= line.text.len()) {
        line.chords.clone()
    } else {
        Vec::new()
    }
}

fn chord_spans(text: &str) -> Vec<(usize, usize)> {
    let chord_regex = Regex::new(
        r"(?i)([A-G](?:#|b)?(?:maj7|maj|min|m|sus2|sus4|dim|aug|add9|m7|m9|m11|m13|7|9|11|13|6)?(?:/[A-G](?:#|b)?)?)",
    )
    .expect("valid chord regex");

    chord_regex
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
    let content_path = root.join("biblioteca").join(&song.id).join("content.json");
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

        lines.push(SongLine {
            id: format!("line-{line_counter:04}"),
            kind: if trimmed.is_empty() {
                "empty".into()
            } else if is_chord_only_text(lyric_line) {
                "chords-only".into()
            } else if is_instruction_text(trimmed) {
                "instruction".into()
            } else {
                "lyric".into()
            },
            text: if is_chord_only_text(lyric_line) {
                String::new()
            } else {
                lyric_line.to_string()
            },
            chords: if is_chord_only_text(lyric_line) {
                spans
                    .into_iter()
                    .map(|(start, end)| SongChord {
                        symbol: lyric_line[start..end].to_string(),
                        offset: start,
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

    spans.len() >= 1 && stripped.len() <= spans.len() + 2
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
        while line.len() < chord.offset {
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
            c if c.is_whitespace() => safe.push('_'),
            c => safe.push(c),
        }
    }

    safe.trim_matches('_').to_string()
}
