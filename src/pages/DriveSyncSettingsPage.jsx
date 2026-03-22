import { ArrowLeft, Cloud, RefreshCcw, ShieldAlert } from 'lucide-react'
import { sileo } from 'sileo'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../app/store/AppContext.jsx'
import Button from '../components/ui/Button.jsx'
import EditorialCard from '../components/ui/EditorialCard.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'

function FirstSyncChoiceModal({ open, loading, onCancel, onChoose }) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[230] flex items-center justify-center bg-[rgba(10,24,40,0.38)] px-4">
      <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-[0_30px_80px_-30px_rgba(0,36,70,0.45)]">
        <div className="space-y-3">
          <p className="font-headline text-xs font-bold uppercase tracking-[0.28em] text-[var(--outline)]">
            Primera sincronizacion
          </p>
          <h4 className="font-headline text-2xl font-extrabold text-[var(--primary)]">
            Elige de donde tomar la base inicial
          </h4>
          <p className="text-sm leading-6 text-[var(--on-surface-variant)]">
            Como esta cuenta aun no tiene una base confirmada para este equipo, primero decide si quieres subir lo
            que ya tienes en local o bajar lo que ya este guardado en Drive.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <button
            className="rounded-[24px] border border-[rgba(67,71,78,0.16)] bg-white p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            onClick={() => onChoose('push')}
          >
            <p className="font-headline text-xl font-extrabold text-[var(--primary)]">Usar este equipo</p>
            <p className="mt-2 text-sm leading-6 text-[var(--on-surface-variant)]">
              Sube a Drive los cantos, secuencias y categorias que ya tienes en esta computadora.
            </p>
          </button>

          <button
            className="rounded-[24px] border border-[rgba(67,71,78,0.16)] bg-white p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            onClick={() => onChoose('pull')}
          >
            <p className="font-headline text-xl font-extrabold text-[var(--primary)]">Traer desde Drive</p>
            <p className="mt-2 text-sm leading-6 text-[var(--on-surface-variant)]">
              Descarga desde Drive la base que ya exista y reemplaza lo sincronizable de este equipo.
            </p>
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}

function SyncInProgressModal({ open }) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[235] flex items-center justify-center bg-[rgba(10,24,40,0.42)] px-4">
      <div className="w-full max-w-md rounded-[28px] bg-white px-6 py-7 text-center shadow-[0_30px_80px_-30px_rgba(0,36,70,0.45)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-container-low)]">
          <div className="h-8 w-8 rounded-full border-[3px] border-[var(--outline-variant)] border-t-[var(--primary)] animate-spin" />
        </div>
        <p className="mt-5 font-headline text-2xl font-extrabold text-[var(--primary)]">Sincronizando con Drive</p>
        <p className="mt-2 text-sm leading-6 text-[var(--on-surface-variant)]">
          Estamos actualizando respaldos y revisando cambios remotos. Esto puede tardar unos segundos.
        </p>
      </div>
    </div>
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
      return 'Aun no se ha realizado ninguna sincronizacion.'
    case 'sin cambios':
      return 'Todo esta al dia entre este equipo y Drive.'
    case 'ok':
      return 'Sincronizacion completada correctamente. Drive y este equipo quedaron alineados.'
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
      return 'Aun no se ha realizado ninguna sincronizacion.'
    }

    return formatSyncResult(state.syncStatus.lastSyncResult)
  }, [state.syncStatus.lastSyncAt, state.syncStatus.lastSyncResult, state.syncStatus.needsInitialSyncChoice])

  const syncMeta = useMemo(() => {
    if (!state.syncStatus.lastSyncAt) {
      return 'Sin historial de sincronizacion en este equipo.'
    }

    const timestamp = new Date(state.syncStatus.lastSyncAt)
    if (Number.isNaN(timestamp.getTime())) {
      return 'Ultima sincronizacion registrada recientemente.'
    }

    return `Ultima sincronizacion: ${timestamp.toLocaleString('es-MX', {
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
        description: 'La cuenta de Google quedo lista para sincronizar este equipo.',
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
        description: 'La sincronizacion quedo desactivada en este equipo.',
      })
    } catch (error) {
      sileo.error({
        title: 'No se pudo desconectar Drive',
        description: getErrorMessage(error, 'Intentalo de nuevo.'),
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
          title: 'Sincronizacion con conflictos',
          description: `Se detectaron ${result.detectedConflicts} conflicto(s) para revisar.`,
        })
      } else {
        sileo.success({
          title: 'Sincronizacion completada',
          description:
            mode === 'push'
              ? 'Drive quedo actualizado con la informacion local de este equipo.'
              : mode === 'pull'
                ? 'La informacion de Drive se aplico correctamente en este equipo.'
                : 'Los respaldos con Drive se actualizaron correctamente.',
        })
      }
    } catch (error) {
      sileo.error({
        title: 'No se pudo sincronizar',
        description: getErrorMessage(error, 'Intentalo de nuevo.'),
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
        description: `Se aplico la version ${resolution === 'local' ? 'local' : 'de Drive'}.`,
      })
    } catch (error) {
      sileo.error({
        title: 'No se pudo resolver el conflicto',
        description: getErrorMessage(error, 'Intentalo de nuevo.'),
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
            description="Conecta Google Drive para respaldar cantos, secuencias y categorias con sincronizacion local-first."
          />
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <EditorialCard>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Conexion</p>
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
                <h2 className="font-headline text-2xl font-extrabold text-[var(--primary)]">Sincronizacion</h2>
                <p className="mt-1 text-sm text-[var(--on-surface-variant)]">{syncSummary}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--outline)]">
                  {syncMeta}
                </p>
              </div>
            </div>

            {!state.driveAuthStatus.configured ? (
              <div className="rounded-[20px] border border-[rgba(186,26,26,0.16)] bg-[rgba(186,26,26,0.06)] px-4 py-4 text-sm leading-6 text-[var(--on-surface)]">
                Tauri no encontro `GOOGLE_DRIVE_CLIENT_ID` y `GOOGLE_DRIVE_CLIENT_SECRET` en la configuracion local de este equipo.
              </div>
            ) : null}

            {state.syncStatus.needsInitialSyncChoice ? (
              <div className="rounded-[20px] border border-[rgba(0,36,70,0.12)] bg-[var(--surface-container-low)] px-4 py-4 text-sm leading-6 text-[var(--on-surface)]">
                Esta cuenta aun no tiene una direccion de sincronizacion para este equipo. La primera vez tendras que
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
                <Button
                  onClick={handleConnect}
                  disabled={!state.driveAuthStatus.configured || busyAction === 'connect'}
                >
                  Conectar Drive
                </Button>
              )}

              <Button
                variant="outline"
                onClick={handleSyncNow}
                disabled={!isConnected || busyAction === 'sync'}
              >
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
                  Si el mismo dato cambia en dos equipos, aqui decides cual version conservar.
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
