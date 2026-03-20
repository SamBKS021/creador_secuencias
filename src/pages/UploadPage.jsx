import { FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAppContext } from '../app/store/AppContext.jsx'
import Button from '../components/ui/Button.jsx'
import EditorialCard from '../components/ui/EditorialCard.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import DraftEditor from '../features/upload/DraftEditor.jsx'
import UploadDropzone from '../features/upload/UploadDropzone.jsx'
import { createEmptySong } from '../utils/workspace.js'

function UploadPage() {
  const { state, activeDraft, actions } = useAppContext()
  const [form, setForm] = useState(activeDraft.formData || createEmptySong())

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(activeDraft.formData || createEmptySong())
  }, [activeDraft])

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
    <div className="space-y-8">
      <PageHeader
        title="Centro de carga"
        description="Importa archivos `.docx`, revisa el borrador y publícalo en la biblioteca. `sourcePath` se conserva solo como dato informativo y nunca como dependencia funcional."
      />

      <UploadDropzone onBrowse={actions.importSongFiles} />

      <div className="grid gap-6 xl:grid-cols-[0.55fr_1fr]">
        <EditorialCard className="space-y-4">
          <h3 className="font-headline text-2xl font-extrabold text-[var(--primary)]">Borradores importados</h3>
          {state.drafts.length ? (
            state.drafts.map((draft) => (
              <button
                key={draft.id}
                type="button"
                onClick={() => actions.setActiveDraft(draft.id)}
                className={[
                  'flex w-full items-start gap-3 rounded-2xl p-4 text-left transition',
                  draft.id === activeDraft.id
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--surface-container-low)] text-[var(--on-surface-variant)]',
                ].join(' ')}
              >
                <FileText size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">{draft.sourceFileName}</p>
                  <p className="mt-1 text-xs opacity-75">{draft.suggestedTitle || 'Sin sugerencia automática'}</p>
                </div>
              </button>
            ))
          ) : (
            <p className="text-sm leading-6 text-[var(--on-surface-variant)]">
              Aún no hay borradores. Usa el selector para crear uno o varios a partir de archivos `.docx`.
            </p>
          )}
        </EditorialCard>

        <DraftEditor
          title="Editor de borrador"
          subtitle="Completa título, autor, tonalidad, tempo, letra y acordes antes de publicar en la biblioteca."
          value={form}
          onChange={setForm}
          onSubmit={() =>
            actions.saveSong({
              ...form,
              draftId: activeDraft.id,
              sourceFileName: activeDraft.sourceFileName || form.sourceFileName,
              sourcePath: activeDraft.sourcePath || '',
            })
          }
          submitLabel="Publicar en biblioteca"
        />
      </div>
    </div>
  )
}

export default UploadPage
