import { ArrowLeft, Cloud, RefreshCcw, ShieldAlert } from 'lucide-react'
import { sileo } from 'sileo'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../app/store/AppContext.jsx'
import Button from '../components/ui/Button.jsx'
import EditorialCard from '../components/ui/EditorialCard.jsx'
import ModalShell from '../components/ui/ModalShell.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'

function FirstSyncChoiceModal({ open, loading, onCancel, onChoose }) {
  if (!open) {
    return null
  }

  return (
    <ModalShell
      zIndex="z-[230]"
      panelClassName="w-full max-w-2xl rounded-[28px] bg-[var(--surface-container-lowest)] p-6 shadow-[var(--modal-shadow)]"
    >
        <div className="space-y-3">
          <p className="font-headline text-xs font-bold uppercase tracking-[0.28em] text-[var(--outline)]">
            Primera sincronización
          </p>
          <h4 className="font-headline text-2xl font-extrabold text-[var(--primary)]">
            Elige de dónde tomar la base inicial
          </h4>
          <p className="text-sm leading-6 text-[var(--on-surface-variant)]">
            Como esta cuenta aún no tiene una base confirmada para este equipo, primero decide si quieres subir lo
            que ya tienes en local o bajar lo que ya está guardado en Drive.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <button
            className="rounded-[24px] border border-[rgba(67,71,78,0.16)] bg-[var(--surface-container-lowest)] p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            onClick={() => onChoose('push')}
          >
            <p className="font-headline text-xl font-extrabold text-[var(--primary)]">Usar este equipo</p>
            <p className="mt-2 text-sm leading-6 text-[var(--on-surface-variant)]">
              Sube a Drive los cantos, secuencias y categorías que ya tienes en esta computadora.
            </p>
          </button>

          <button
            className="rounded-[24px] border border-[rgba(67,71,78,0.16)] bg-[var(--surface-container-lowest)] p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            onClick={() => onChoose('pull')}
          >
            <p className="font-headline text-xl font-extrabold text-[var(--primary)]">Traer desde Drive</p>
            <p className="mt-2 text-sm leading-6 text-[var(--on-surface-variant)]">
              Descarga desde Drive la base existente y reemplaza lo sincronizable de este equipo.
            </p>
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        </div>
    </ModalShell>
  )
}

function SyncInProgressModal({ open }) {
  if (!open) {
    return null
  }

  return (
    <ModalShell
      zIndex="z-[235]"
      panelClassName="w-full max-w-md rounded-[28px] bg-[var(--surface-container-lowest)] px-6 py-7 text-center shadow-[var(--modal-shadow)]"
    >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-container-low)]">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--outline-variant)] border-t-[var(--primary)]" />
        </div>
        <p className="mt-5 font-headline text-2xl font-extrabold text-[var(--primary)]">Sincronizando con Drive</p>
        <p className="mt-2 text-sm leading-6 text-[var(--on-surface-variant)]">
          Estamos actualizando respaldos y revisando cambios remotos. Esto puede tardar unos segundos.
        </p>
    </ModalShell>
  )
}

function getErrorMessage(error, fallback) {
  if (typeof error === 'string' && error.trim()) {
    return error
  }

  if (error?.message) {
    return error.message
  }

  return fallback
}

function formatSyncResult(result) {
  const value = String(result || '').trim().toLowerCase()
  switch (value) {
    case '':
      return 'Aún no se ha realizado ninguna sincronización.'
    case 'sin cambios':
      return 'Todo está al día entre este equipo y Drive.'
    case 'ok':
      return 'Sincronización completada correctamente. Drive y este equipo quedaron alineados.'
    case 'ok (local -> drive)':
      return 'Se subieron los cambios locales a Drive.'
    case 'ok (drive -> local)':
      return 'Se descargaron los cambios de Drive a este equipo.'
    case 'conflictos pendientes':
      return 'Hay conflictos pendientes por revisar.'
    default:
      return result
  }
}

function DriveSyncSettingsPage() {
  const navigate = useNavigate()
  const { state, actions } = useAppContext()
  const [busyAction, setBusyAction] = useState('')
  const [showFirstSyncChoice, setShowFirstSyncChoice] = useState(false)
  const isConnected = state.driveAuthStatus.connected

  useEffect(() => {
    actions.refreshSyncStatus().catch(() => {})
  }, [])

  const syncSummary = useMemo(() => {
    if (state.syncStatus.needsInitialSyncChoice) {
      return 'Antes de sincronizar por primera vez con esta cuenta, elige si quieres subir lo local o bajar lo de Drive.'
    }

    if (!state.syncStatus.lastSyncAt) {
      return 'Aún no se ha realizado ninguna sincronización.'
    }

    return formatSyncResult(state.syncStatus.lastSyncResult)
  }, [state.syncStatus.lastSyncAt, state.syncStatus.lastSyncResult, state.syncStatus.needsInitialSyncChoice])

  const syncMeta = useMemo(() => {
    if (!state.syncStatus.lastSyncAt) {
      return 'Sin historial de sincronización en este equipo.'
    }

    const timestamp = new Date(state.syncStatus.lastSyncAt)
    if (Number.isNaN(timestamp.getTime())) {
      return 'Última sincronización registrada recientemente.'
    }

    return `Última sincronización: ${timestamp.toLocaleString('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })}`
  }, [state.syncStatus.lastSyncAt])

  async function handleConnect() {
    setBusyAction('connect')
    try {
      await actions.connectGoogleDrive()
      sileo.success({
        title: 'Drive conectado',
        description: 'La cuenta de Google quedó lista para sincronizar este equipo.',
      })
    } catch (error) {
      sileo.error({
        title: 'No se pudo conectar Drive',
        description: getErrorMessage(error, 'Revisa tus credenciales OAuth locales.'),
      })
    } finally {
      setBusyAction('')
    }
  }

  async function handleDisconnect() {
    setBusyAction('disconnect')
    try {
      await actions.disconnectGoogleDrive()
      sileo.info({
        title: 'Drive desconectado',
        description: 'La sincronización quedó desactivada en este equipo.',
      })
    } catch (error) {
      sileo.error({
        title: 'No se pudo desconectar Drive',
        description: getErrorMessage(error, 'Inténtalo de nuevo.'),
      })
    } finally {
      setBusyAction('')
    }
  }

  async function runSync(mode = 'merge') {
    setShowFirstSyncChoice(false)
    setBusyAction('sync')
    try {
      const result = await actions.syncWorkspaceNow('manual', mode)
      if (result.detectedConflicts) {
        sileo.warning({
          title: 'Sincronización con conflictos',
          description: `Se detectaron ${result.detectedConflicts} conflicto(s) para revisar.`,
        })
      } else {
        sileo.success({
          title: 'Sincronización completada',
          description:
            mode === 'push'
              ? 'Drive quedó actualizado con la información local de este equipo.'
              : mode === 'pull'
                ? 'La información de Drive se aplicó correctamente en este equipo.'
                : 'Los respaldos con Drive se actualizaron correctamente.',
        })
      }
    } catch (error) {
      sileo.error({
        title: 'No se pudo sincronizar',
        description: getErrorMessage(error, 'Inténtalo de nuevo.'),
      })
    } finally {
      setBusyAction('')
    }
  }

  function handleSyncNow() {
    if (state.syncStatus.needsInitialSyncChoice) {
      setShowFirstSyncChoice(true)
      return
    }

    runSync('merge')
  }

  async function handleResolve(conflict, resolution) {
    setBusyAction(`${resolution}-${conflict.logicalKey}`)
    try {
      await actions.resolveSyncConflict({
        logicalKey: conflict.logicalKey,
        resolution,
      })
      sileo.success({
        title: 'Conflicto resuelto',
        description: `Se aplicó la versión ${resolution === 'local' ? 'local' : 'de Drive'}.`,
      })
    } catch (error) {
      sileo.error({
        title: 'No se pudo resolver el conflicto',
        description: getErrorMessage(error, 'Inténtalo de nuevo.'),
      })
    } finally {
      setBusyAction('')
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-2">
          <Button variant="ghost" className="px-0 py-1 text-sm" onClick={() => navigate('/ajustes')}>
            <ArrowLeft size={16} />
            Volver a ajustes
          </Button>

          <PageHeader
            eyebrow="Ajustes"
            title="Drive"
            description="Conecta Google Drive para respaldar cantos, secuencias y categorías con sincronización local-first."
          />
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <EditorialCard>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Conexión</p>
            <p className="mt-2 text-sm font-semibold text-[var(--primary)]">
              {isConnected
                ? state.syncStatus.needsInitialSyncChoice
                  ? 'Conectada, pendiente de base inicial'
                  : 'Activa'
                : state.driveAuthStatus.configured
                  ? 'Lista para conectar'
                  : 'Falta configurar'}
            </p>
          </EditorialCard>
          <EditorialCard>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Cuenta</p>
            <p className="mt-2 text-sm font-semibold text-[var(--primary)]">
              {state.driveAuthStatus.connectedAccountEmail || 'Sin cuenta conectada'}
            </p>
          </EditorialCard>
          <EditorialCard>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Conflictos</p>
            <p className="mt-2 font-headline text-4xl font-extrabold text-[var(--primary)]">
              {state.syncStatus.pendingConflicts?.length || 0}
            </p>
          </EditorialCard>
        </section>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <EditorialCard className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-container-low)] text-[var(--primary)]">
                <Cloud size={20} />
              </div>
              <div>
                <h2 className="font-headline text-2xl font-extrabold text-[var(--primary)]">Sincronización</h2>
                <p className="mt-1 text-sm text-[var(--on-surface-variant)]">{syncSummary}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--outline)]">
                  {syncMeta}
                </p>
              </div>
            </div>

            {!state.driveAuthStatus.configured ? (
              <div className="rounded-[20px] border border-[rgba(186,26,26,0.16)] bg-[rgba(186,26,26,0.06)] px-4 py-4 text-sm leading-6 text-[var(--on-surface)]">
                Tauri no encontró `GOOGLE_DRIVE_CLIENT_ID` y `GOOGLE_DRIVE_CLIENT_SECRET` en la configuración local de este equipo.
              </div>
            ) : null}

            {state.syncStatus.needsInitialSyncChoice ? (
              <div className="rounded-[20px] border border-[rgba(0,36,70,0.12)] bg-[var(--surface-container-low)] px-4 py-4 text-sm leading-6 text-[var(--on-surface)]">
                Esta cuenta aún no tiene una dirección de sincronización para este equipo. La primera vez tendrás que
                elegir si quieres subir lo local o descargar lo que ya exista en Drive.
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {isConnected ? (
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={busyAction === 'disconnect' || busyAction === 'sync'}
                >
                  Desconectar Drive
                </Button>
              ) : (
                <Button onClick={handleConnect} disabled={!state.driveAuthStatus.configured || busyAction === 'connect'}>
                  Conectar Drive
                </Button>
              )}

              <Button variant="outline" onClick={handleSyncNow} disabled={!isConnected || busyAction === 'sync'}>
                <RefreshCcw size={16} />
                Sincronizar ahora
              </Button>
            </div>
          </EditorialCard>

          <EditorialCard className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-container-low)] text-[var(--primary)]">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h2 className="font-headline text-2xl font-extrabold text-[var(--primary)]">Conflictos pendientes</h2>
                <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
                  Si el mismo dato cambia en dos equipos, aquí decides cuál versión conservar.
                </p>
              </div>
            </div>

            {state.syncStatus.pendingConflicts?.length ? (
              <div className="space-y-3">
                {state.syncStatus.pendingConflicts.map((conflict) => (
                  <div key={conflict.logicalKey} className="rounded-[20px] bg-[var(--surface-container-low)] px-4 py-4">
                    <p className="font-semibold text-[var(--primary)]">{conflict.title || conflict.logicalKey}</p>
                    <p className="mt-1 text-sm text-[var(--on-surface-variant)]">{conflict.logicalKey}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className="rounded-lg px-3 py-2 text-xs"
                        onClick={() => handleResolve(conflict, 'remote')}
                        disabled={busyAction === `remote-${conflict.logicalKey}`}
                      >
                        Conservar Drive
                      </Button>
                      <Button
                        className="rounded-lg px-3 py-2 text-xs"
                        onClick={() => handleResolve(conflict, 'local')}
                        disabled={busyAction === `local-${conflict.logicalKey}`}
                      >
                        Conservar local
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[20px] bg-[var(--surface-container-low)] px-4 py-4 text-sm text-[var(--on-surface-variant)]">
                No hay conflictos pendientes.
              </div>
            )}
          </EditorialCard>
        </div>
      </div>

      <FirstSyncChoiceModal
        open={showFirstSyncChoice}
        loading={busyAction === 'sync'}
        onCancel={() => setShowFirstSyncChoice(false)}
        onChoose={(mode) => runSync(mode)}
      />
      <SyncInProgressModal open={busyAction === 'sync'} />
    </>
  )
}

export default DriveSyncSettingsPage
