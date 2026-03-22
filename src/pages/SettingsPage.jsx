import { ArrowRight, Cloud, Sparkles, Tag } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import EditorialCard from '../components/ui/EditorialCard.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useAppContext } from '../app/store/AppContext.jsx'
import { getSongCategories } from '../utils/workspace.js'

function SettingsPage() {
  const navigate = useNavigate()
  const { state } = useAppContext()
  const categories = useMemo(() => getSongCategories(state.songCategories), [state.songCategories])

  return (
    <div className="space-y-8">
      <PageHeader
        title="Ajustes"
        description="Configura catalogos y opciones generales de la aplicacion desde modulos separados."
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <EditorialCard className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-container-low)] text-[var(--primary)]">
                <Tag size={22} />
              </div>
              <div className="space-y-2">
                <h2 className="font-headline text-3xl font-extrabold text-[var(--primary)]">
                  Categorias
                </h2>
                <p className="max-w-xl text-sm leading-7 text-[var(--on-surface-variant)]">
                  Administra el catalogo de categorias que usas para clasificar cantos en la biblioteca y en el
                  Centro de carga.
                </p>
              </div>
            </div>

            <Button variant="outline" className="rounded-xl px-3 py-2 text-xs" onClick={() => navigate('/ajustes/categorias')}>
              Abrir
              <ArrowRight size={14} />
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[20px] bg-[var(--surface-container-low)] px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Categorias</p>
              <p className="mt-2 font-headline text-3xl font-extrabold text-[var(--primary)]">{categories.length}</p>
            </div>
            <div className="rounded-[20px] bg-[var(--surface-container-low)] px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Cantos</p>
              <p className="mt-2 font-headline text-3xl font-extrabold text-[var(--primary)]">{state.songs.length}</p>
            </div>
            <div className="rounded-[20px] bg-[var(--surface-container-low)] px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Alcance</p>
              <p className="mt-2 text-sm font-semibold text-[var(--primary)]">Biblioteca y carga</p>
            </div>
          </div>
        </EditorialCard>

        <EditorialCard className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-container-low)] text-[var(--primary)]">
                <Cloud size={22} />
              </div>
              <div className="space-y-2">
                <h2 className="font-headline text-3xl font-extrabold text-[var(--primary)]">
                  Drive
                </h2>
                <p className="max-w-xl text-sm leading-7 text-[var(--on-surface-variant)]">
                  Conecta Google Drive para respaldar cantos, secuencias y categorias con sincronizacion local-first.
                </p>
              </div>
            </div>

            <Button variant="outline" className="rounded-xl px-3 py-2 text-xs" onClick={() => navigate('/ajustes/drive')}>
              Abrir
              <ArrowRight size={14} />
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[20px] bg-[var(--surface-container-low)] px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Estado</p>
              <p className="mt-2 text-sm font-semibold text-[var(--primary)]">
                {state.driveAuthStatus.connected ? 'Conectado' : 'Sin conectar'}
              </p>
            </div>
            <div className="rounded-[20px] bg-[var(--surface-container-low)] px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Ultimo sync</p>
              <p className="mt-2 text-sm font-semibold text-[var(--primary)]">
                {state.syncStatus.lastSyncAt ? 'Disponible' : 'Pendiente'}
              </p>
            </div>
            <div className="rounded-[20px] bg-[var(--surface-container-low)] px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Conflictos</p>
              <p className="mt-2 font-headline text-3xl font-extrabold text-[var(--primary)]">
                {state.syncStatus.pendingConflicts?.length || 0}
              </p>
            </div>
          </div>
        </EditorialCard>

        <EditorialCard className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-container-low)] text-[var(--primary)]">
                <Sparkles size={22} />
              </div>
              <div className="space-y-2">
                <h2 className="font-headline text-3xl font-extrabold text-[var(--primary)]">
                  Animaciones
                </h2>
                <p className="max-w-xl text-sm leading-7 text-[var(--on-surface-variant)]">
                  Regula el nivel de movimiento visual del sistema para este equipo sin afectar la sincronizacion futura.
                </p>
              </div>
            </div>

            <Button variant="outline" className="rounded-xl px-3 py-2 text-xs" onClick={() => navigate('/ajustes/animaciones')}>
              Abrir
              <ArrowRight size={14} />
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[20px] bg-[var(--surface-container-low)] px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Modo</p>
              <p className="mt-2 text-sm font-semibold text-[var(--primary)] capitalize">
                {state.preferences.motionMode || 'normal'}
              </p>
            </div>
            <div className="rounded-[20px] bg-[var(--surface-container-low)] px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Alcance</p>
              <p className="mt-2 text-sm font-semibold text-[var(--primary)]">Solo local</p>
            </div>
            <div className="rounded-[20px] bg-[var(--surface-container-low)] px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Uso</p>
              <p className="mt-2 text-sm font-semibold text-[var(--primary)]">Paginas, cards y listas</p>
            </div>
          </div>
        </EditorialCard>
      </section>
    </div>
  )
}

export default SettingsPage
