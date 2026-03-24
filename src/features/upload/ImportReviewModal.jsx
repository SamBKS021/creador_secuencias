import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  FileText,
  Link2,
  Pencil,
  Save,
  SkipForward,
  Sparkles,
  X,
} from "lucide-react";
import Button from "../../components/ui/Button.jsx";
import DraftEditor from "./DraftEditor.jsx";

function WarningBlock({ reviewItem }) {
  const hasMatch = Boolean(reviewItem?.candidate?.matchedSongId);
  const warnings = (reviewItem?.candidate?.warnings || []).filter(
    (warning) => warning !== "Ya existe un canto con este título. Guardar como nuevo sigue permitido.",
  );

  if (!hasMatch && !warnings.length) {
    return null;
  }

  return (
    <div
      className="rounded-[24px] border px-5 py-4 text-sm"
      style={{
        borderColor: "var(--warning-border)",
        background: "var(--warning-surface)",
        color: "var(--warning-text)",
      }}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" style={{ color: "var(--warning-icon)" }} />
        <div className="space-y-2">
          {hasMatch ? (
            <p>
              Encontramos un canto con este título en tu biblioteca:{" "}
              <strong>{reviewItem.candidate.matchedSongTitle}</strong>. Puedes usar el existente, sobrescribirlo con esta
              versión o guardar uno nuevo aparte.
            </p>
          ) : null}
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function ImportReviewModal({
  open,
  reviewItem,
  currentIndex,
  totalItems,
  onClose,
  onChange,
  onPrevious,
  onNext,
  onSkip,
  onUseExisting,
  onOverwriteExisting,
  onSaveNew,
  saving,
  categories,
}) {
  if (!open || !reviewItem) {
    return null;
  }

  const { candidate, form } = reviewItem;

  return (
    <div className="fixed inset-0 z-[80] overflow-hidden p-4 sm:p-6">
      <button
        type="button"
        aria-label="Cerrar revisión"
        className="absolute inset-0 bg-[rgba(7,20,32,0.52)] backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 flex h-full w-full items-center justify-center">
        <div data-blendy-to="import-review" className="w-full max-w-5xl">
          <div className="flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[34px] bg-[var(--surface)] p-4 shadow-[0_32px_80px_-36px_rgba(0,24,49,0.6)] sm:max-h-[calc(100vh-3rem)] sm:p-6">
            <div className="mb-4 flex shrink-0 flex-col gap-4 rounded-[28px] bg-[var(--surface-container-high)] px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-container-lowest)] px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-[var(--primary)]">
                  <Sparkles size={14} />
                  Revisión guiada
                </div>
                <div>
                  <h3 className="font-headline text-2xl font-extrabold text-[var(--primary)]">
                    {form.title || "Sin título"}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
                    Canto {currentIndex + 1} de {totalItems}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" onClick={onPrevious} disabled={currentIndex === 0 || saving}>
                  <ArrowLeft size={16} />
                  Anterior
                </Button>
                <Button variant="ghost" onClick={onNext} disabled={currentIndex >= totalItems - 1 || saving}>
                  Siguiente
                  <ArrowRight size={16} />
                </Button>
                <Button variant="ghost" onClick={onClose} disabled={saving}>
                  <X size={16} />
                  Cerrar
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="mb-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[24px] bg-[var(--surface-container-low)] px-5 py-4 text-sm text-[var(--on-surface-variant)]">
                  <div className="flex items-center gap-2 font-semibold text-[var(--primary)]">
                    <FileText size={16} />
                    {candidate.sourceFileName}
                  </div>
                  <p className="mt-2 leading-6">Origen: bloque detectado #{candidate.order} dentro del archivo importado.</p>
                </div>

                <div className="rounded-[24px] bg-[var(--surface-container-low)] px-5 py-4 text-sm text-[var(--on-surface-variant)]">
                  <div className="flex items-center gap-2 font-semibold text-[var(--primary)]">
                    <Link2 size={16} />
                    Coincidencia
                  </div>
                  <p className="mt-2 leading-6">
                    {candidate.matchedSongId
                      ? `Se detectó un canto existente: ${candidate.matchedSongTitle}.`
                      : "No se encontró una coincidencia exacta por título en la biblioteca actual."}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <WarningBlock reviewItem={reviewItem} />
              </div>

              <DraftEditor
                title="Revisar canto detectado"
                subtitle="Ajusta título, autor, tonalidad y letra antes de decidir si lo guardas como nuevo o si aprovechas una coincidencia existente."
                value={form}
                categories={categories}
                onChange={onChange}
                onSubmit={onSaveNew}
                submitLabel={saving ? "Guardando..." : candidate.matchedSongId ? "Guardar como nuevo" : "Guardar"}
                submitDisabled={saving}
                hideSubmitButton
              />

              <div className="mt-4 flex flex-col gap-3 rounded-[20px] bg-[var(--surface-container-high)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs leading-5 text-[var(--on-surface-variant)] sm:max-w-[52%]">
                  {candidate.matchedSongId
                    ? "Usar el existente saca este canto de la revisión sin crear duplicados."
                    : "Guarda este canto o descártalo si no quieres importarlo."}
                </div>
                <div className="flex flex-col items-stretch gap-2 sm:min-w-[340px] sm:max-w-[340px]">
                  {candidate.matchedSongId ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          className="min-w-0 flex-1 rounded-lg px-3 py-2 text-xs whitespace-nowrap bg-[rgba(31,111,235,0.12)] text-[rgb(31,111,235)] hover:bg-[rgba(31,111,235,0.18)]"
                          onClick={onUseExisting}
                          disabled={saving}
                        >
                          <Link2 size={14} />
                          Usar existente
                        </Button>
                        <Button
                          variant="outline"
                          className="min-w-0 flex-1 rounded-lg px-3 py-2 text-xs whitespace-nowrap"
                          onClick={onOverwriteExisting}
                          disabled={saving}
                        >
                          <Pencil size={13} />
                          Sobrescribir
                        </Button>
                      </div>
                      <Button className="rounded-lg px-3 py-2 text-xs whitespace-nowrap" onClick={onSaveNew} disabled={saving}>
                        <Save size={14} />
                        {saving ? "Guardando..." : "Guardar como nuevo"}
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        className="min-w-0 flex-1 rounded-lg px-3 py-2 text-xs whitespace-nowrap"
                        onClick={onSkip}
                        disabled={saving}
                      >
                        <SkipForward size={13} />
                        Omitir
                      </Button>
                      <Button className="min-w-0 flex-1 rounded-lg px-3 py-2 text-xs whitespace-nowrap" onClick={onSaveNew} disabled={saving}>
                        <Save size={13} />
                        {saving ? "Guardando..." : "Guardar"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImportReviewModal;
