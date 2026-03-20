import { Download, FolderOpen } from 'lucide-react'
import Button from '../../components/ui/Button.jsx'
import EditorialCard from '../../components/ui/EditorialCard.jsx'
import { formatDisplayDate } from '../../utils/formatters.js'

function ExportPanel({ exportResult, onExport, onOpenFolder, disabled }) {
  return (
    <EditorialCard className="space-y-5">
      <div className="space-y-2">
        <p className="font-headline text-xs font-bold uppercase tracking-[0.28em] text-[var(--outline)]">Exportación DOCX</p>
        <h3 className="font-headline text-2xl font-extrabold text-[var(--primary)]">Salida lista para escritorio</h3>
        <p className="text-sm leading-6 text-[var(--on-surface-variant)]">
          Genera un documento con portada, fecha, canciones en orden, títulos, metadatos básicos, letra completa y acordes si existen.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={onExport} disabled={disabled}>
          <Download size={16} />
          Exportar DOCX
        </Button>
        <Button variant="outline" onClick={onOpenFolder} disabled={disabled}>
          <FolderOpen size={16} />
          Abrir carpeta `exports`
        </Button>
      </div>

      {exportResult ? (
        <div className="rounded-2xl bg-[var(--surface-container-low)] p-4 text-sm text-[var(--on-surface-variant)]">
          <p className="font-semibold text-[var(--primary)]">{exportResult.fileName}</p>
          <p className="mt-1">{exportResult.filePath}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.16em]">Exportado: {formatDisplayDate(exportResult.exportedAt)}</p>
        </div>
      ) : null}
    </EditorialCard>
  )
}

export default ExportPanel
