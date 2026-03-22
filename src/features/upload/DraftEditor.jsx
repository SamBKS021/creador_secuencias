import { Save } from 'lucide-react'
import AppSelect from '../../components/ui/AppSelect.jsx'
import Button from '../../components/ui/Button.jsx'
import EditorialCard from '../../components/ui/EditorialCard.jsx'

function DraftEditor({
  value,
  title,
  subtitle,
  submitLabel,
  submitDisabled = false,
  hideSubmitButton = false,
  categories = [],
  onChange,
  onSubmit,
}) {
  function updateField(field, fieldValue) {
    onChange({
      ...value,
      [field]: fieldValue,
    })
  }

  const categoryOptions = [...new Set([...categories, value.category].filter(Boolean))]

  return (
    <EditorialCard className="h-full">
      <div className="space-y-6">
        <div>
          <h3 className="font-headline text-2xl font-extrabold text-[var(--primary)]">{title}</h3>
          <p className="mt-2 text-sm text-[var(--on-surface-variant)]">{subtitle}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Titulo</span>
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
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Categoria</span>
            <AppSelect
              tone="surface"
              options={categoryOptions}
              value={value.category}
              onChange={(nextValue) => updateField('category', nextValue)}
            />
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Letra</span>
          <textarea
            className="min-h-[320px] w-full rounded-[24px] bg-[var(--surface-container-low)] px-4 py-4 outline-none"
            value={value.lyrics}
            onChange={(event) => updateField('lyrics', event.target.value)}
          />
        </label>

        {!hideSubmitButton ? (
          <div className="flex justify-end">
            <Button onClick={onSubmit} disabled={submitDisabled}>
              <Save size={16} />
              {submitLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </EditorialCard>
  )
}

export default DraftEditor
