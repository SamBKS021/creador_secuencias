import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { sileo } from 'sileo'
import { useAppContext } from '../app/store/AppContext.jsx'
import Button from '../components/ui/Button.jsx'
import EditorialCard from '../components/ui/EditorialCard.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import FilterBar from '../features/library/FilterBar.jsx'
import SongCard from '../features/library/SongCard.jsx'
import DraftEditor from '../features/upload/DraftEditor.jsx'
import { getSongCategories } from '../utils/workspace.js'

const SONGS_PER_PAGE = 6

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
      <p className="text-sm text-[var(--on-surface-variant)]">
        Pagina {page} de {totalPages}
      </p>

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
                  : 'bg-white text-[var(--primary)] hover:bg-[var(--primary-fixed)]',
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

function LibraryPage() {
  const { state, filteredSongs, activeSong, actions } = useAppContext()
  const [form, setForm] = useState(activeSong)
  const [page, setPage] = useState(1)

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

  const songCategories = useMemo(
    () => getSongCategories(state.songCategories),
    [state.songCategories],
  )

  const hasPendingChanges = useMemo(() => {
    if (!form.id || !activeSong?.id) {
      return false
    }

    return buildEditableSnapshot(form) !== buildEditableSnapshot(activeSong)
  }, [activeSong, form])

  if (!state.workspaceRoot) {
    return (
      <EmptyState
        title="La biblioteca necesita una carpeta de trabajo"
        description="Primero define la raiz donde vivira la biblioteca local junto con secuencias y exportaciones."
        action={<Button onClick={actions.chooseWorkspace}>Elegir carpeta de trabajo</Button>}
      />
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Biblioteca de canciones"
        description="Administra repertorio, tonalidades, tempo y letra con una estructura lista para crecer hacia una app de escritorio completa."
      />

      <FilterBar
        filters={state.libraryFilters}
        categories={songCategories}
        onChange={actions.setLibraryFilters}
      />

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            {paginatedSongs.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                selected={song.id === activeSong.id}
                onSelect={() => actions.setActiveSong(song.id)}
                onDelete={actions.deleteSong}
              />
            ))}
          </div>

          {!paginatedSongs.length ? (
            <EditorialCard className="text-sm text-[var(--on-surface-variant)]">
              No hay canciones que coincidan con los filtros actuales.
            </EditorialCard>
          ) : null}

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>

        <div className="space-y-4">
          {form.id ? (
            <DraftEditor
              title="Editar cancion"
              subtitle="Actualiza metadatos, letra y tono del canto seleccionado."
              value={form}
              categories={songCategories}
              onChange={setForm}
              onSubmit={async () => {
                if (!hasPendingChanges) {
                  return
                }

                await actions.updateSong(form)
                sileo.success({
                  title: 'Canto actualizado',
                  description: `${form.title || 'El canto'} se guardo correctamente en la biblioteca.`,
                })
              }}
              submitLabel="Guardar cambios"
              submitDisabled={!hasPendingChanges}
            />
          ) : (
            <EditorialCard className="text-sm leading-7 text-[var(--on-surface-variant)]">
              Selecciona un canto de la biblioteca para editarlo. Las altas nuevas se realizan desde el Centro de carga.
            </EditorialCard>
          )}
        </div>
      </div>
    </div>
  )
}

export default LibraryPage
