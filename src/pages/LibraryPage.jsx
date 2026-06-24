import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { sileo } from 'sileo'
import { useAppContext } from '../app/store/AppContext.jsx'
import Button from '../components/ui/Button.jsx'
import EditorialCard from '../components/ui/EditorialCard.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ModalShell from '../components/ui/ModalShell.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import FilterBar from '../features/library/FilterBar.jsx'
import SongCard from '../features/library/SongCard.jsx'
import SongUsageChart from '../features/library/SongUsageChart.jsx'
import DraftEditor from '../features/upload/DraftEditor.jsx'
import { getSongCategories } from '../utils/workspace.js'

const SONGS_PER_PAGE = 9

function buildEditableSnapshot(song) {
  return JSON.stringify({
    title: song?.title || '',
    author: song?.author || '',
    category: song?.category || '',
    key: song?.key || '',
    tempo: Number(song?.tempo || 0),
    lyrics: song?.lyrics || '',
  })
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] bg-[var(--surface-container-low)] px-4 py-4">
      <p className="text-sm text-[var(--on-surface-variant)]">Página {page} de {totalPages}</p>

      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => onChange(page - 1)} disabled={page === 1}>
          <ChevronLeft size={16} />
          Anterior
        </Button>

        <div className="flex items-center gap-2">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              className={[
                'h-10 min-w-10 rounded-xl px-3 text-sm font-semibold transition',
                pageNumber === page
                  ? 'cta-gradient text-white shadow-[0_14px_30px_-18px_rgba(0,36,70,0.7)]'
                  : 'bg-[var(--surface-container-lowest)] text-[var(--primary)] hover:bg-[var(--secondary-container)]',
              ].join(' ')}
              onClick={() => onChange(pageNumber)}
            >
              {pageNumber}
            </button>
          ))}
        </div>

        <Button variant="ghost" onClick={() => onChange(page + 1)} disabled={page === totalPages}>
          Siguiente
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  )
}

function SongEditModal({ open, form, categories, hasPendingChanges, onChange, onSubmit, onClose }) {
  useEffect(() => {
    if (!open) {
      return undefined
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, open])

  if (!open || !form.id) {
    return null
  }

  return (
    <ModalShell
      className="overflow-y-auto py-6"
      panelClassName="relative w-full max-w-[min(1720px,calc(100vw-32px))]"
      onClose={onClose}
    >
      <button
        type="button"
        aria-label="Cerrar editor"
        className="absolute right-4 top-4 z-10 rounded-full p-2 text-[var(--outline)] transition hover:bg-[var(--hover-surface)] hover:text-[var(--primary)]"
        onClick={onClose}
      >
        <X size={20} />
      </button>

      <DraftEditor
        title="Editar canto"
        subtitle="Actualiza metadatos, letra y tono del canto seleccionado."
        value={form}
        categories={categories}
        onChange={onChange}
        onSubmit={onSubmit}
        submitLabel="Guardar cambios"
        submitDisabled={!hasPendingChanges}
        sideContent={<SongUsageChart fechasUso={form.fechasUso} />}
      />
    </ModalShell>
  )
}

function LibraryPage() {
  const { state, filteredSongs, activeSong, actions } = useAppContext()
  const [form, setForm] = useState(activeSong)
  const [page, setPage] = useState(1)
  const [editorOpen, setEditorOpen] = useState(false)

  useLayoutEffect(() => {
    setForm({
      ...activeSong,
      chords: '',
    })
  }, [activeSong])

  useEffect(() => {
    setPage(1)
  }, [state.libraryFilters])

  const totalPages = Math.max(1, Math.ceil(filteredSongs.length / SONGS_PER_PAGE))

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages))
  }, [totalPages])

  const paginatedSongs = useMemo(() => {
    const start = (page - 1) * SONGS_PER_PAGE
    return filteredSongs.slice(start, start + SONGS_PER_PAGE)
  }, [filteredSongs, page])

  const songCategories = useMemo(() => getSongCategories(state.songCategories), [state.songCategories])

  const hasPendingChanges = useMemo(() => {
    if (!form.id || !activeSong?.id) {
      return false
    }

    return buildEditableSnapshot(form) !== buildEditableSnapshot(activeSong)
  }, [activeSong, form])

  function abrirEditorDeCanto(song) {
    actions.setActiveSong(song.id)
    setForm({
      ...song,
      chords: '',
    })
    setEditorOpen(true)
  }

  function cerrarEditorDeCanto() {
    setEditorOpen(false)
  }

  async function guardarCambiosDeCanto() {
    if (!hasPendingChanges) {
      return
    }

    await actions.updateSong(form)
    sileo.success({
      title: 'Canto actualizado',
      description: `${form.title || 'El canto'} quedó actualizado en la biblioteca.`,
    })
  }

  if (!state.workspaceRoot) {
    return (
      <EmptyState
        title="La biblioteca necesita almacenamiento local listo"
        description="Primero prepara el espacio de trabajo administrado por la app para guardar cantos, secuencias y exportaciones."
        action={<Button onClick={actions.chooseWorkspace}>Preparar almacenamiento</Button>}
      />
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Biblioteca de cantos"
        description="Edita repertorio, tonalidades, tempo y letra desde una vista pensada para trabajo diario."
      />

      <FilterBar filters={state.libraryFilters} categories={songCategories} onChange={actions.setLibraryFilters} />

      <div className="space-y-5">
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 min-[1700px]:grid-cols-4">
            {paginatedSongs.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                selected={song.id === activeSong.id}
                onSelect={() => actions.setActiveSong(song.id)}
                onEdit={() => abrirEditorDeCanto(song)}
                onDelete={actions.deleteSong}
              />
            ))}
          </div>

          {!paginatedSongs.length ? (
            <EditorialCard className="text-sm text-[var(--on-surface-variant)]">
              No hay cantos que coincidan con los filtros actuales.
            </EditorialCard>
          ) : null}

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </div>

      <SongEditModal
        open={editorOpen}
        form={form}
        categories={songCategories}
        hasPendingChanges={hasPendingChanges}
        onChange={setForm}
        onSubmit={guardarCambiosDeCanto}
        onClose={cerrarEditorDeCanto}
      />
    </div>
  )
}

export default LibraryPage
