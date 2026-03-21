/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useReducer } from 'react'
import service from '../../services/workspaceService.js'
import { isTauriRuntime } from '../../utils/platform.js'
import { filterSongs } from '../../utils/workspace.js'
import { appReducer, initialState, selectActiveDraft, selectActiveSequence, selectActiveSong } from './appReducer.js'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, {
    ...initialState,
    platformMode: isTauriRuntime() ? 'tauri' : 'web',
  })

  useEffect(() => {
    async function initialize() {
      dispatch({ type: 'bootstrap:start' })

      try {
        const config = await service.getWorkspaceConfig()
        dispatch({ type: 'workspace:selected', payload: config })

        if (!config.workspaceRoot) {
          dispatch({
            type: 'bootstrap:success',
            payload: {
              songs: [],
              sequences: [],
              drafts: [],
              stats: { totalSongs: 0, totalSequences: 0, recentUploads: [], upcomingSequences: [] },
              recentRoots: config.recentRoots,
              preferences: config.preferences,
              workspaceRoot: '',
            },
          })
          return
        }

        const bootstrap = await service.bootstrapApp(config.workspaceRoot)
        dispatch({
          type: 'bootstrap:success',
          payload: {
            ...bootstrap,
            workspaceRoot: config.workspaceRoot,
            recentRoots: config.recentRoots,
            preferences: config.preferences,
          },
        })
      } catch (error) {
        dispatch({
          type: 'bootstrap:error',
          payload: error.message || 'No fue posible iniciar la aplicación.',
        })
      }
    }

    initialize()
  }, [])

  async function chooseWorkspace() {
    const result = await service.selectWorkspaceRoot()
    const config = await service.getWorkspaceConfig()
    dispatch({
      type: 'workspace:selected',
      payload: {
        workspaceRoot: result.workspaceRoot,
        recentRoots: config.recentRoots,
        notice: 'Carpeta de trabajo configurada.',
      },
    })

    const bootstrap = await service.bootstrapApp(result.workspaceRoot)
    dispatch({
      type: 'bootstrap:success',
      payload: {
        ...bootstrap,
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
        stats: result.stats,
      },
    })
  }

  async function deleteSequence(sequenceId) {
    await service.deleteSequence(sequenceId)
    dispatch({ type: 'sequence:delete', payload: sequenceId })
  }

  async function deleteSong(songId) {
    await service.deleteSong(songId)
    dispatch({ type: 'songs:delete', payload: songId })
  }

  async function exportSequence(sequenceId) {
    const result = await service.exportSequenceDocx(sequenceId)
    dispatch({ type: 'export:done', payload: result })
  }

  async function openExportsFolder() {
    await service.openExportsFolder()
  }

  const value = {
    state,
    filteredSongs: filterSongs(state.songs, state.libraryFilters),
    activeSong: selectActiveSong(state),
    activeDraft: selectActiveDraft(state),
    activeSequence: selectActiveSequence(state),
    actions: {
      chooseWorkspace,
      importSongFiles,
      importSongDocxBatch,
      saveSong,
      updateSong,
      saveSequence,
      deleteSequence,
      deleteSong,
      exportSequence,
      openExportsFolder,
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
      clearNotice() {
        dispatch({ type: 'notice:set', payload: '' })
      },
      clearError() {
        dispatch({ type: 'error:set', payload: '' })
      },
    },
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext debe usarse dentro de AppProvider.')
  }
  return context
}
