import { ArrowDownToLine, ArrowLeft, BellRing, RefreshCcw } from 'lucide-react'
import { sileo } from 'sileo'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../app/store/AppContext.jsx'
import Button from '../components/ui/Button.jsx'
import EditorialCard from '../components/ui/EditorialCard.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'

function formatSource(source) {
  switch (source) {
    case 'github+drive':
      return 'GitHub + aviso enriquecido desde Drive'
    case 'github':
      return 'GitHub Releases'
    default:
      return 'Sin configuración'
  }
}

function UpdatesPage() {
  const navigate = useNavigate()
  const { state, actions } = useAppContext()

  const summary = useMemo(() => {
    if (state.updateStatus.checking) {
      return 'Estamos comprobando si existe una versión nueva para este equipo.'
    }

    if (!state.updateStatus.configured) {
      return 'Este build no trae el updater configurado o el endpoint aún no está disponible.'
    }

    if (!state.updateStatus.available) {
      return 'Esta instalación ya está al día.'
    }

    return `Hay una actualización disponible para pasar de ${state.updateStatus.currentVersion || 'tu versión actual'} a ${state.updateStatus.latestVersion}.`
  }, [state.updateStatus])

  async function handleCheck() {
    try {
      const result = await actions.checkForAppUpdate()
      if (result?.available) {
        sileo.info({
          title: 'Actualización disponible',
          description: `${result.latestVersion} está lista para instalar.`,
        })
      } else {
        sileo.success({
          title: 'Todo al día',
          description: 'No se encontró una versión más nueva.',
        })
      }
    } catch (error) {
      sileo.error({
        title: 'No se pudo revisar actualizaciones',
        description: error?.message || 'Inténtalo de nuevo.',
      })
    }
  }

  async function handleInstall() {
    try {
      await actions.downloadAndInstallUpdate()
    } catch (error) {
      sileo.error({
        title: 'No se pudo instalar la actualización',
        description: error?.message || 'Inténtalo de nuevo.',
      })
    }
  }

  async function handleDismiss() {
    try {
      await actions.dismissUpdate(state.updateStatus.latestVersion)
      sileo.info({
        title: 'Aviso oculto',
        description: 'No volveremos a mostrar el modal para esta versión.',
      })
    } catch (error) {
      sileo.error({
        title: 'No se pudo guardar la preferencia',
        description: error?.message || 'Inténtalo de nuevo.',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Button variant="ghost" className="px-0 py-1 text-sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Volver
        </Button>

        <PageHeader
          eyebrow="Sistema"
          title="Actualizaciones"
          description="Revisa si existe una nueva versión, consulta notas de cambio y ejecuta la instalación cuando esté lista."
          actions={
            <Button variant="outline" onClick={handleCheck} disabled={state.updateStatus.checking || state.updateStatus.installing}>
              <RefreshCcw size={16} />
              Buscar actualizaciones
            </Button>
          }
        />
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <EditorialCard>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Versión actual</p>
          <p className="mt-2 font-headline text-4xl font-extrabold text-[var(--primary)]">
            {state.updateStatus.currentVersion || '0.1.0'}
          </p>
        </EditorialCard>
        <EditorialCard>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Última disponible</p>
          <p className="mt-2 font-headline text-4xl font-extrabold text-[var(--primary)]">
            {state.updateStatus.latestVersion || 'Sin novedades'}
          </p>
        </EditorialCard>
        <EditorialCard>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Origen</p>
          <p className="mt-2 text-sm font-semibold text-[var(--primary)]">{formatSource(state.updateStatus.source)}</p>
        </EditorialCard>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <EditorialCard className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-container-low)] text-[var(--primary)]">
              <BellRing size={20} />
            </div>
            <div>
              <h2 className="font-headline text-2xl font-extrabold text-[var(--primary)]">Estado de actualización</h2>
              <p className="mt-1 text-sm text-[var(--on-surface-variant)]">{summary}</p>
            </div>
          </div>

          <div className="rounded-[20px] bg-[var(--surface-container-low)] px-4 py-4 text-sm leading-6 text-[var(--on-surface-variant)]">
            <p>
              <strong className="text-[var(--primary)]">Última comprobación:</strong>{' '}
              {state.updateStatus.lastCheckedAt
                ? new Date(state.updateStatus.lastCheckedAt).toLocaleString('es-MX', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : 'Aún no se ha comprobado en esta sesión.'}
            </p>
            {state.updateStatus.dismissedVersion ? (
              <p className="mt-2">
                <strong className="text-[var(--primary)]">Versión silenciada:</strong> {state.updateStatus.dismissedVersion}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleInstall} disabled={!state.updateStatus.available || state.updateStatus.installing}>
              <ArrowDownToLine size={16} />
              Instalar ahora
            </Button>
            <Button
              variant="outline"
              onClick={handleDismiss}
              disabled={!state.updateStatus.available || state.updateStatus.dismissedVersion === state.updateStatus.latestVersion}
            >
              No volver a mostrar
            </Button>
          </div>
        </EditorialCard>

        <EditorialCard className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Notas de versión</p>
            <h2 className="mt-2 font-headline text-2xl font-extrabold text-[var(--primary)]">
              {state.updateStatus.title || 'Sin novedades registradas'}
            </h2>
          </div>

          {state.updateStatus.releaseNotes?.length ? (
            <div className="space-y-3">
              {state.updateStatus.releaseNotes.map((note) => (
                <div
                  key={note}
                  className="rounded-[20px] bg-[var(--surface-container-low)] px-4 py-4 text-sm leading-6 text-[var(--on-surface-variant)]"
                >
                  {note}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[20px] bg-[var(--surface-container-low)] px-4 py-4 text-sm text-[var(--on-surface-variant)]">
              Cuando publiques una versión nueva, aquí aparecerán sus notas principales.
            </div>
          )}
        </EditorialCard>
      </div>
    </div>
  )
}

export default UpdatesPage
