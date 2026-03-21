import { Save } from 'lucide-react'
import Button from '../../components/ui/Button.jsx'
import EditorialCard from '../../components/ui/EditorialCard.jsx'

function DraftEditor({ value, title, subtitle, submitLabel, submitDisabled = false, onChange, onSubmit }) {
  function updateField(field, fieldValue) {
    onChange({
      ...value,
      [field]: fieldValue,
    })
  }

  return (
    <EditorialCard className="h-full">
      <div className="space-y-6">
        <div>
          <h3 className="font-headline text-2xl font-extrabold text-[var(--primary)]">{title}</h3>
          <p className="mt-2 text-sm text-[var(--on-surface-variant)]">{subtitle}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Título</span>
            <input
              className="w-full rounded-2xl bg-[var(--surface-container-low)] px-4 py-3 outline-none"
              value={value.title}
              onChange={(event) => updateField('title', event.target.value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Autor o compositor</span>
            <input
              className="w-full rounded-2xl bg-[var(--surface-container-low)] px-4 py-3 outline-none"
              value={value.author}
              onChange={(event) => updateField('author', event.target.value)}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Tonalidad</span>
            <input
              className="w-full rounded-2xl bg-[var(--surface-container-low)] px-4 py-3 outline-none"
              value={value.key}
              onChange={(event) => updateField('key', event.target.value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Tempo</span>
            <input
              className="w-full rounded-2xl bg-[var(--surface-container-low)] px-4 py-3 outline-none"
              type="number"
              value={value.tempo}
              onChange={(event) => updateField('tempo', Number(event.target.value))}
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Categoría</span>
            <select
              className="w-full rounded-2xl bg-[var(--surface-container-low)] px-4 py-3 outline-none"
              value={value.category}
              onChange={(event) => updateField('category', event.target.value)}
            >
              <option>Contemporánea</option>
              <option>Adoración</option>
              <option>Himno</option>
              <option>Destacada</option>
            </select>
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Letra</span>
          <textarea
            className="min-h-[220px] w-full rounded-[24px] bg-[var(--surface-container-low)] px-4 py-4 outline-none"
            value={value.lyrics}
            onChange={(event) => updateField('lyrics', event.target.value)}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Acordes</span>
          <textarea
            className="min-h-[160px] w-full rounded-[24px] bg-[var(--surface-container-low)] px-4 py-4 outline-none"
            value={value.chords}
            onChange={(event) => updateField('chords', event.target.value)}
          />
        </label>

        <div className="flex justify-end">
          <Button onClick={onSubmit} disabled={submitDisabled}>
            <Save size={16} />
            {submitLabel}
          </Button>
        </div>
      </div>
    </EditorialCard>
  )
}

export default DraftEditor
