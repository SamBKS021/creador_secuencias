import { ArrowLeft, Gauge, Sparkles } from 'lucide-react'
import { sileo } from 'sileo'
import { useAppContext } from '../app/store/AppContext.jsx'
import Button from '../components/ui/Button.jsx'
import EditorialCard from '../components/ui/EditorialCard.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useNavigate } from 'react-router-dom'

const options = [
  {
    value: 'normal',
    title: 'Animaciones normales',
    description: 'Mantiene transiciones completas en paginas, cards y cambios de listas.',
    note: 'Mejor experiencia visual',
  },
  {
    value: 'reduced',
    title: 'Animaciones reducidas',
    description: 'Reduce desplazamientos y deja solo transiciones mas cortas y ligeras.',
    note: 'Buen equilibrio para equipos modestos',
  },
  {
    value: 'off',
    title: 'Animaciones desactivadas',
    description: 'Quita animaciones y transiciones para priorizar respuesta inmediata.',
    note: 'Minima carga visual',
  },
]

function AnimationSettingsPage() {
  const navigate = useNavigate()
  const { state, actions } = useAppContext()
  const currentMode = state.preferences.motionMode || 'normal'

  async function handleSelect(nextMode) {
    if (nextMode === currentMode) {
      return
    }

    try {
      await actions.saveMotionMode(nextMode)
      sileo.success({
        title: 'Preferencia guardada',
        description: 'El nivel de animaciones se guardo localmente en este equipo.',
      })
    } catch (error) {
      sileo.error({
        title: 'No se pudo guardar la preferencia',
        description: error?.message || 'Intentalo de nuevo.',
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
          title="Animaciones"
          description="Regula el nivel de movimiento visual de la app. Esta preferencia es local para cada equipo."
        />
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <EditorialCard>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Modo actual</p>
          <p className="mt-2 font-headline text-3xl font-extrabold text-[var(--primary)]">
            {options.find((option) => option.value === currentMode)?.title || 'Animaciones normales'}
          </p>
        </EditorialCard>
        <EditorialCard>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Alcance</p>
          <p className="mt-2 text-sm font-semibold text-[var(--primary)]">
            Solo este equipo
          </p>
        </EditorialCard>
        <EditorialCard>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Impacto</p>
          <p className="mt-2 text-sm font-semibold text-[var(--primary)]">
            CPU y GPU visual
          </p>
        </EditorialCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        {options.map((option) => {
          const selected = option.value === currentMode

          return (
            <EditorialCard
              key={option.value}
              className={[
                'space-y-5 border transition',
                selected
                  ? 'border-[rgba(31,111,235,0.26)] bg-[rgba(31,111,235,0.05)]'
                  : 'border-[rgba(67,71,78,0.08)]',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-container-low)] text-[var(--primary)]">
                    {option.value === 'normal' ? <Sparkles size={20} /> : <Gauge size={20} />}
                  </div>
                  <h2 className="font-headline text-2xl font-extrabold text-[var(--primary)]">
                    {option.title}
                  </h2>
                </div>

                {selected ? (
                  <span className="rounded-full bg-[rgba(31,111,235,0.12)] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[rgb(31,111,235)]">
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
                  {selected ? 'Seleccionado' : 'Usar este modo'}
                </Button>
              </div>
            </EditorialCard>
          )
        })}
      </section>
    </div>
  )
}

export default AnimationSettingsPage
