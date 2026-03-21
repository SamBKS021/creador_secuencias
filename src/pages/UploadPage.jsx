import { createBlendy } from 'blendy'
import { useEffect, useMemo, useRef, useState } from 'react'
import { sileo } from 'sileo'
import { useAppContext } from '../app/store/AppContext.jsx'
import Button from '../components/ui/Button.jsx'
import EditorialCard from '../components/ui/EditorialCard.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import DraftEditor from '../features/upload/DraftEditor.jsx'
import ImportReviewModal from '../features/upload/ImportReviewModal.jsx'
import UploadDropzone from '../features/upload/UploadDropzone.jsx'
import { createEmptySong } from '../utils/workspace.js'

const BLENDY_ID = 'import-review'

function normalizeMultiline(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim()
}

function createReviewForm(candidate) {
  return createEmptySong({
    title: candidate.titleDetected || '',
    titleNormalized: candidate.titleNormalized || '',
    author: candidate.authorDetected || '',
    category: 'Contemporánea',
    key: candidate.keyDetected || 'C',
    tempo: 72,
    lyrics: candidate.lyrics || '',
    chords: candidate.chords || '',
    sourceFileName: candidate.sourceFileName || '',
    sourcePath: candidate.sourcePath || '',
  })
}

function flattenImportBatch(result) {
  return (result.documents || []).flatMap((document) =>
    (document.candidates || []).map((candidate) => ({
      id: candidate.candidateId,
      candidate,
      initialForm: createReviewForm(candidate),
      form: createReviewForm(candidate),
    })),
  )
}

function UploadPage() {
  const { state, actions } = useAppContext()
  const blendyRef = useRef(null)
  const [form, setForm] = useState(createEmptySong())
  const [reviewState, setReviewState] = useState({
    open: false,
    items: [],
    currentIndex: 0,
    saving: false,
  })

  useEffect(() => {
    blendyRef.current = createBlendy({ animation: 'dynamic' })
  }, [])

  const currentReviewItem = useMemo(
    () => reviewState.items[reviewState.currentIndex] || null,
    [reviewState.currentIndex, reviewState.items],
  )

  function updateCurrentReviewForm(nextForm) {
    setReviewState((current) => ({
      ...current,
      items: current.items.map((item, index) =>
        index === current.currentIndex
          ? {
              ...item,
              form: nextForm,
            }
          : item,
      ),
    }))
  }

  function openReviewModal(items) {
    setReviewState({
      open: true,
      items,
      currentIndex: 0,
      saving: false,
    })

    requestAnimationFrame(() => {
      blendyRef.current?.update()
      requestAnimationFrame(() => {
        blendyRef.current?.toggle(BLENDY_ID)
      })
    })
  }

  function closeReviewModal() {
    const reset = () =>
      setReviewState({
        open: false,
        items: [],
        currentIndex: 0,
        saving: false,
      })

    if (!reviewState.open) {
      reset()
      return
    }

    if (blendyRef.current) {
      blendyRef.current.untoggle(BLENDY_ID, reset)
      return
    }

    reset()
  }

  function consumeCurrentReviewItem() {
    const isLastItem = reviewState.items.length <= 1

    if (isLastItem) {
      closeReviewModal()
      return
    }

    setReviewState((current) => {
      const nextItems = current.items.filter((_, index) => index !== current.currentIndex)
      return {
        ...current,
        saving: false,
        items: nextItems,
        currentIndex: Math.min(current.currentIndex, nextItems.length - 1),
      }
    })
  }

  async function handleImportBatch() {
    const loadingToastId = sileo.show({
      type: 'loading',
      title: 'Procesando archivos .docx',
      description: 'Analizando títulos, secciones y coincidencias dentro de la biblioteca local.',
      duration: null,
    })

    try {
      const batch = await actions.importSongDocxBatch()
      sileo.dismiss(loadingToastId)

      const reviewItems = flattenImportBatch(batch)
      if (!batch.documents?.length) {
        sileo.info({
          title: 'Importación cancelada',
          description: 'No se seleccionó ningún archivo para procesar.',
        })
        return
      }

      if (!reviewItems.length) {
        const warningText = batch.documents
          .flatMap((document) => document.warnings || [])
          .join(' ')

        sileo.warning({
          title: 'No se detectaron cantos',
          description: warningText || 'No se encontraron bloques válidos para revisión en los archivos seleccionados.',
        })
        return
      }

      sileo.success({
        title: 'Importación lista para revisar',
        description: `Se detectaron ${reviewItems.length} cantos en ${batch.documents.length} archivo(s).`,
      })

      openReviewModal(reviewItems)
    } catch (error) {
      sileo.dismiss(loadingToastId)
      sileo.error({
        title: 'No se pudo importar el archivo',
        description: error?.message || 'Solo se soportan archivos .docx válidos en este flujo.',
      })
    }
  }

  async function handleSaveReviewItem() {
    if (!currentReviewItem) {
      return
    }

    const { form: reviewForm, initialForm, candidate } = currentReviewItem
    const editedLyrics = normalizeMultiline(reviewForm.lyrics) !== normalizeMultiline(initialForm.lyrics)
    const editedChords = normalizeMultiline(reviewForm.chords) !== normalizeMultiline(initialForm.chords)

    setReviewState((current) => ({
      ...current,
      saving: true,
    }))

    try {
      await actions.saveSong({
        ...reviewForm,
        contentDraft: editedLyrics || editedChords ? null : candidate.contentDraft,
      })

      sileo.success({
        title: 'Canto guardado',
        description: `${reviewForm.title || 'El canto'} ya está disponible en la biblioteca.`,
      })

      consumeCurrentReviewItem()
    } catch (error) {
      setReviewState((current) => ({
        ...current,
        saving: false,
      }))

      sileo.error({
        title: 'No se pudo guardar el canto',
        description: error?.message || 'Revisa los datos del canto e inténtalo de nuevo.',
      })
    }
  }

  function handleUseExisting() {
    if (!currentReviewItem?.candidate?.matchedSongId) {
      return
    }

    sileo.info({
      title: 'Se usará el canto existente',
      description: `La coincidencia detectada fue ${currentReviewItem.candidate.matchedSongTitle}. No se creó un duplicado.`,
    })

    consumeCurrentReviewItem()
  }

  function handleSkip() {
    if (!currentReviewItem) {
      return
    }

    sileo.info({
      title: 'Canto omitido',
      description: `${currentReviewItem.form.title || 'El canto detectado'} quedó fuera de esta importación.`,
    })

    consumeCurrentReviewItem()
  }

  if (!state.workspaceRoot) {
    return (
      <EmptyState
        title="Configura tu raíz antes de importar canciones"
        description="La app guarda la biblioteca principal dentro de la carpeta de trabajo elegida y deja en AppData solo configuración y preferencias."
        action={<Button onClick={actions.chooseWorkspace}>Elegir carpeta de trabajo</Button>}
      />
    )
  }

  return (
    <>
      <div className="space-y-8">
        <PageHeader
          title="Centro de carga"
          description="Carga archivos .docx para detectar varios cantos, revisar coincidencias por título y confirmar cada alta de forma individual."
        />

        <UploadDropzone onBrowse={handleImportBatch} blendySourceId={BLENDY_ID} disabled={reviewState.saving} />

        <div className="grid gap-6 xl:grid-cols-[0.55fr_1fr]">
          <EditorialCard className="space-y-4">
            <h3 className="font-headline text-2xl font-extrabold text-[var(--primary)]">Modo manual</h3>
            <p className="text-sm leading-7 text-[var(--on-surface-variant)]">
              Cada canto se persiste dentro de `biblioteca/canto-XXXX/` con `meta.json` y `content.json` como fuente
              de verdad.
            </p>
            <p className="text-sm leading-7 text-[var(--on-surface-variant)]">
              El flujo batch solo soporta `.docx`, detecta coincidencias por título y abre una revisión paginada antes
              de guardar.
            </p>
          </EditorialCard>

          <DraftEditor
            title="Nuevo canto"
            subtitle="Completa título, autor, tonalidad, tempo, letra y acordes. El backend lo convertirá al formato canónico JSON del workspace."
            value={form}
            onChange={setForm}
            onSubmit={async () => {
              await actions.saveSong(form)
              setForm(createEmptySong())
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
            currentIndex: Math.max(current.currentIndex - 1, 0),
          }))
        }
        onNext={() =>
          setReviewState((current) => ({
            ...current,
            currentIndex: Math.min(current.currentIndex + 1, current.items.length - 1),
          }))
        }
        onSkip={handleSkip}
        onUseExisting={handleUseExisting}
        onSaveNew={handleSaveReviewItem}
      />
    </>
  )
}

export default UploadPage
