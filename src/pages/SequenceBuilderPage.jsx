import { arrayMove } from '@dnd-kit/sortable'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sileo } from 'sileo'
import { useAppContext } from '../app/store/AppContext.jsx'
import Button from '../components/ui/Button.jsx'
import EditorialCard from '../components/ui/EditorialCard.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import ExportPanel from '../features/sequence-builder/ExportPanel.jsx'
import SequenceList from '../features/sequence-builder/SequenceList.jsx'
import { createEmptySequence, generateSequenceMetrics } from '../utils/workspace.js'

const PAGE_SIZE = 6

function CompactPagination({ page, totalPages, onChange, label = 'Página' }) {
  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--surface-container-low)] px-3 py-3">
      <p className="text-xs font-medium text-[var(--on-surface-variant)]">
        {label} {page} de {totalPages}
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="inline-flex h-9 items-center justify-center gap-1 rounded-xl px-3 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--hover-surface)] disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
        >
          <ChevronLeft size={15} />
          Anterior
        </button>
        <button
          type="button"
          className="inline-flex h-9 items-center justify-center gap-1 rounded-xl px-3 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--hover-surface)] disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
        >
          Siguiente
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}

function SequenceBuilderPage() {
  const navigate = useNavigate()
  const { state, activeSequence, actions } = useAppContext()
  const [sequence, setSequence] = useState(activeSequence)
  const [search, setSearch] = useState('')
  const [libraryPage, setLibraryPage] = useState(1)
  const [sequencePage, setSequencePage] = useState(1)
  const [exportStatus, setExportStatus] = useState(null)

  useEffect(() => {
    setSequence(activeSequence)
    actions.clearExportResult()
  }, [activeSequence])

  useEffect(() => {
    let cancelled = false

    async function syncExportStatus() {
      if (!activeSequence?.id) {
        if (!cancelled) {
          setExportStatus(null)
        }
        return
      }

      try {
        const status = await actions.checkSequenceExport(activeSequence.id)
        if (!cancelled) {
          setExportStatus(status)
        }
      } catch {
        if (!cancelled) {
          setExportStatus(null)
        }
      }
    }

    syncExportStatus()

    return () => {
      cancelled = true
    }
  }, [activeSequence?.id])

  const sequenceMetrics = generateSequenceMetrics(sequence, state.songs)

  const filteredLibrary = useMemo(
    () =>
      state.songs.filter((song) =>
        [song.title, song.author, song.key]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [state.songs, search],
  )

  const libraryTotalPages = Math.max(1, Math.ceil(filteredLibrary.length / PAGE_SIZE))
  const sequenceTotalPages = Math.max(1, Math.ceil(sequence.items.length / PAGE_SIZE))

  useEffect(() => {
    setLibraryPage(1)
  }, [search, state.songs])

  useEffect(() => {
    setLibraryPage((current) => Math.min(current, libraryTotalPages))
  }, [libraryTotalPages])

  useEffect(() => {
    setSequencePage((current) => Math.min(current, sequenceTotalPages))
  }, [sequenceTotalPages])

  const paginatedLibrary = useMemo(() => {
    const start = (libraryPage - 1) * PAGE_SIZE
    return filteredLibrary.slice(start, start + PAGE_SIZE)
  }, [filteredLibrary, libraryPage])

  const paginatedSequenceItems = useMemo(() => {
    const start = (sequencePage - 1) * PAGE_SIZE
    return sequence.items.slice(start, start + PAGE_SIZE)
  }, [sequence.items, sequencePage])

  if (!state.workspaceRoot) {
    return (
      <EmptyState
        title="El constructor necesita almacenamiento local listo"
        description="Primero prepara el espacio de trabajo administrado por la app para guardar secuencias y sus exportaciones."
        action={<Button onClick={actions.chooseWorkspace}>Preparar almacenamiento</Button>}
      />
    )
  }

  function addSong(songId) {
    actions.clearExportResult()
    setSequence((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          id: `item-${Date.now()}-${songId}`,
          songId,
          order: current.items.length + 1,
          transitionType: current.items.length ? 'Crossfade' : 'Entrada suave',
        },
      ],
    }))
    setSequencePage(sequenceTotalPages)
  }

  function removeSong(itemId) {
    actions.clearExportResult()
    setSequence((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== itemId).map((item, index) => ({ ...item, order: index + 1 })),
    }))
  }

  function moveSong(itemId, direction) {
    let nextPage = sequencePage

    actions.clearExportResult()
    setSequence((current) => {
      const currentIndex = current.items.findIndex((item) => item.id === itemId)
      if (currentIndex < 0) {
        return current
      }

      const offset = direction === 'up' ? -1 : 1
      const targetIndex = Math.min(Math.max(currentIndex + offset, 0), current.items.length - 1)
      if (targetIndex === currentIndex) {
        return current
      }

      nextPage = Math.floor(targetIndex / PAGE_SIZE) + 1

      return {
        ...current,
        items: arrayMove(current.items, currentIndex, targetIndex).map((item, index) => ({
          ...item,
          order: index + 1,
        })),
      }
    })

    setSequencePage(nextPage)
  }

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    actions.clearExportResult()
    setSequence((current) => {
      const oldIndex = current.items.findIndex((item) => item.id === active.id)
      const newIndex = current.items.findIndex((item) => item.id === over.id)
      const reordered = arrayMove(current.items, oldIndex, newIndex).map((item, index) => ({
        ...item,
        order: index + 1,
      }))

      return {
        ...current,
        items: reordered,
      }
    })
  }

  async function persistSequence() {
    const result = await actions.saveSequence(sequence)
    if (result?.sequence) {
      setSequence(result.sequence)
      return result.sequence
    }
    return sequence
  }

  async function handleSaveSequence() {
    await persistSequence()
  }

  async function handleOpenDocument() {
    const sequenceId = sequence.id || activeSequence?.id
    if (!sequenceId) {
      return
    }

    await actions.openExportedSequence(sequenceId)
  }

  async function handleDeleteSequence() {
    if (!sequence.id) {
      return
    }

    try {
      await actions.deleteSequence(sequence.id)
      actions.clearExportResult()
      sileo.success({
        title: 'Secuencia eliminada',
        description: 'La secuencia fue eliminada correctamente.',
      })
      navigate('/secuencias')
    } catch (error) {
      sileo.error({
        title: 'No se pudo eliminar la secuencia',
        description: error?.message || 'Repite la acción en unos segundos.',
      })
    }
  }

  return (
    <div className="mt-4 space-y-8">
      <PageHeader
        eyebrow="Preparación del servicio"
        title="Constructor de secuencias"
        description="Arma el orden del servicio, reordena cantos con drag and drop y exporta un DOCX listo para compartir."
        actions={
          <>
            <Button variant="outline" className="whitespace-nowrap" onClick={() => navigate('/secuencias')}>
              Secuencias guardadas
            </Button>
            <Button
              variant="secondary"
              className="whitespace-nowrap"
              onClick={() => {
                actions.clearExportResult()
                setSequence(createEmptySequence())
              }}
            >
              <Plus size={16} />
              Nueva secuencia
            </Button>
            <Button className="whitespace-nowrap" onClick={handleSaveSequence}>
              <Save size={16} />
              Guardar secuencia
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <EditorialCard className="min-w-0 space-y-5">
          <h3 className="font-headline text-2xl font-extrabold text-[var(--primary)]">Biblioteca disponible</h3>
          <input
            className="w-full rounded-2xl bg-[var(--surface-container-low)] px-4 py-3 outline-none"
            placeholder="Buscar cantos, autores o tonalidades..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="space-y-3">
            {paginatedLibrary.map((song, index) => (
              <button
                key={song.id}
                type="button"
                onClick={() => addSong(song.id)}
                className="motion-list-item flex w-full items-center justify-between rounded-2xl bg-[var(--surface-container-low)] px-4 py-4 text-left transition hover:bg-[var(--secondary-container)]"
                style={{ '--motion-delay': `${Math.min(index * 40, 200)}ms` }}
              >
                <div>
                  <p className="font-headline text-lg font-bold text-[var(--primary)]">{song.title}</p>
                  <p className="text-sm text-[var(--on-surface-variant)]">
                    {[song.author, song.key, `${song.tempo} BPM`].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <Plus size={18} className="text-[var(--primary)]" />
              </button>
            ))}
          </div>

          {!paginatedLibrary.length ? (
            <p className="text-sm text-[var(--on-surface-variant)]">No hay cantos que coincidan con la búsqueda actual.</p>
          ) : null}

          <CompactPagination page={libraryPage} totalPages={libraryTotalPages} onChange={setLibraryPage} />
        </EditorialCard>

        <div className="min-w-0 space-y-6">
          <EditorialCard className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Título de la secuencia</span>
                  <input
                    className="w-full rounded-2xl bg-[var(--surface-container-low)] px-4 py-3 outline-none"
                    value={sequence.title}
                    onChange={(event) => {
                      actions.clearExportResult()
                      setSequence({ ...sequence, title: event.target.value })
                    }}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Fecha del servicio</span>
                  <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-container-low)] px-4 py-3">
                    <CalendarDays size={16} className="text-[var(--outline)]" />
                    <input
                      className="w-full bg-transparent outline-none"
                      type="date"
                      value={sequence.serviceDate}
                      onChange={(event) => {
                        actions.clearExportResult()
                        setSequence({ ...sequence, serviceDate: event.target.value })
                      }}
                    />
                  </div>
                </label>
              </div>

              {sequence.id ? (
                <Button variant="outline" onClick={handleDeleteSequence}>
                  <Trash2 size={16} />
                  Eliminar
                </Button>
              ) : null}
            </div>

            {sequence.items.length ? (
              <div className="space-y-4">
                <SequenceList
                  items={paginatedSequenceItems}
                  pageOffset={(sequencePage - 1) * PAGE_SIZE}
                  totalItems={sequence.items.length}
                  songs={state.songs}
                  onDragEnd={handleDragEnd}
                  onRemove={removeSong}
                  onMove={moveSong}
                />
                <CompactPagination page={sequencePage} totalPages={sequenceTotalPages} onChange={setSequencePage} label="Bloque" />
              </div>
            ) : (
              <EmptyState
                title="Aún no hay cantos en esta secuencia"
                description="Agrega cantos desde la columna izquierda para construir el flujo del servicio."
              />
            )}
          </EditorialCard>

          <div className="grid gap-4 md:grid-cols-4">
            <EditorialCard>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--outline)]">Canciones</p>
              <p className="font-headline mt-3 text-3xl font-extrabold text-[var(--primary)]">{sequenceMetrics.totalSongs}</p>
            </EditorialCard>
            <EditorialCard>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--outline)]">Duración</p>
              <p className="font-headline mt-3 text-3xl font-extrabold text-[var(--primary)]">{sequenceMetrics.estimatedDuration}</p>
            </EditorialCard>
            <EditorialCard>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--outline)]">Tonalidades</p>
              <p className="font-headline mt-3 text-3xl font-extrabold text-[var(--primary)]">{sequenceMetrics.uniqueKeys}</p>
            </EditorialCard>
            <EditorialCard>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--outline)]">Autores</p>
              <p className="font-headline mt-3 text-3xl font-extrabold text-[var(--primary)]">{sequenceMetrics.uniqueAuthors}</p>
            </EditorialCard>
          </div>

          <ExportPanel
            exportResult={state.exportResult}
            exportStatus={exportStatus}
            onCheckExisting={async () => {
              const savedSequence = await persistSequence()
              const status = await actions.checkSequenceExport(savedSequence.id)
              setExportStatus(status)
              return status
            }}
            onExport={async (overwrite) => {
              const savedSequence = await persistSequence()
              const result = await actions.exportSequence(savedSequence.id, overwrite)
              setExportStatus({
                exists: true,
                fileName: result.fileName,
                filePath: result.filePath,
              })
              return result
            }}
            onOpenDocument={handleOpenDocument}
            disabled={!sequence.items.length}
          />
        </div>
      </div>
    </div>
  )
}

export default SequenceBuilderPage
