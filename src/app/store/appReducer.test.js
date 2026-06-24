import { describe, expect, it } from 'vitest'
import { buildStats, filterSongs, recalcularFechasUsoDeCantos } from '../../utils/workspace.js'

const songs = [
  { id: '1', title: 'Alfa', author: 'Autor', category: 'Himno', tempo: 65, lyrics: '', chords: '', createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-02T00:00:00Z' },
  { id: '2', title: 'Beta', author: 'Equipo', category: 'Adoración', tempo: 96, lyrics: 'Santo', chords: '', createdAt: '2026-03-03T00:00:00Z', updatedAt: '2026-03-04T00:00:00Z' },
]

const sequences = [
  { id: 'seq-1', title: 'Domingo', serviceDate: '2026-03-23', items: [] },
]

describe('workspace utilities', () => {
  it('buildStats resume canciones y secuencias', () => {
    const stats = buildStats(songs, sequences)
    expect(stats.totalSongs).toBe(2)
    expect(stats.totalSequences).toBe(1)
    expect(stats.recentUploads[0].id).toBe('2')
  })

  it('filterSongs aplica búsqueda y categoría', () => {
    const result = filterSongs(songs, {
      search: 'santo',
      category: 'Adoración',
      tempo: 'Cualquiera',
      sortBy: 'alpha',
    })

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('2')
  })

  it('recalcularFechasUsoDeCantos guarda una fecha por canto y secuencia', () => {
    const result = recalcularFechasUsoDeCantos(songs, [
      {
        id: 'seq-1',
        serviceDate: '2026-03-23',
        items: [
          { songId: '1' },
          { songId: '1' },
          { songId: '2' },
        ],
      },
      {
        id: 'seq-2',
        serviceDate: '2026-03-30',
        items: [{ songId: '1' }],
      },
    ])

    expect(result.find((song) => song.id === '1').fechasUso).toEqual(['2026-03-23', '2026-03-30'])
    expect(result.find((song) => song.id === '2').fechasUso).toEqual(['2026-03-23'])
  })
})
