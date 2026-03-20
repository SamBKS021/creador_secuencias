import { Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAppContext } from '../app/store/AppContext.jsx'
import Button from '../components/ui/Button.jsx'
import EditorialCard from '../components/ui/EditorialCard.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import FilterBar from '../features/library/FilterBar.jsx'
import SongCard from '../features/library/SongCard.jsx'
import DraftEditor from '../features/upload/DraftEditor.jsx'
import { createEmptySong } from '../utils/workspace.js'

function LibraryPage() {
  const { state, filteredSongs, activeSong, actions } = useAppContext()
  const [form, setForm] = useState(activeSong)

  useEffect(() => {
    setForm(activeSong)
  }, [activeSong])

  if (!state.workspaceRoot) {
    return (
      <EmptyState
        title="La biblioteca necesita una carpeta de trabajo"
        description="Primero define la raíz donde vivirán `songs.json`, secuencias, borradores y exportaciones."
        action={<Button onClick={actions.chooseWorkspace}>Elegir carpeta de trabajo</Button>}
      />
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Biblioteca de canciones"
        description="Administra repertorio, tonalidades, tempo, letra y acordes con una estructura lista para crecer hacia una app de escritorio completa."
        actions={
          <Button
            onClick={() => {
              actions.setActiveSong('')
              setForm(createEmptySong())
            }}
          >
            <Plus size={16} />
            Nueva canción
          </Button>
        }
      />

      <FilterBar filters={state.libraryFilters} onChange={actions.setLibraryFilters} />

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="grid gap-5 md:grid-cols-2">
          {filteredSongs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              selected={song.id === activeSong.id}
              onSelect={() => actions.setActiveSong(song.id)}
            />
          ))}
        </div>

        <div className="space-y-4">
          <DraftEditor
            title={form.id ? 'Editar canción' : 'Nueva canción'}
            subtitle="Actualiza metadatos, letra y acordes. La persistencia depende del `id` interno, no de rutas absolutas."
            value={form}
            onChange={setForm}
            onSubmit={() => {
              if (form.id) {
                actions.updateSong(form)
                return
              }
              actions.saveSong(form)
            }}
            submitLabel={form.id ? 'Guardar cambios' : 'Agregar a biblioteca'}
          />

          {form.id ? (
            <EditorialCard className="flex justify-end">
              <Button variant="outline" onClick={() => actions.deleteSong(form.id)}>
                <Trash2 size={16} />
                Eliminar canción
              </Button>
            </EditorialCard>
          ) : (
            <EditorialCard className="flex items-center gap-3 text-sm text-[var(--on-surface-variant)]">
              <Save size={16} className="text-[var(--primary)]" />
              Crea una ficha nueva o selecciona una canción existente para editarla.
            </EditorialCard>
          )}
        </div>
      </div>
    </div>
  )
}

export default LibraryPage
