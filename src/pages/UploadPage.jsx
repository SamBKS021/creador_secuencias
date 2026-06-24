import { createBlendy } from "blendy";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { sileo } from "sileo";
import { useAppContext } from "../app/store/AppContext.jsx";
import Button from "../components/ui/Button.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import DraftEditor from "../features/upload/DraftEditor.jsx";
import ImportReviewModal from "../features/upload/ImportReviewModal.jsx";
import UploadDropzone from "../features/upload/UploadDropzone.jsx";
import { createEmptySong, getSongCategories } from "../utils/workspace.js";

const BLENDY_ID = "import-review";

const loadModes = [
  {
    id: "documents",
    label: "Importar documentos",
    description: "Importa archivos .docx para detectar varios cantos, revisar coincidencias por título y confirmar cada alta."
  },
  {
    id: "manual",
    label: "Alta manual",
    description: "Completa los datos de un canto y su letra para agregarlo manualmente a tu biblioteca."
  }
];

function normalizeMultiline(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function createReviewForm(candidate, defaultCategory) {
  return createEmptySong({
    title: candidate.titleDetected || "",
    titleNormalized: candidate.titleNormalized || "",
    author: candidate.authorDetected || "",
    category: defaultCategory,
    key: candidate.keyDetected || "C",
    tempo: 72,
    lyrics: candidate.lyrics || "",
    sourceFileName: candidate.sourceFileName || "",
    sourcePath: candidate.sourcePath || ""
  });
}

function flattenImportBatch(result, defaultCategory) {
  return (result.documents || []).flatMap((document) =>
    (document.candidates || []).map((candidate) => ({
      id: candidate.candidateId,
      candidate,
      initialForm: createReviewForm(candidate, defaultCategory),
      form: createReviewForm(candidate, defaultCategory)
    }))
  );
}

function VistaImportarDocumentos({ onBrowse, disabled }) {
  return <UploadDropzone onBrowse={onBrowse} blendySourceId={BLENDY_ID} disabled={disabled} />;
}

function VistaAltaManual({ form, categories, onChange, onSubmit }) {
  return (
    <DraftEditor
      title="Nuevo canto"
      subtitle="Completa los datos del canto y su letra para agregarlo manualmente a tu biblioteca."
      value={form}
      categories={categories}
      onChange={onChange}
      onSubmit={onSubmit}
      submitLabel="Guardar canto"
    />
  );
}

function UploadPage() {
  const { state, actions } = useAppContext();
  const blendyRef = useRef(null);
  const [searchParams] = useSearchParams();
  const songCategories = useMemo(() => getSongCategories(state.songCategories), [state.songCategories]);
  const defaultCategory = songCategories[0] || "Contemporánea";
  const [form, setForm] = useState(() => createEmptySong({ category: defaultCategory }));
  const [reviewState, setReviewState] = useState({
    open: false,
    items: [],
    currentIndex: 0,
    saving: false
  });

  useEffect(() => {
    blendyRef.current = createBlendy({ animation: "dynamic" });
  }, []);

  useEffect(() => {
    if (!reviewState.open) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [reviewState.open]);

  const currentReviewItem = useMemo(
    () => reviewState.items[reviewState.currentIndex] || null,
    [reviewState.currentIndex, reviewState.items]
  );
  const loadMode = searchParams.get("modo") === "manual" ? "manual" : "documents";
  const currentLoadMode = loadModes.find((mode) => mode.id === loadMode) || loadModes[0];

  function updateCurrentReviewForm(nextForm) {
    setReviewState((current) => ({
      ...current,
      items: current.items.map((item, index) =>
        index === current.currentIndex
          ? {
              ...item,
              form: nextForm
            }
          : item
      )
    }));
  }

  function openReviewModal(items) {
    setReviewState({
      open: true,
      items,
      currentIndex: 0,
      saving: false
    });

    requestAnimationFrame(() => {
      blendyRef.current?.update();
      requestAnimationFrame(() => {
        blendyRef.current?.toggle(BLENDY_ID);
      });
    });
  }

  function closeReviewModal() {
    const reset = () =>
      setReviewState({
        open: false,
        items: [],
        currentIndex: 0,
        saving: false
      });

    if (!reviewState.open) {
      reset();
      return;
    }

    if (blendyRef.current) {
      blendyRef.current.untoggle(BLENDY_ID, reset);
      return;
    }

    reset();
  }

  function consumeCurrentReviewItem() {
    const isLastItem = reviewState.items.length <= 1;

    if (isLastItem) {
      closeReviewModal();
      return;
    }

    setReviewState((current) => {
      const nextItems = current.items.filter((_, index) => index !== current.currentIndex);
      return {
        ...current,
        saving: false,
        items: nextItems,
        currentIndex: Math.min(current.currentIndex, nextItems.length - 1)
      };
    });
  }

  async function handleImportBatch() {
    const loadingToastId = sileo.show({
      type: "loading",
      title: "Procesando archivos .docx",
      description: "Analizando títulos, secciones y coincidencias dentro de la biblioteca local.",
      duration: null
    });

    try {
      const batch = await actions.importSongDocxBatch();
      sileo.dismiss(loadingToastId);

      const reviewItems = flattenImportBatch(batch, defaultCategory);
      if (!batch.documents?.length) {
        sileo.info({
          title: "Importación cancelada",
          description: "No se seleccionó ningún archivo para procesar."
        });
        return;
      }

      if (!reviewItems.length) {
        const warningText = batch.documents.flatMap((document) => document.warnings || []).join(" ");

        sileo.warning({
          title: "No se detectaron cantos",
          description: warningText || "No se encontraron bloques válidos para revisar en los archivos seleccionados."
        });
        return;
      }

      sileo.success({
        title: "Importación lista para revisar",
        description: `Se detectaron ${reviewItems.length} cantos en ${batch.documents.length} archivo(s).`
      });

      openReviewModal(reviewItems);
    } catch (error) {
      sileo.dismiss(loadingToastId);
      sileo.error({
        title: "No se pudo importar el archivo",
        description: error?.message || "Solo se admiten archivos .docx válidos en este flujo."
      });
    }
  }

  async function handleSaveReviewItem() {
    if (!currentReviewItem) {
      return;
    }

    const { form: reviewForm, initialForm, candidate } = currentReviewItem;
    const editedLyrics = normalizeMultiline(reviewForm.lyrics) !== normalizeMultiline(initialForm.lyrics);

    setReviewState((current) => ({
      ...current,
      saving: true
    }));

    try {
      await actions.saveSong({
        ...reviewForm,
        contentDraft: editedLyrics ? null : candidate.contentDraft
      });

      sileo.success({
        title: "Canto guardado",
        description: `${reviewForm.title || "El canto"} ya está disponible en la biblioteca.`
      });

      consumeCurrentReviewItem();
    } catch (error) {
      setReviewState((current) => ({
        ...current,
        saving: false
      }));

      sileo.error({
        title: "No se pudo guardar el canto",
        description: error?.message || "Revisa los datos del canto e inténtalo de nuevo."
      });
    }
  }

  async function handleOverwriteReviewItem() {
    if (!currentReviewItem?.candidate?.matchedSongId) {
      return;
    }

    const existingSong = state.songs.find((song) => song.id === currentReviewItem.candidate.matchedSongId);

    if (!existingSong) {
      sileo.error({
        title: "No se encontró el canto existente",
        description: "La coincidencia detectada ya no está disponible en la biblioteca actual."
      });
      return;
    }

    const { form: reviewForm, initialForm, candidate } = currentReviewItem;
    const editedLyrics = normalizeMultiline(reviewForm.lyrics) !== normalizeMultiline(initialForm.lyrics);

    setReviewState((current) => ({
      ...current,
      saving: true
    }));

    try {
      await actions.updateSong({
        ...existingSong,
        ...reviewForm,
        id: existingSong.id,
        createdAt: existingSong.createdAt,
        contentDraft: editedLyrics ? null : candidate.contentDraft
      });

      sileo.success({
        title: "Canto sobreescrito",
        description: `${reviewForm.title || existingSong.title} se actualizó en la biblioteca.`
      });

      consumeCurrentReviewItem();
    } catch (error) {
      setReviewState((current) => ({
        ...current,
        saving: false
      }));

      sileo.error({
        title: "No se pudo sobreescribir el canto",
        description: error?.message || "No fue posible actualizar el canto existente. Inténtalo de nuevo."
      });
    }
  }

  function handleUseExisting() {
    if (!currentReviewItem?.candidate?.matchedSongId) {
      return;
    }

    sileo.info({
      title: "Se usará el canto existente",
      description: `${currentReviewItem.candidate.matchedSongTitle} se conservará y este canto saldrá de la revisión sin crear duplicados.`
    });

    consumeCurrentReviewItem();
  }

  function handleSkip() {
    if (!currentReviewItem) {
      return;
    }

    sileo.info({
      title: "Canto omitido",
      description: `${currentReviewItem.form.title || "El canto detectado"} quedó fuera de esta importación.`
    });

    consumeCurrentReviewItem();
  }

  if (!state.workspaceRoot) {
    return (
      <EmptyState
        title="Prepara el almacenamiento antes de importar cantos"
        description="La app necesita inicializar su espacio de trabajo local para guardar biblioteca, secuencias y exportaciones."
        action={<Button onClick={actions.chooseWorkspace}>Preparar almacenamiento</Button>}
      />
    );
  }

  return (
    <>
      <div className="space-y-8">
        <PageHeader
          title="Centro de carga"
          description={currentLoadMode.description}
        />

        {loadMode === "documents" ? (
          <VistaImportarDocumentos onBrowse={handleImportBatch} disabled={reviewState.saving} />
        ) : (
          <VistaAltaManual
            form={form}
            categories={songCategories}
            onChange={setForm}
            onSubmit={async () => {
              await actions.saveSong(form);
              setForm(createEmptySong({ category: defaultCategory }));
            }}
          />
        )}
      </div>

      <ImportReviewModal
        open={reviewState.open}
        reviewItem={currentReviewItem}
        currentIndex={reviewState.currentIndex}
        totalItems={reviewState.items.length}
        saving={reviewState.saving}
        onClose={closeReviewModal}
        onChange={updateCurrentReviewForm}
        onPrevious={() =>
          setReviewState((current) => ({
            ...current,
            currentIndex: Math.max(current.currentIndex - 1, 0)
          }))
        }
        onNext={() =>
          setReviewState((current) => ({
            ...current,
            currentIndex: Math.min(current.currentIndex + 1, current.items.length - 1)
          }))
        }
        onSkip={handleSkip}
        onUseExisting={handleUseExisting}
        onOverwriteExisting={handleOverwriteReviewItem}
        onSaveNew={handleSaveReviewItem}
        categories={songCategories}
      />
    </>
  );
}

export default UploadPage;
