import { AlertTriangle, ArrowLeft, ArrowRight, FileText, Link2, SkipForward, Sparkles, X } from 'lucide-react'
import Button from '../../components/ui/Button.jsx'
import DraftEditor from './DraftEditor.jsx'

function WarningBlock({ reviewItem }) {
  if (!reviewItem?.candidate?.matchedSongId && !reviewItem?.candidate?.warnings?.length) {
    return null
  }

  return (
    <div className="rounded-[24px] border border-[rgba(171,111,0,0.18)] bg-[rgba(255,243,213,0.95)] px-5 py-4 text-sm text-[var(--on-surface)]">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[rgb(171,111,0)]" />
        <div className="space-y-2">
          {reviewItem.candidate.matchedSongId ? (
            <p>
              Ya existe coincidencia por título con <strong>{reviewItem.candidate.matchedSongTitle}</strong>. Puedes usar
              ese canto o guardar uno nuevo de todas formas.
            </p>
          ) : null}
          {reviewItem.candidate.warnings?.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      </div>
    </div>
  )
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
  onSaveNew,
  saving,
}) {
  if (!open || !reviewItem) {
    return null
  }

  const { candidate, form } = reviewItem

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Cerrar revisión"
        className="absolute inset-0 bg-[rgba(7,20,32,0.52)] backdrop-blur-sm"
        onClick={onClose}
      />

      <div data-blendy-to="import-review" className="relative z-10 w-full max-w-5xl">
        <div className="max-h-[90vh] overflow-y-auto rounded-[34px] bg-[var(--surface)] p-4 shadow-[0_32px_80px_-36px_rgba(0,24,49,0.6)] sm:p-6">
          <div className="mb-4 flex flex-col gap-4 rounded-[28px] bg-[var(--surface-container-high)] px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-[var(--primary)]">
                <Sparkles size={14} />
                Revisión guiada
              </div>
              <div>
                <h3 className="font-headline text-2xl font-extrabold text-[var(--primary)]">{form.title || 'Sin título'}</h3>
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
                  : 'No se encontró una coincidencia exacta por título en la biblioteca actual.'}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <WarningBlock reviewItem={reviewItem} />
          </div>

          <DraftEditor
            title="Revisar canto detectado"
            subtitle="Ajusta título, autor, tonalidad, letra y acordes antes de decidir si lo guardas como nuevo o usas una coincidencia existente."
            value={form}
            onChange={onChange}
            onSubmit={onSaveNew}
            submitLabel={saving ? 'Guardando...' : 'Guardar como nuevo'}
            submitDisabled={saving}
          />

          <div className="mt-4 flex flex-col gap-3 rounded-[28px] bg-[var(--surface-container-high)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm leading-6 text-[var(--on-surface-variant)]">
              Si editas manualmente la letra o los acordes, el guardado puede simplificar la estructura a una sección
              `custom` para evitar offsets incorrectos.
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" onClick={onSkip} disabled={saving}>
                <SkipForward size={16} />
                Omitir
              </Button>
              <Button variant="outline" onClick={onUseExisting} disabled={!candidate.matchedSongId || saving}>
                <Link2 size={16} />
                Usar existente
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImportReviewModal
