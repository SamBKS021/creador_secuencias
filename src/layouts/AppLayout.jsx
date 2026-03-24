import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { sileo } from 'sileo'
import { useAppContext } from '../app/store/AppContext.jsx'
import Button from '../components/ui/Button.jsx'
import MobileNav from '../components/layout/MobileNav.jsx'
import SideNav from '../components/layout/SideNav.jsx'
import TopBar from '../components/layout/TopBar.jsx'
import { isTauriRuntime } from '../utils/platform.js'

function ShutdownSyncModal({ open }) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-[var(--modal-scrim)] px-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-[28px] bg-[var(--surface-container-lowest)] px-6 py-7 text-center shadow-[var(--modal-shadow)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-container-low)]">
          <div className="h-8 w-8 rounded-full border-[3px] border-[var(--outline-variant)] border-t-[var(--primary)] animate-spin" />
        </div>
        <p className="mt-5 font-headline text-2xl font-extrabold text-[var(--primary)]">Cerrando aplicación</p>
        <p className="mt-2 text-sm leading-6 text-[var(--on-surface-variant)]">
          Estamos sincronizando con Drive antes de salir para dejar este equipo al día.
        </p>
      </div>
    </div>
  )
}

function UpdatePendingModal({ open, updateStatus, onClose, onDismissForever, onInstallNow, onOpenDetails }) {
  const [doNotShowAgain, setDoNotShowAgain] = useState(false)

  useEffect(() => {
    if (!open) {
      setDoNotShowAgain(false)
    }
  }, [open])

  if (!open || !updateStatus.available) {
    return null
  }

  function handleLater() {
    if (doNotShowAgain) {
      onDismissForever()
      return
    }

    onClose()
  }

  return (
    <div className="fixed inset-0 z-[245] flex items-center justify-center bg-[var(--modal-scrim)] px-4 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-[28px] bg-[var(--surface-container-lowest)] px-6 py-7 shadow-[var(--modal-shadow)]">
        <p className="font-headline text-xs font-bold uppercase tracking-[0.28em] text-[var(--outline)]">
          Actualización disponible
        </p>
        <h3 className="mt-3 font-headline text-3xl font-extrabold text-[var(--primary)]">
          {updateStatus.title || 'Hay una nueva versión lista para instalar'}
        </h3>
        <p className="mt-3 text-sm leading-6 text-[var(--on-surface-variant)]">
          Versión instalada: <strong>{updateStatus.currentVersion || 'actual'}</strong>
          {' · '}
          Nueva versión: <strong>{updateStatus.latestVersion}</strong>
        </p>

        {updateStatus.releaseNotes?.length ? (
          <div className="mt-5 rounded-[22px] bg-[var(--surface-container-low)] px-4 py-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Novedades</p>
            <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--on-surface-variant)]">
              {updateStatus.releaseNotes.slice(0, 4).map((note) => (
                <p key={note}>• {note}</p>
              ))}
            </div>
          </div>
        ) : null}

        <label className="mt-5 flex items-center gap-3 text-sm text-[var(--on-surface-variant)]">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--primary)]"
            checked={doNotShowAgain}
            onChange={(event) => setDoNotShowAgain(event.target.checked)}
          />
          No volver a mostrar para esta versión
        </label>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="outline" onClick={onOpenDetails}>
            Ver detalles
          </Button>
          <Button variant="ghost" onClick={handleLater}>
            Después
          </Button>
          <Button onClick={onInstallNow}>Instalar ahora</Button>
        </div>
      </div>
    </div>
  )
}

function UpdateInstallingModal({ open, progress }) {
  if (!open) {
    return null
  }

  const percent = Math.max(0, Math.min(100, Math.round(progress?.percent || 0)))

  return (
    <div className="fixed inset-0 z-[246] flex items-center justify-center bg-[var(--modal-scrim)] px-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-[28px] bg-[var(--surface-container-lowest)] px-6 py-7 text-center shadow-[var(--modal-shadow)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-container-low)]">
          <div className="h-8 w-8 rounded-full border-[3px] border-[var(--outline-variant)] border-t-[var(--primary)] animate-spin" />
        </div>
        <p className="mt-5 font-headline text-2xl font-extrabold text-[var(--primary)]">Instalando actualización</p>
        <p className="mt-2 text-sm leading-6 text-[var(--on-surface-variant)]">
          {progress?.detail || 'Estamos descargando e instalando la nueva versión de la app.'}
        </p>
        <div className="mt-5 overflow-hidden rounded-full bg-[var(--surface-container-low)]">
          <div
            className="h-2 rounded-full bg-[var(--primary)] transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--outline)]">{percent}%</p>
      </div>
    </div>
  )
}

function AppLayout() {
  const { state, actions } = useAppContext()
  const location = useLocation()
  const navigate = useNavigate()
  const [showShutdownSync, setShowShutdownSync] = useState(false)
  const actionsRef = useRef(actions)
  const stateRef = useRef(state)
  const programmaticCloseRef = useRef(false)
  const notifiedUpdateVersionRef = useRef('')

  useEffect(() => {
    actionsRef.current = actions
    stateRef.current = state
  }, [actions, state])

  useEffect(() => {
    if (!state.updateStatus.available || !state.updateStatus.latestVersion) {
      return
    }

    if (notifiedUpdateVersionRef.current === state.updateStatus.latestVersion) {
      return
    }

    notifiedUpdateVersionRef.current = state.updateStatus.latestVersion
    sileo.info({
      title: 'Actualización disponible',
      description: `${state.updateStatus.latestVersion} está lista para instalar.`,
    })
  }, [state.updateStatus.available, state.updateStatus.latestVersion])

  useEffect(() => {
    if (!state.startup.visible) {
      return undefined
    }

    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlBackground = document.documentElement.style.background
    const previousBodyBackground = document.body.style.background
    const rootElement = document.getElementById('root')
    const previousRootBackground = rootElement?.style.background ?? ''
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.documentElement.style.background = 'transparent'
    document.body.style.background = 'transparent'
    if (rootElement) {
      rootElement.style.background = 'transparent'
    }

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.background = previousHtmlBackground
      document.body.style.background = previousBodyBackground
      if (rootElement) {
        rootElement.style.background = previousRootBackground
      }
    }
  }, [state.startup.visible])

  useEffect(() => {
    if (!isTauriRuntime()) {
      return undefined
    }

    const appWindow = getCurrentWindow()
    let mounted = true
    let unlisten

    ;(async () => {
      unlisten = await appWindow.onCloseRequested(async (event) => {
        if (programmaticCloseRef.current) {
          return
        }

        async function finishClose() {
          programmaticCloseRef.current = true
          if (mounted) {
            setShowShutdownSync(false)
          }

          if (unlisten) {
            unlisten()
            unlisten = undefined
          }

          try {
            await actionsRef.current.exitApplication()
          } catch (_) {
            try {
              await appWindow.destroy()
            } catch (_) {
              await appWindow.close()
            }
          }
        }

        event.preventDefault()
        const currentState = stateRef.current

        if (
          !currentState.workspaceRoot ||
          !currentState.driveAuthStatus.connected ||
          currentState.syncStatus.needsInitialSyncChoice
        ) {
          await finishClose()
          return
        }

        if (mounted) {
          setShowShutdownSync(true)
        }

        try {
          await actionsRef.current.syncWorkspaceNow('shutdown', 'merge')
        } catch (_) {
          // no bloqueamos el cierre si el sync final falla
        } finally {
          await finishClose()
        }
      })
    })()

    return () => {
      mounted = false
      if (unlisten) {
        unlisten()
      }
    }
  }, [])

  async function handleInstallUpdate() {
    try {
      actions.setUpdatePromptVisible(false)
      await actions.downloadAndInstallUpdate()
    } catch (error) {
      sileo.error({
        title: 'No se pudo instalar la actualización',
        description: error?.message || 'Inténtalo de nuevo más tarde.',
      })
    }
  }

  async function handleDismissUpdatePermanently() {
    try {
      await actions.dismissUpdate(state.updateStatus.latestVersion)
    } catch (error) {
      sileo.error({
        title: 'No se pudo guardar la preferencia',
        description: error?.message || 'Inténtalo de nuevo.',
      })
    }
  }

  return (
    <>
      <div
        className={state.startup.visible ? 'hidden' : 'page-shell flex h-screen flex-col overflow-hidden'}
        data-motion-mode={state.preferences.motionMode || 'normal'}
        data-theme-mode={state.preferences.themeMode || 'light'}
        aria-hidden={state.startup.visible}
      >
        <TopBar />
        <div className="mx-auto flex min-h-0 w-full max-w-[1500px] flex-1 items-stretch">
          <SideNav />
          <main className="min-w-0 flex-1 overflow-hidden">
            <div className="app-scroll h-full overflow-x-hidden overflow-y-auto px-4 pb-28 pt-8 lg:px-8 lg:pb-10">
              {state.error ? (
                <div className="mb-5 rounded-2xl bg-[rgba(186,26,26,0.08)] px-4 py-3 text-sm text-[var(--error)]">
                  {state.error}
                </div>
              ) : null}
              <div key={location.pathname} className="motion-page">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
        <MobileNav />
      </div>
      <UpdatePendingModal
        open={
          !state.startup.visible &&
          !showShutdownSync &&
          state.updateStatus.modalEligible &&
          state.updateStatus.promptVisible &&
          !state.updateStatus.installing
        }
        updateStatus={state.updateStatus}
        onClose={() => actions.setUpdatePromptVisible(false)}
        onDismissForever={handleDismissUpdatePermanently}
        onInstallNow={handleInstallUpdate}
        onOpenDetails={() => {
          actions.setUpdatePromptVisible(false)
          navigate('/actualizaciones')
        }}
      />
      <UpdateInstallingModal open={state.updateStatus.installing} progress={state.updateStatus.installProgress} />
      <ShutdownSyncModal open={showShutdownSync} />
    </>
  )
}

export default AppLayout
