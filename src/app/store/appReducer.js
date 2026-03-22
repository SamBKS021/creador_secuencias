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
  workspaceRoot: '',
  recentRoots: [],
  preferences: {
    locale: 'es-MX',
    compactSidebar: false,
    songCategories: defaultSongCategories,
    motionMode: 'normal',
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
    case 'bootstrap:success':
      return {
        ...state,
        loading: false,
        error: '',
        workspaceRoot: action.payload.workspaceRoot || state.workspaceRoot,
        recentRoots: action.payload.recentRoots || state.recentRoots,
        preferences: action.payload.preferences || state.preferences,
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
