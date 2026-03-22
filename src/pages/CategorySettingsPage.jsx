import { AlertTriangle, ArrowLeft, Pencil, Plus, Save, Tag, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sileo } from 'sileo'
import { useAppContext } from '../app/store/AppContext.jsx'
import Button from '../components/ui/Button.jsx'
import EditorialCard from '../components/ui/EditorialCard.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { getSongCategories } from '../utils/workspace.js'

function normalizeCategoryName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function CategorySettingsPage() {
  const navigate = useNavigate()
  const { state, actions } = useAppContext()
  const categories = useMemo(() => getSongCategories(state.songCategories), [state.songCategories])
  const [draftName, setDraftName] = useState('')
  const [editingName, setEditingName] = useState('')
  const [saving, setSaving] = useState(false)

  const usageMap = useMemo(() => {
    return state.songs.reduce((accumulator, song) => {
      const key = song.category || ''
      accumulator[key] = (accumulator[key] || 0) + 1
      return accumulator
    }, {})
  }, [state.songs])

  function resetForm() {
    setDraftName('')
    setEditingName('')
  }

  async function handleSubmit() {
    const nextName = draftName.trim()
    if (!nextName) {
      sileo.warning({
        title: 'Falta el nombre',
        description: 'Escribe un nombre de categoria antes de guardarla.',
      })
      return
    }

    const normalizedNext = normalizeCategoryName(nextName)
    const duplicated = categories.some(
      (category) =>
        normalizeCategoryName(category) === normalizedNext &&
        normalizeCategoryName(category) !== normalizeCategoryName(editingName),
    )

    if (duplicated) {
      sileo.warning({
        title: 'Categoria duplicada',
        description: 'Ya existe una categoria con ese nombre.',
      })
      return
    }

    setSaving(true)

    try {
      if (editingName) {
        const affectedSongs = state.songs.filter((song) => song.category === editingName)
        for (const song of affectedSongs) {
          await actions.updateSong({
            ...song,
            category: nextName,
          })
        }

        await actions.saveSongCategories(
          categories.map((category) => (category === editingName ? nextName : category)),
        )

        if (state.libraryFilters.category === editingName) {
          actions.setLibraryFilters({ category: nextName })
        }

        sileo.success({
          title: 'Categoria actualizada',
          description: affectedSongs.length
            ? `La categoria se actualizo en el catalogo y en ${affectedSongs.length} canto(s).`
            : 'La categoria se actualizo correctamente.',
        })
      } else {
        await actions.saveSongCategories([...categories, nextName])
        sileo.success({
          title: 'Categoria creada',
          description: `${nextName} ya esta disponible para tus cantos.`,
        })
      }

      resetForm()
    } catch (error) {
      sileo.error({
        title: 'No se pudo guardar la categoria',
        description: error?.message || 'Intentalo de nuevo.',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(category) {
    if (categories.length <= 1) {
      sileo.warning({
        title: 'No se puede eliminar',
        description: 'Debes conservar al menos una categoria disponible.',
      })
      return
    }

    const usageCount = usageMap[category] || 0
    if (usageCount > 0) {
      sileo.warning({
        title: 'Categoria en uso',
        description: `Esta categoria esta asignada a ${usageCount} canto(s). Cambia esos cantos antes de eliminarla.`,
      })
      return
    }

    setSaving(true)
    try {
      await actions.saveSongCategories(categories.filter((item) => item !== category))
      if (editingName === category) {
        resetForm()
      }
      if (state.libraryFilters.category === category) {
        actions.setLibraryFilters({ category: 'Todas' })
      }
      sileo.success({
        title: 'Categoria eliminada',
        description: `${category} se elimino del catalogo.`,
      })
    } catch (error) {
      sileo.error({
        title: 'No se pudo eliminar la categoria',
        description: error?.message || 'Intentalo de nuevo.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Button variant="ghost" className="px-0 py-1 text-sm" onClick={() => navigate('/ajustes')}>
          <ArrowLeft size={16} />
          Volver a ajustes
        </Button>

        <PageHeader
          eyebrow="Ajustes"
          title="Categorias"
          description="Crea, renombra y elimina categorias del catalogo general. Los cambios impactan biblioteca y Centro de carga."
        />
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <EditorialCard>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Categorias</p>
          <p className="mt-2 font-headline text-4xl font-extrabold text-[var(--primary)]">{categories.length}</p>
        </EditorialCard>
        <EditorialCard>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Cantos categorizados</p>
          <p className="mt-2 font-headline text-4xl font-extrabold text-[var(--primary)]">{state.songs.length}</p>
        </EditorialCard>
        <EditorialCard>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">En uso</p>
          <p className="mt-2 font-headline text-4xl font-extrabold text-[var(--primary)]">
            {categories.filter((category) => (usageMap[category] || 0) > 0).length}
          </p>
        </EditorialCard>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <EditorialCard className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-container-low)] text-[var(--primary)]">
              <Tag size={20} />
            </div>
            <div>
              <h2 className="font-headline text-2xl font-extrabold text-[var(--primary)]">
                Catalogo actual
              </h2>
              <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
                Gestiona las categorias disponibles para todos tus cantos.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {categories.map((category) => (
              <div key={category} className="rounded-[24px] bg-[var(--surface-container-low)] px-5 py-5">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-headline text-2xl font-extrabold text-[var(--primary)]">
                      {category}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--on-surface-variant)]">
                      {usageMap[category] || 0} canto(s) usando esta categoria
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="ghost"
                      className="rounded-lg px-3 py-2 text-xs"
                      onClick={() => {
                        setEditingName(category)
                        setDraftName(category)
                      }}
                    >
                      <Pencil size={14} />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      className="rounded-lg px-3 py-2 text-xs text-[var(--error)] hover:bg-[rgba(186,26,26,0.08)]"
                      onClick={() => handleDelete(category)}
                      disabled={saving}
                    >
                      <Trash2 size={14} />
                      Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </EditorialCard>

        <EditorialCard className="space-y-5">
          <div>
            <h2 className="font-headline text-2xl font-extrabold text-[var(--primary)]">
              {editingName ? 'Editar categoria' : 'Nueva categoria'}
            </h2>
            <p className="mt-2 text-sm leading-7 text-[var(--on-surface-variant)]">
              {editingName
                ? 'Si renombras una categoria, tambien se actualizara en los cantos que ya la usan.'
                : 'Agrega una nueva categoria para que aparezca en formularios y filtros.'}
            </p>
          </div>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">
              Nombre de la categoria
            </span>
            <input
              className="w-full rounded-2xl bg-[var(--surface-container-low)] px-4 py-3 outline-none"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="Ej. Especial"
            />
          </label>

          <div className="mt-3 rounded-[20px] border border-[rgba(201,154,95,0.28)] bg-[rgba(255,245,224,0.92)] px-4 py-4 text-sm leading-6 text-[var(--on-surface)]">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[rgba(171,111,0,1)]" />
              <p>
                Antes de eliminar una categoria, asegúrate de que ya no esté asignada a cantos existentes.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {editingName ? (
              <Button
                variant="ghost"
                className="rounded-lg px-3 py-2 text-xs"
                onClick={resetForm}
                disabled={saving}
              >
                <X size={14} />
                Cancelar
              </Button>
            ) : null}

            <Button className="rounded-lg px-3 py-2 text-xs" onClick={handleSubmit} disabled={saving}>
              {editingName ? <Save size={14} /> : <Plus size={14} />}
              {editingName ? 'Guardar cambios' : 'Agregar categoria'}
            </Button>
          </div>
        </EditorialCard>
      </div>
    </div>
  )
}

export default CategorySettingsPage
