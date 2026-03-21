import { useState } from "react";
import { sileo } from "sileo";
import { Download } from "lucide-react";
import { FaFileWord } from "react-icons/fa";
import Button from "../../components/ui/Button.jsx";
import EditorialCard from "../../components/ui/EditorialCard.jsx";
import { formatDisplayDate } from "../../utils/formatters.js";

function ExportOverwriteModal({ exportCheck, onCancel, onConfirm, loading }) {
  if (!exportCheck) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-[rgba(10,24,40,0.38)] px-4">
      <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-[0_30px_80px_-30px_rgba(0,36,70,0.45)]">
        <div className="space-y-3">
          <p className="font-headline text-xs font-bold uppercase tracking-[0.28em] text-[var(--outline)]">
            Exportacion existente
          </p>
          <h4 className="font-headline text-2xl font-extrabold text-[var(--primary)]">
            Ese DOCX ya existe
          </h4>
          <p className="text-sm leading-6 text-[var(--on-surface-variant)]">
            Ya hay una secuencia con ese nombre en la carpeta `exports`. Si
            confirmas, se reescribira el archivo actual.
          </p>
        </div>

        <div className="mt-5 rounded-2xl bg-[var(--surface-container-low)] p-4 text-sm text-[var(--on-surface-variant)]">
          <p className="font-semibold text-[var(--primary)]">
            {exportCheck.fileName}
          </p>
          <p className="mt-1 break-all">{exportCheck.filePath}</p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            Reescribir secuencia
          </Button>
        </div>
      </div>
    </div>
  );
}

function ExportPanel({
  exportResult,
  exportStatus,
  onExport,
  onCheckExisting,
  onOpenDocument,
  disabled
}) {
  const [exportCheck, setExportCheck] = useState(null);
  const [loading, setLoading] = useState(false);

  async function runExport(overwrite = false) {
    setLoading(true);

    const loadingToastId = sileo.show({
      type: "loading",
      title: overwrite
        ? "Reescribiendo secuencia DOCX"
        : "Exportando secuencia DOCX",
      description:
        "Generando el documento y abriendolo automaticamente al terminar.",
      duration: null
    });

    try {
      const result = await onExport(overwrite);
      sileo.dismiss(loadingToastId);
      sileo.success({
        title: result?.overwritten
          ? "Secuencia reescrita"
          : "Secuencia exportada",
        description: `${result?.fileName || "El documento"} se genero correctamente y ya fue abierto.`
      });
      setExportCheck(null);
    } catch (error) {
      sileo.dismiss(loadingToastId);
      sileo.error({
        title: "No se pudo exportar la secuencia",
        description:
          error?.message ||
          "Intenta de nuevo cuando la secuencia tenga un nombre valido y canciones."
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleExportClick() {
    if (disabled || loading) {
      return;
    }

    try {
      const existing = await onCheckExisting();
      if (existing?.exists) {
        setExportCheck(existing);
        return;
      }

      await runExport(false);
    } catch (error) {
      sileo.error({
        title: "No se pudo preparar la exportacion",
        description:
          error?.message || "No fue posible revisar el archivo de salida."
      });
    }
  }

  async function handleOpenDocument() {
    try {
      await onOpenDocument();
    } catch (error) {
      sileo.error({
        title: "No se pudo abrir el documento",
        description:
          error?.message || "No existe un DOCX exportado para esta secuencia."
      });
    }
  }

  const visibleExport =
    exportResult || (exportStatus?.exists ? exportStatus : null);

  return (
    <>
      <EditorialCard className="space-y-5">
        <div className="space-y-2">
          <p className="font-headline text-xs font-bold uppercase tracking-[0.28em] text-[var(--outline)]">
            Exportacion DOCX
          </p>
          <h3 className="font-headline text-2xl font-extrabold text-[var(--primary)]">
            Secuencia lista para escritorio
          </h3>
          <p className="text-sm leading-6 text-[var(--on-surface-variant)]">
            Genera un Word compacto en columnas con encabezado, titulos de
            canto, tono y letra en el flujo real de la secuencia.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleExportClick} disabled={disabled || loading}>
            <Download size={16} />
            Exportar DOCX
          </Button>
          {exportStatus?.exists ? (
            <Button
              variant="outline"
              onClick={handleOpenDocument}
              disabled={loading}
            >
              <FaFileWord size={16} />
              Abrir documento
            </Button>
          ) : null}
        </div>

        {visibleExport ? (
          <div className="rounded-2xl bg-[var(--surface-container-low)] p-4 text-sm text-[var(--on-surface-variant)]">
            <p className="font-semibold text-[var(--primary)]">
              {visibleExport.fileName}
            </p>
            <p className="mt-1">{visibleExport.filePath}</p>
            {"exportedAt" in visibleExport && visibleExport.exportedAt ? (
              <p className="mt-2 text-xs uppercase tracking-[0.16em]">
                Exportado: {formatDisplayDate(visibleExport.exportedAt)}
              </p>
            ) : null}
          </div>
        ) : null}
      </EditorialCard>

      <ExportOverwriteModal
        exportCheck={exportCheck}
        loading={loading}
        onCancel={() => setExportCheck(null)}
        onConfirm={() => runExport(true)}
      />
    </>
  );
}

export default ExportPanel;
