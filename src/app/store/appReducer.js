import {
  buildStats,
  createEmptyDraft,
  createEmptySequence,
  createEmptySong,
  defaultLibraryFilters,
  defaultSongCategories,
} from '../../utils/workspace.js'

export const initialState = {
  platformMode: 'web',
  loading: true,
  startup: {
    visible: true,
    progress: 6,
    detail: 'Preparando aplicacion...',
  },
  workspaceRoot: '',
  recentRoots: [],
  songCategories: defaultSongCategories,
  preferences: {
    locale: 'es-MX',
    compactSidebar: false,
    motionMode: 'normal',
  },
  driveAuthStatus: {
    configured: false,
    connected: false,
    connectedAccountEmail: '',
  },
  syncStatus: {
    configured: false,
    connected: false,
    connectedAccountEmail: '',
    lastSyncedAccountEmail: '',
    needsInitialSyncChoice: false,
    syncing: false,
    lastSyncAt: '',
    lastSyncResult: '',
    pendingConflicts: [],
  },
  updateStatus: {
    configured: false,
    checking: false,
    available: false,
    currentVersion: '',
    latestVersion: '',
    title: '',
    releaseNotes: [],
    pubDate: '',
    downloadUrl: '',
    source: '',
    dismissedVersion: '',
    modalEligible: false,
    promptVisible: false,
    installing: false,
    installProgress: null,
    lastCheckedAt: '',
  },
  songs: [],
  sequences: [],
  drafts: [],
  stats: buildStats([], []),
  libraryFilters: defaultLibraryFilters,
  activeSongId: '',
  activeDraftId: '',
  activeSequenceId: '',
  exportResult: null,
  error: '',
}

export const NEW_SEQUENCE_ID = '__new__'

export function appReducer(state, action) {
  switch (action.type) {
    case 'bootstrap:start':
      return {
        ...state,
        loading: true,
        error: '',
      }
    case 'startup:set':
      return {
        ...state,
        startup: {
          ...state.startup,
          ...action.payload,
        },
      }
    case 'startup:done':
      return {
        ...state,
        startup: {
          ...state.startup,
          visible: false,
          progress: 100,
          detail: 'Listo.',
        },
      }
    case 'bootstrap:success':
      return {
        ...state,
        loading: false,
        error: '',
        workspaceRoot: action.payload.workspaceRoot || state.workspaceRoot,
        recentRoots: action.payload.recentRoots || state.recentRoots,
        preferences: action.payload.preferences || state.preferences,
        updateStatus: {
          ...state.updateStatus,
          dismissedVersion: action.payload.dismissedUpdateVersion || state.updateStatus.dismissedVersion,
        },
        songCategories: action.payload.songCategories || state.songCategories,
        songs: action.payload.songs || [],
        sequences: action.payload.sequences || [],
        drafts: action.payload.drafts || [],
        stats: action.payload.stats || buildStats(action.payload.songs || [], action.payload.sequences || []),
        activeSongId: action.payload.activeSongId || action.payload.songs?.[0]?.id || '',
        activeDraftId: action.payload.activeDraftId || action.payload.drafts?.[0]?.id || '',
        activeSequenceId:
          action.payload.activeSequenceId || action.payload.sequences?.[0]?.id || state.activeSequenceId || '',
      }
    case 'bootstrap:error':
      return {
        ...state,
        loading: false,
        error: action.payload,
      }
    case 'workspace:selected':
      return {
        ...state,
        workspaceRoot: action.payload.workspaceRoot,
        recentRoots: action.payload.recentRoots || state.recentRoots,
      }
    case 'preferences:set':
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ...action.payload,
        },
      }
    case 'songCategories:set':
      return {
        ...state,
        songCategories: action.payload?.length ? action.payload : state.songCategories,
      }
    case 'driveAuth:set':
      return {
        ...state,
        driveAuthStatus: {
          ...state.driveAuthStatus,
          ...action.payload,
        },
      }
    case 'sync:set':
      return {
        ...state,
        syncStatus: {
          ...state.syncStatus,
          ...action.payload,
        },
      }
    case 'update:set':
      return {
        ...state,
        updateStatus: {
          ...state.updateStatus,
          ...action.payload,
        },
      }
    case 'update:progress':
      return {
        ...state,
        updateStatus: {
          ...state.updateStatus,
          installProgress: action.payload,
        },
      }
    case 'library:filters':
      return {
        ...state,
        libraryFilters: {
          ...state.libraryFilters,
          ...action.payload,
        },
      }
    case 'drafts:set':
      return {
        ...state,
        drafts: action.payload,
        activeDraftId: action.payload[0]?.id || '',
      }
    case 'songs:upsert': {
      const song = action.payload.song
      const draftId = action.payload.draftId
      const songs = state.songs.some((item) => item.id === song.id)
        ? state.songs.map((item) => (item.id === song.id ? song : item))
        : [song, ...state.songs]
      const drafts = draftId ? state.drafts.filter((draft) => draft.id !== draftId) : state.drafts

      return {
        ...state,
        songs,
        drafts,
        stats: action.payload.stats || buildStats(songs, state.sequences),
        activeSongId: song.id,
        activeDraftId: drafts[0]?.id || '',
      }
    }
    case 'songs:delete': {
      const songs = state.songs.filter((song) => song.id !== action.payload)
      const sequences = state.sequences.map((sequence) => ({
        ...sequence,
        items: sequence.items.filter((item) => item.songId !== action.payload),
      }))

      return {
        ...state,
        songs,
        sequences,
        stats: buildStats(songs, sequences),
        activeSongId: songs[0]?.id || '',
      }
    }
    case 'sequence:save': {
      const sequence = action.payload.sequence
      const sequences = state.sequences.some((item) => item.id === sequence.id)
        ? state.sequences.map((item) => (item.id === sequence.id ? sequence : item))
        : [sequence, ...state.sequences]

      return {
        ...state,
        sequences,
        stats: action.payload.stats || buildStats(state.songs, sequences),
        activeSequenceId: sequence.id,
      }
    }
    case 'sequence:delete': {
      const sequences = state.sequences.filter((sequence) => sequence.id !== action.payload)
      return {
        ...state,
        sequences,
        stats: buildStats(state.songs, sequences),
        activeSequenceId: sequences[0]?.id || '',
      }
    }
    case 'sequence:active':
      return {
        ...state,
        activeSequenceId: action.payload,
      }
    case 'song:active':
      return {
        ...state,
        activeSongId: action.payload,
      }
    case 'draft:active':
      return {
        ...state,
        activeDraftId: action.payload,
      }
    case 'export:done':
      return {
        ...state,
        exportResult: action.payload,
      }
    case 'export:clear':
      return {
        ...state,
        exportResult: null,
      }
    case 'error:set':
      return {
        ...state,
        error: action.payload,
      }
    default:
      return state
  }
}

export function selectActiveSong(state) {
  return state.songs.find((song) => song.id === state.activeSongId) || state.songs[0] || createEmptySong()
}

export function selectActiveDraft(state) {
  return state.drafts.find((draft) => draft.id === state.activeDraftId) || state.drafts[0] || createEmptyDraft()
}

export function selectActiveSequence(state) {
  if (state.activeSequenceId === NEW_SEQUENCE_ID) {
    return createEmptySequence()
  }

  return (
    state.sequences.find((sequence) => sequence.id === state.activeSequenceId) ||
    state.sequences[0] ||
    createEmptySequence()
  )
}
