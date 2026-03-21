import { createBlendy } from "blendy";
import { useEffect, useMemo, useRef, useState } from "react";
import { sileo } from "sileo";
import { useAppContext } from "../app/store/AppContext.jsx";
import Button from "../components/ui/Button.jsx";
import EditorialCard from "../components/ui/EditorialCard.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import DraftEditor from "../features/upload/DraftEditor.jsx";
import ImportReviewModal from "../features/upload/ImportReviewModal.jsx";
import UploadDropzone from "../features/upload/UploadDropzone.jsx";
import { createEmptySong } from "../utils/workspace.js";

const BLENDY_ID = "import-review";

function normalizeMultiline(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function createReviewForm(candidate) {
  return createEmptySong({
    title: candidate.titleDetected || "",
    titleNormalized: candidate.titleNormalized || "",
    author: candidate.authorDetected || "",
    category: "Contemporanea",
    key: candidate.keyDetected || "C",
    tempo: 72,
    lyrics: candidate.lyrics || "",
    sourceFileName: candidate.sourceFileName || "",
    sourcePath: candidate.sourcePath || ""
  });
}

function flattenImportBatch(result) {
  return (result.documents || []).flatMap((document) =>
    (document.candidates || []).map((candidate) => ({
      id: candidate.candidateId,
      candidate,
      initialForm: createReviewForm(candidate),
      form: createReviewForm(candidate)
    }))
  );
}

function UploadPage() {
  const { state, actions } = useAppContext();
  const blendyRef = useRef(null);
  const [form, setForm] = useState(createEmptySong());
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
      const nextItems = current.items.filter(
        (_, index) => index !== current.currentIndex
      );
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
      description:
        "Analizando titulos, secciones y coincidencias dentro de la biblioteca local.",
      duration: null
    });

    try {
      const batch = await actions.importSongDocxBatch();
      sileo.dismiss(loadingToastId);

      const reviewItems = flattenImportBatch(batch);
      if (!batch.documents?.length) {
        sileo.info({
          title: "Importacion cancelada",
          description: "No se selecciono ningun archivo para procesar."
        });
        return;
      }

      if (!reviewItems.length) {
        const warningText = batch.documents
          .flatMap((document) => document.warnings || [])
          .join(" ");

        sileo.warning({
          title: "No se detectaron cantos",
          description:
            warningText ||
            "No se encontraron bloques validos para revision en los archivos seleccionados."
        });
        return;
      }

      sileo.success({
        title: "Importacion lista para revisar",
        description: `Se detectaron ${reviewItems.length} cantos en ${batch.documents.length} archivo(s).`
      });

      openReviewModal(reviewItems);
    } catch (error) {
      sileo.dismiss(loadingToastId);
      sileo.error({
        title: "No se pudo importar el archivo",
        description:
          error?.message ||
          "Solo se soportan archivos .docx validos en este flujo."
      });
    }
  }

  async function handleSaveReviewItem() {
    if (!currentReviewItem) {
      return;
    }

    const { form: reviewForm, initialForm, candidate } = currentReviewItem;
    const editedLyrics =
      normalizeMultiline(reviewForm.lyrics) !==
      normalizeMultiline(initialForm.lyrics);

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
        description: `${reviewForm.title || "El canto"} ya esta disponible en la biblioteca.`
      });

      consumeCurrentReviewItem();
    } catch (error) {
      setReviewState((current) => ({
        ...current,
        saving: false
      }));

      sileo.error({
        title: "No se pudo guardar el canto",
        description:
          error?.message || "Revisa los datos del canto e intentalo de nuevo."
      });
    }
  }

  async function handleOverwriteReviewItem() {
    if (!currentReviewItem?.candidate?.matchedSongId) {
      return;
    }

    const existingSong = state.songs.find(
      (song) => song.id === currentReviewItem.candidate.matchedSongId
    );

    if (!existingSong) {
      sileo.error({
        title: "No se encontro el canto existente",
        description:
          "La coincidencia detectada ya no esta disponible en la biblioteca actual."
      });
      return;
    }

    const { form: reviewForm, initialForm, candidate } = currentReviewItem;
    const editedLyrics =
      normalizeMultiline(reviewForm.lyrics) !==
      normalizeMultiline(initialForm.lyrics);

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
        description: `${reviewForm.title || existingSong.title} se actualizo en la biblioteca.`
      });

      consumeCurrentReviewItem();
    } catch (error) {
      setReviewState((current) => ({
        ...current,
        saving: false
      }));

      sileo.error({
        title: "No se pudo sobreescribir el canto",
        description:
          error?.message ||
          "No fue posible actualizar el canto existente. Intentalo de nuevo."
      });
    }
  }

  function handleUseExisting() {
    if (!currentReviewItem?.candidate?.matchedSongId) {
      return;
    }

    sileo.info({
      title: "Se usara el canto existente",
      description: `${currentReviewItem.candidate.matchedSongTitle} se conservara y este canto saldra de la revision sin crear duplicados.`
    });

    consumeCurrentReviewItem();
  }

  function handleSkip() {
    if (!currentReviewItem) {
      return;
    }

    sileo.info({
      title: "Canto omitido",
      description: `${currentReviewItem.form.title || "El canto detectado"} quedo fuera de esta importacion.`
    });

    consumeCurrentReviewItem();
  }

  if (!state.workspaceRoot) {
    return (
      <EmptyState
        title="Configura tu raiz antes de importar canciones"
        description="La app guarda la biblioteca principal dentro de la carpeta de trabajo elegida y deja en AppData solo configuracion y preferencias."
        action={
          <Button onClick={actions.chooseWorkspace}>
            Elegir carpeta de trabajo
          </Button>
        }
      />
    );
  }

  return (
    <>
      <div className="space-y-8">
        <PageHeader
          title="Centro de carga"
          description="Carga archivos .docx para detectar varios cantos, revisar coincidencias por titulo y confirmar cada alta de forma individual."
        />

        <UploadDropzone
          onBrowse={handleImportBatch}
          blendySourceId={BLENDY_ID}
          disabled={reviewState.saving}
        />

        <div className="grid gap-6 xl:grid-cols-[0.55fr_1fr]">
          <EditorialCard className="space-y-4">
            <h3 className="font-headline text-2xl font-extrabold text-[var(--primary)]">
              Modo Manual
            </h3>
            <p className="text-sm leading-7 text-[var(--on-surface-variant)]">
              Crea un canto manualmente llenando su titulo, autor, tono, tempo
              y letra desde esta pantalla.
            </p>
            <p className="text-sm leading-7 text-[var(--on-surface-variant)]">
              Si prefieres importar varias canciones desde un documento Word,
              usa la carga `.docx`: la app detecta los cantos y te permite
              revisarlos antes de guardarlos.
            </p>
          </EditorialCard>

          <DraftEditor
            title="Nuevo canto"
            subtitle="Completa titulo, autor, tonalidad, tempo y letra. El backend lo convertira al formato canonico JSON del workspace."
            value={form}
            onChange={setForm}
            onSubmit={async () => {
              await actions.saveSong(form);
              setForm(createEmptySong());
            }}
            submitLabel="Guardar canto"
          />
        </div>
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
            currentIndex: Math.min(
              current.currentIndex + 1,
              current.items.length - 1
            )
          }))
        }
        onSkip={handleSkip}
        onUseExisting={handleUseExisting}
        onOverwriteExisting={handleOverwriteReviewItem}
        onSaveNew={handleSaveReviewItem}
      />
    </>
  );
}

export default UploadPage;
