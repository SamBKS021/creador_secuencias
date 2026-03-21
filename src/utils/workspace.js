const DEFAULT_FILTERS = {
  search: '',
  category: 'Todas',
  tempo: 'Cualquiera',
  sortBy: 'date-desc',
}

export function buildStats(songs, sequences) {
  const recentUploads = [...songs]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
    .slice(0, 3)

  const upcomingSequences = [...sequences]
    .sort((a, b) => String(a.serviceDate || '').localeCompare(String(b.serviceDate || '')))
    .slice(0, 3)

  return {
    totalSongs: songs.length,
    totalSequences: sequences.length,
    recentUploads,
    upcomingSequences,
  }
}

export function filterSongs(songs, filters) {
  const normalized = {
    ...DEFAULT_FILTERS,
    ...filters,
  }
  const search = normalized.search.trim().toLowerCase()

  let collection = songs.filter((song) => {
    const matchesSearch =
      !search ||
      [song.title, song.author, song.lyrics]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search)

    const matchesCategory = normalized.category === 'Todas' || song.category === normalized.category

    const matchesTempo =
      normalized.tempo === 'Cualquiera' ||
      (normalized.tempo === 'Lento' && Number(song.tempo) < 70) ||
      (normalized.tempo === 'Medio' && Number(song.tempo) >= 70 && Number(song.tempo) <= 110) ||
      (normalized.tempo === 'Rápido' && Number(song.tempo) > 110)

    return matchesSearch && matchesCategory && matchesTempo
  })

  collection = collection.sort((left, right) => {
    switch (normalized.sortBy) {
      case 'alpha':
        return left.title.localeCompare(right.title)
      case 'plays':
        return Number(right.playCount || 0) - Number(left.playCount || 0)
      case 'key':
        return String(left.key || '').localeCompare(String(right.key || ''))
      case 'date-asc':
        return new Date(left.createdAt || 0) - new Date(right.createdAt || 0)
      case 'date-desc':
      default:
        return new Date(right.createdAt || 0) - new Date(left.createdAt || 0)
    }
  })

  return collection
}

export function createEmptySong(overrides = {}) {
  return {
    id: '',
    title: '',
    titleNormalized: '',
    author: '',
    category: 'Contemporánea',
    key: 'C Major',
    tempo: 72,
    lyrics: '',
    chords: '',
    tags: [],
    sourceFileName: '',
    sourcePath: '',
    status: 'published',
    playCount: 0,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

export function createEmptySequence(overrides = {}) {
  return {
    id: '',
    title: 'Nuevo orden de servicio',
    serviceDate: new Date().toISOString().slice(0, 10),
    notes: '',
    items: [],
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

export function createEmptyDraft(overrides = {}) {
  return {
    id: '',
    sourceFileName: '',
    sourcePath: '',
    suggestedTitle: '',
    formData: createEmptySong(),
    createdAt: '',
    ...overrides,
  }
}

export function generateSequenceMetrics(sequence, songs) {
  const linkedSongs = sequence.items
    .map((item) => songs.find((song) => song.id === item.songId))
    .filter(Boolean)

  const totalSongs = linkedSongs.length
  const uniqueKeys = new Set(linkedSongs.map((song) => String(song.key || '').trim()).filter(Boolean)).size
  const uniqueAuthors = new Set(linkedSongs.map((song) => String(song.author || '').trim()).filter(Boolean)).size

  return {
    totalSongs,
    estimatedDuration: `${Math.max(totalSongs * 4, 0)}:00`,
    uniqueKeys,
    uniqueAuthors,
  }
}

export const defaultLibraryFilters = DEFAULT_FILTERS
