import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useAppContext } from '../app/store/AppContext.jsx'
import MobileNav from '../components/layout/MobileNav.jsx'
import SideNav from '../components/layout/SideNav.jsx'
import TopBar from '../components/layout/TopBar.jsx'
import { isTauriRuntime } from '../utils/platform.js'

function ShutdownSyncModal({ open }) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-[rgba(10,24,40,0.34)] px-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-[28px] bg-white px-6 py-7 text-center shadow-[0_30px_80px_-30px_rgba(0,36,70,0.45)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-container-low)]">
          <div className="h-8 w-8 rounded-full border-[3px] border-[var(--outline-variant)] border-t-[var(--primary)] animate-spin" />
        </div>
        <p className="mt-5 font-headline text-2xl font-extrabold text-[var(--primary)]">Cerrando aplicacion</p>
        <p className="mt-2 text-sm leading-6 text-[var(--on-surface-variant)]">
          Estamos sincronizando con Drive antes de salir para dejar este equipo al dia.
        </p>
      </div>
    </div>
  )
}

function AppLayout() {
  const { state, actions } = useAppContext()
  const location = useLocation()
  const [showShutdownSync, setShowShutdownSync] = useState(false)
  const actionsRef = useRef(actions)
  const stateRef = useRef(state)
  const programmaticCloseRef = useRef(false)

  useEffect(() => {
    actionsRef.current = actions
    stateRef.current = state
  }, [actions, state])

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

  return (
    <>
      <div
        className={state.startup.visible ? 'hidden' : 'page-shell flex h-screen flex-col overflow-hidden'}
        data-motion-mode={state.preferences.motionMode || 'normal'}
        aria-hidden={state.startup.visible}
      >
        <TopBar />
        <div className="mx-auto flex min-h-0 w-full max-w-[1500px] flex-1 items-stretch">
          <SideNav />
          <main className="min-w-0 flex-1 overflow-hidden">
            <div className="app-scroll h-full overflow-y-auto px-4 pb-28 pt-8 lg:px-8 lg:pb-10">
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
      <ShutdownSyncModal open={showShutdownSync} />
    </>
  )
}

export default AppLayout
