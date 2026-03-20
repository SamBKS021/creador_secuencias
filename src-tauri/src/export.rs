use std::fs::File;
use std::path::Path;

use docx_rs::{BreakType, Docx, Paragraph, Run};

use crate::errors::{AppError, AppResult};
use crate::models::{Sequence, Song};

pub fn export_sequence_docx(root: &Path, sequence: &Sequence, songs: &[Song]) -> AppResult<std::path::PathBuf> {
    let safe_name = sequence.title.replace(' ', "_");
    let output_path = root
        .join("exports")
        .join(format!("{safe_name}.docx"));

    let mut doc = Docx::new()
        .add_paragraph(
            Paragraph::new().add_run(
                Run::new()
                    .add_text(sequence.title.clone())
                    .bold()
                    .size(36),
            ),
        )
        .add_paragraph(Paragraph::new().add_run(Run::new().add_text(format!(
            "Fecha del servicio: {}",
            sequence.service_date
        ))))
        .add_paragraph(Paragraph::new().add_run(Run::new().add_text("Orden de canciones").bold()));

    for (index, item) in sequence.items.iter().enumerate() {
        if let Some(song) = songs.iter().find(|song| song.id == item.song_id) {
            doc = doc
                .add_paragraph(Paragraph::new().add_run(Run::new().add_text(format!(
                    "{}. {}",
                    index + 1,
                    song.title
                ))))
                .add_paragraph(Paragraph::new().add_run(Run::new().add_text(format!(
                    "Autor: {}",
                    if song.author.is_empty() {
                        "Sin autor"
                    } else {
                        song.author.as_str()
                    }
                ))))
                .add_paragraph(Paragraph::new().add_run(Run::new().add_text(format!(
                    "Tonalidad: {} | Tempo: {} BPM | Categoría: {}",
                    if song.key.is_empty() { "Sin tonalidad" } else { song.key.as_str() },
                    song.tempo,
                    if song.category.is_empty() {
                        "Sin categoría"
                    } else {
                        song.category.as_str()
                    }
                ))))
                .add_paragraph(Paragraph::new().add_run(Run::new().add_text("Letra").bold()))
                .add_paragraph(Paragraph::new().add_run(Run::new().add_text(song.lyrics.clone())));

            if !song.chords.is_empty() {
                doc = doc
                    .add_paragraph(Paragraph::new().add_run(Run::new().add_text("Acordes").bold()))
                    .add_paragraph(Paragraph::new().add_run(Run::new().add_text(song.chords.clone())));
            }

            if index + 1 < sequence.items.len() {
                doc = doc.add_paragraph(
                    Paragraph::new().add_run(Run::new().add_break(BreakType::Page)),
                );
            }
        }
    }

    let file = File::create(&output_path)?;
    doc.build()
        .pack(file)
        .map_err(|error| AppError::Message(error.to_string()))?;

    Ok(output_path)
}
