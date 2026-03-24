import { ArrowLeft, MoonStar, Palette, SunMedium } from 'lucide-react'
import { sileo } from 'sileo'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../app/store/AppContext.jsx'
import Button from '../components/ui/Button.jsx'
import EditorialCard from '../components/ui/EditorialCard.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'

const options = [
  {
    value: 'light',
    title: 'Claro',
    description: 'Mantiene una apariencia luminosa y limpia, pero con mejor descanso visual para jornadas largas.',
    note: 'Ideal si trabajas en espacios bien iluminados.',
  },
  {
    value: 'dark',
    title: 'Oscuro',
    description: 'Reduce el brillo general y usa superficies profundas para descansar la vista durante uso prolongado.',
    note: 'Mejor para trabajo nocturno o pantallas intensas.',
  },
  {
    value: 'retro',
    title: 'Retro 2000s',
    description: 'Usa una mezcla más brillante de azules, cian y superficies metálicas con una identidad marcada.',
    note: 'Pensado para un look expresivo sin perder legibilidad.',
  },
]

function ThemeSettingsPage() {
  const navigate = useNavigate()
  const { state, actions } = useAppContext()
  const currentTheme = state.preferences.themeMode || 'light'

  async function handleSelect(nextTheme) {
    if (nextTheme === currentTheme) {
      return
    }

    try {
      await actions.saveThemeMode(nextTheme)
      sileo.success({
        title: 'Tema actualizado',
        description: 'La apariencia se guardó localmente en este equipo.',
      })
    } catch (error) {
      sileo.error({
        title: 'No se pudo cambiar el tema',
        description: error?.message || 'Inténtalo de nuevo.',
      })
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
          title="Temas"
          description="Cambia el estilo visual general de la aplicación. Esta preferencia es local para cada equipo."
        />
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <EditorialCard>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Tema actual</p>
          <p className="mt-2 font-headline text-3xl font-extrabold text-[var(--primary)]">
            {options.find((option) => option.value === currentTheme)?.title || 'Claro'}
          </p>
        </EditorialCard>
        <EditorialCard>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Alcance</p>
          <p className="mt-2 text-sm font-semibold text-[var(--primary)]">Solo este equipo</p>
        </EditorialCard>
        <EditorialCard>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Afecta</p>
          <p className="mt-2 text-sm font-semibold text-[var(--primary)]">Navegación, fondos y superficies</p>
        </EditorialCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        {options.map((option) => {
          const selected = option.value === currentTheme

          return (
            <EditorialCard
              key={option.value}
              className={[
                'space-y-5 border transition',
                selected
                  ? 'border-[var(--outline-variant)] bg-[var(--secondary-container)]'
                  : 'border-[rgba(67,71,78,0.08)]',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-container-low)] text-[var(--primary)]">
                    {option.value === 'dark' ? (
                      <MoonStar size={20} />
                    ) : option.value === 'retro' ? (
                      <Palette size={20} />
                    ) : (
                      <SunMedium size={20} />
                    )}
                  </div>
                  <h2 className="font-headline text-2xl font-extrabold text-[var(--primary)]">{option.title}</h2>
                </div>

                {selected ? (
                  <span className="rounded-full bg-[var(--surface-container-lowest)] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]">
                    Activo
                  </span>
                ) : null}
              </div>

              <p className="text-sm leading-7 text-[var(--on-surface-variant)]">{option.description}</p>

              <div className="rounded-[20px] bg-[var(--surface-container-low)] px-4 py-4 text-sm text-[var(--on-surface-variant)]">
                {option.note}
              </div>

              <div className="flex justify-end">
                <Button
                  variant={selected ? 'secondary' : 'primary'}
                  className="rounded-lg px-3 py-2 text-xs"
                  onClick={() => handleSelect(option.value)}
                >
                  {selected ? 'Seleccionado' : 'Usar este tema'}
                </Button>
              </div>
            </EditorialCard>
          )
        })}
      </section>
    </div>
  )
}

export default ThemeSettingsPage
