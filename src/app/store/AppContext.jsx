/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import { listen } from '@tauri-apps/api/event'
import StartupOverlay from '../../components/system/StartupOverlay.jsx'
import service from '../../services/workspaceService.js'
import { isTauriRuntime } from '../../utils/platform.js'
import { filterSongs } from '../../utils/workspace.js'
import { appReducer, initialState, selectActiveDraft, selectActiveSequence, selectActiveSong } from './appReducer.js'

const AppContext = createContext(null)

function buildEmptyBootstrap(config, songCategories) {
  return {
    songs: [],
    sequences: [],
    drafts: [],
    stats: { totalSongs: 0, totalSequences: 0, recentUploads: [], upcomingSequences: [] },
    recentRoots: config.recentRoots,
    preferences: config.preferences,
    dismissedUpdateVersion: config.dismissedUpdateVersion,
    songCategories,
    workspaceRoot: '',
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, {
    ...initialState,
    platformMode: isTauriRuntime() ? 'tauri' : 'web',
  })
  const initializeOnceRef = useRef(false)
  const updateCheckOnceRef = useRef(false)

  useEffect(() => {
    if (initializeOnceRef.current) {
      return
    }
    initializeOnceRef.current = true

    function updateStartup(progress, detail) {
      dispatch({
        type: 'startup:set',
        payload: {
          progress,
          detail,
        },
      })
    }

    async function wait(ms) {
      await new Promise((resolve) => setTimeout(resolve, ms))
    }

    async function initialize() {
      dispatch({ type: 'bootstrap:start' })
      updateStartup(12, 'Preparando entorno local...')

      try {
        const config = await service.getWorkspaceConfig()
        dispatch({ type: 'workspace:selected', payload: config })

        updateStartup(24, 'Leyendo configuración de este equipo...')
        const [authStatus, syncStatus] = await Promise.all([
          service.getDriveAuthStatus?.() || Promise.resolve(null),
          service.getSyncStatus?.() || Promise.resolve(null),
        ])

        if (authStatus) {
          dispatch({ type: 'driveAuth:set', payload: authStatus })
        }
        if (syncStatus) {
          dispatch({ type: 'sync:set', payload: syncStatus })
        }

        updateStartup(38, 'Comprobando estado de Google Drive...')

        if (!config.workspaceRoot) {
          updateStartup(72, 'Listo para comenzar.')
          await wait(220)
          dispatch({
            type: 'bootstrap:success',
          payload: buildEmptyBootstrap(config, state.songCategories),
        })
        dispatch({ type: 'startup:done' })
        return
        }

        updateStartup(56, 'Cargando cantos y secuencias...')
        let bootstrap = await service.bootstrapApp(config.workspaceRoot)

        dispatch({
          type: 'bootstrap:success',
          payload: {
            ...bootstrap,
            workspaceRoot: config.workspaceRoot,
            recentRoots: config.recentRoots,
            preferences: config.preferences,
            dismissedUpdateVersion: config.dismissedUpdateVersion,
          },
        })

        if (syncStatus?.connected && !syncStatus?.needsInitialSyncChoice) {
          updateStartup(78, 'Sincronizando con Google Drive...')

          try {
            const result = await service.syncWorkspaceNow?.('startup', 'merge')
            if (result) {
              dispatch({
                type: 'sync:set',
                payload: {
                  ...result,
                  syncing: false,
                },
              })
            }

            bootstrap = await service.bootstrapApp(config.workspaceRoot)
            dispatch({
              type: 'bootstrap:success',
              payload: {
                ...bootstrap,
                workspaceRoot: config.workspaceRoot,
                recentRoots: config.recentRoots,
                preferences: config.preferences,
                dismissedUpdateVersion: config.dismissedUpdateVersion,
              },
            })

            const [refreshedAuthStatus, refreshedSyncStatus] = await Promise.all([
              service.getDriveAuthStatus?.() || Promise.resolve(null),
              service.getSyncStatus?.() || Promise.resolve(null),
            ])

            if (refreshedAuthStatus) {
              dispatch({ type: 'driveAuth:set', payload: refreshedAuthStatus })
            }
            if (refreshedSyncStatus) {
              dispatch({ type: 'sync:set', payload: refreshedSyncStatus })
            }
          } catch {
            updateStartup(82, 'No se pudo sincronizar con Drive. Continuando en local...')
            const refreshedSyncStatus = await service.getSyncStatus?.().catch(() => null)
            if (refreshedSyncStatus) {
              dispatch({ type: 'sync:set', payload: refreshedSyncStatus })
            }
            await wait(260)
          }
        }

        updateStartup(96, 'Abriendo Centro Musical...')
        await wait(180)
        dispatch({ type: 'startup:done' })
      } catch (error) {
        dispatch({
          type: 'bootstrap:error',
          payload: error.message || 'No fue posible iniciar la aplicación.',
        })
        updateStartup(100, 'No se pudo completar el inicio. Abriendo en modo local...')
        await wait(320)
        dispatch({ type: 'startup:done' })
      }
    }

    initialize()
  }, [])

  useEffect(() => {
    if (!isTauriRuntime()) {
      return undefined
    }

    let unlisten

    ;(async () => {
      unlisten = await listen('app-update-progress', (event) => {
        dispatch({
          type: 'update:progress',
          payload: event.payload || null,
        })
      })
    })()

    return () => {
      if (unlisten) {
        unlisten()
      }
    }
  }, [])

  useEffect(() => {
    if (state.startup.visible || updateCheckOnceRef.current) {
      return
    }

    updateCheckOnceRef.current = true

    ;(async () => {
      try {
        dispatch({ type: 'update:set', payload: { checking: true } })
        const result = await service.checkAppUpdate?.()
        if (!result) {
          dispatch({ type: 'update:set', payload: { checking: false } })
          return
        }

        dispatch({
          type: 'update:set',
          payload: {
            ...result,
            checking: false,
            modalEligible: true,
            promptVisible:
              Boolean(result.available) &&
              state.startup.visible === false &&
              (!result.dismissedVersion || result.dismissedVersion !== result.latestVersion),
            lastCheckedAt: new Date().toISOString(),
            installProgress: null,
          },
        })
      } catch {
        dispatch({ type: 'update:set', payload: { checking: false, modalEligible: true } })
      }
    })()
  }, [state.startup.visible])

  useEffect(() => {
    const themeMode = state.preferences.themeMode || 'light'
    const motionMode = state.preferences.motionMode || 'normal'
    document.documentElement.dataset.themeMode = themeMode
    document.body.dataset.themeMode = themeMode
    document.documentElement.dataset.motionMode = motionMode
    document.body.dataset.motionMode = motionMode

    return () => {
      delete document.documentElement.dataset.themeMode
      delete document.body.dataset.themeMode
      delete document.documentElement.dataset.motionMode
      delete document.body.dataset.motionMode
    }
  }, [state.preferences.themeMode, state.preferences.motionMode])

  async function chooseWorkspace() {
    const result = await service.selectWorkspaceRoot()
    const config = await service.getWorkspaceConfig()
    dispatch({
      type: 'workspace:selected',
      payload: {
        workspaceRoot: result.workspaceRoot,
        recentRoots: config.recentRoots,
      },
    })

    const bootstrap = await service.bootstrapApp(result.workspaceRoot)
    const songCategories = await service.getSongCategories?.().catch(() => bootstrap.songCategories || [])
    dispatch({
      type: 'bootstrap:success',
      payload: {
        ...bootstrap,
        songCategories,
        workspaceRoot: result.workspaceRoot,
        recentRoots: config.recentRoots,
        preferences: config.preferences,
      },
    })
  }

  async function importSongFiles() {
    const result = await service.openSongFiles()
    dispatch({ type: 'drafts:set', payload: result.drafts || [] })
  }

  async function importSongDocxBatch() {
    return service.importSongDocxBatch()
  }

  async function saveSongCategories(categories) {
    const nextCategories = await service.saveSongCategories(categories)
    dispatch({ type: 'songCategories:set', payload: nextCategories })
    return nextCategories
  }

  async function saveMotionMode(motionMode) {
    const preferences = await service.saveMotionMode(motionMode)
    dispatch({ type: 'preferences:set', payload: preferences })
    return preferences
  }

  async function saveThemeMode(themeMode) {
    const preferences = await service.saveThemeMode(themeMode)
    dispatch({ type: 'preferences:set', payload: preferences })
    return preferences
  }

  async function saveSong(payload) {
    const result = await service.saveSong(payload)
    dispatch({
      type: 'songs:upsert',
      payload: {
        song: result.song,
        stats: result.stats,
        draftId: payload.draftId,
      },
    })
    return result
  }

  async function updateSong(payload) {
    const result = await service.updateSong(payload)
    dispatch({
      type: 'songs:upsert',
      payload: {
        song: result.song,
        stats: result.stats,
      },
    })
    return result
  }

  async function saveSequence(payload) {
    const result = await service.saveSequence(payload)
    dispatch({
      type: 'sequence:save',
      payload: {
        sequence: result.sequence,
        songs: result.songs,
        stats: result.stats,
      },
    })
    return result
  }

  async function deleteSequence(sequenceId) {
    await service.deleteSequence(sequenceId)
    dispatch({ type: 'sequence:delete', payload: sequenceId })
  }

  async function deleteSong(songId) {
    await service.deleteSong(songId)
    dispatch({ type: 'songs:delete', payload: songId })
  }

  async function checkSequenceExport(sequenceId) {
    return service.checkSequenceExportDocx(sequenceId)
  }

  async function getSequenceExportStatuses() {
    return service.getSequenceExportStatuses()
  }

  async function openExportedSequence(sequenceId) {
    return service.openExportedSequenceDocx(sequenceId)
  }

  async function exportSequence(sequenceId, overwrite = false) {
    const result = await service.exportSequenceDocx(sequenceId, overwrite)
    dispatch({ type: 'export:done', payload: result })
    return result
  }

  async function openExportsFolder() {
    await service.openExportsFolder()
  }

  async function refreshSyncStatus() {
    const [authStatus, syncStatus] = await Promise.all([
      service.getDriveAuthStatus(),
      service.getSyncStatus(),
    ])
    dispatch({ type: 'driveAuth:set', payload: authStatus })
    dispatch({ type: 'sync:set', payload: syncStatus })
    return { authStatus, syncStatus }
  }

  async function checkForAppUpdate() {
    dispatch({ type: 'update:set', payload: { checking: true } })
    try {
      const result = await service.checkAppUpdate?.()
      dispatch({
        type: 'update:set',
        payload: {
          ...result,
          checking: false,
          modalEligible: true,
          promptVisible:
            Boolean(result?.available) &&
            (!result?.dismissedVersion || result.dismissedVersion !== result.latestVersion),
          lastCheckedAt: new Date().toISOString(),
        },
      })
      return result
    } catch (error) {
      dispatch({ type: 'update:set', payload: { checking: false } })
      throw error
    }
  }

  async function dismissUpdate(version) {
    await service.dismissAppUpdate?.(version)
    dispatch({
      type: 'update:set',
      payload: {
        dismissedVersion: version,
        promptVisible: false,
      },
    })
  }

  async function downloadAndInstallUpdate() {
    dispatch({
      type: 'update:set',
      payload: {
        installing: true,
        installProgress: {
          stage: 'starting',
          percent: 0,
          detail: 'Preparando actualización...',
        },
      },
    })
    try {
      const result = await service.installAppUpdate?.()
      dispatch({
        type: 'update:set',
        payload: {
          installing: false,
          available: false,
          promptVisible: false,
        },
      })
      return result
    } catch (error) {
      dispatch({ type: 'update:set', payload: { installing: false } })
      throw error
    }
  }

  async function connectGoogleDrive() {
    const status = await service.connectGoogleDrive()
    dispatch({ type: 'driveAuth:set', payload: status })
    const syncStatus = await service.getSyncStatus()
    dispatch({ type: 'sync:set', payload: syncStatus })
    return status
  }

  async function disconnectGoogleDrive() {
    const status = await service.disconnectGoogleDrive()
    dispatch({ type: 'driveAuth:set', payload: status })
    const syncStatus = await service.getSyncStatus()
    dispatch({ type: 'sync:set', payload: syncStatus })
    return status
  }

  async function syncWorkspaceNow(reason = 'manual', mode = 'merge') {
    dispatch({ type: 'sync:set', payload: { syncing: true } })
    try {
      const result = await service.syncWorkspaceNow(reason, mode)
      dispatch({
        type: 'sync:set',
        payload: {
          ...result,
          syncing: false,
          pendingConflicts: result.pendingConflicts || [],
        },
      })

      const bootstrap = await service.bootstrapApp(state.workspaceRoot)
      dispatch({
        type: 'bootstrap:success',
        payload: {
          ...bootstrap,
          songCategories: bootstrap.songCategories || state.songCategories,
          workspaceRoot: state.workspaceRoot,
          recentRoots: state.recentRoots,
          preferences: state.preferences,
          activeSongId: state.activeSongId,
          activeSequenceId: state.activeSequenceId,
        },
      })

      const [authStatus, syncStatus] = await Promise.all([
        service.getDriveAuthStatus?.() || Promise.resolve(null),
        service.getSyncStatus?.() || Promise.resolve(null),
      ])

      if (authStatus) {
        dispatch({ type: 'driveAuth:set', payload: authStatus })
      }
      if (syncStatus) {
        dispatch({ type: 'sync:set', payload: syncStatus })
      }

      return result
    } catch (error) {
      dispatch({ type: 'sync:set', payload: { syncing: false } })
      throw error
    }
  }

  async function resolveSyncConflict(payload) {
    const result = await service.resolveSyncConflict(payload)
    dispatch({
      type: 'sync:set',
      payload: {
        ...result,
        pendingConflicts: result.pendingConflicts || [],
      },
    })
    const bootstrap = await service.bootstrapApp(state.workspaceRoot)
    dispatch({
      type: 'bootstrap:success',
      payload: {
        ...bootstrap,
        songCategories: bootstrap.songCategories || state.songCategories,
        workspaceRoot: state.workspaceRoot,
        recentRoots: state.recentRoots,
        preferences: state.preferences,
        activeSongId: state.activeSongId,
        activeSequenceId: state.activeSequenceId,
      },
    })
    return result
  }

  async function exitApplication() {
    if (service.exitApplication) {
      return service.exitApplication()
    }
    return { ok: true }
  }

  const filteredSongs = useMemo(() => filterSongs(state.songs, state.libraryFilters), [state.songs, state.libraryFilters])
  const activeSong = useMemo(() => selectActiveSong(state), [state.songs, state.activeSongId])
  const activeDraft = useMemo(() => selectActiveDraft(state), [state.drafts, state.activeDraftId])
  const activeSequence = useMemo(() => selectActiveSequence(state), [state.sequences, state.activeSequenceId])

  const value = {
    state,
    filteredSongs,
    activeSong,
    activeDraft,
    activeSequence,
    actions: {
      chooseWorkspace,
      importSongFiles,
      importSongDocxBatch,
      saveSongCategories,
      saveMotionMode,
      saveThemeMode,
      refreshSyncStatus,
      checkForAppUpdate,
      dismissUpdate,
      downloadAndInstallUpdate,
      connectGoogleDrive,
      disconnectGoogleDrive,
      syncWorkspaceNow,
      resolveSyncConflict,
      exitApplication,
      saveSong,
      updateSong,
      saveSequence,
      deleteSequence,
      deleteSong,
      checkSequenceExport,
      getSequenceExportStatuses,
      openExportedSequence,
      exportSequence,
      openExportsFolder,
      clearExportResult() {
        dispatch({ type: 'export:clear' })
      },
      setLibraryFilters(payload) {
        dispatch({ type: 'library:filters', payload })
      },
      setActiveSong(songId) {
        dispatch({ type: 'song:active', payload: songId })
      },
      setActiveDraft(draftId) {
        dispatch({ type: 'draft:active', payload: draftId })
      },
      setActiveSequence(sequenceId) {
        dispatch({ type: 'sequence:active', payload: sequenceId })
      },
      clearError() {
        dispatch({ type: 'error:set', payload: '' })
      },
      setUpdatePromptVisible(value) {
        dispatch({ type: 'update:set', payload: { promptVisible: value } })
      },
    },
  }

  return (
    <AppContext.Provider value={value}>
      {children}
      <StartupOverlay
        open={state.startup.visible}
        progress={state.startup.progress}
        detail={state.startup.detail}
      />
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext debe usarse dentro de AppProvider.')
  }
  return context
}
