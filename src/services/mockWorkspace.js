import { buildStats } from '../utils/workspace.js'

const CONFIG_KEY = 'creador-secuencias-config'
const DATA_KEY = 'creador-secuencias-data'

const demoSongs = [
  {
    id: 'canto-0001',
    title: 'Amazing Grace',
    author: 'John Newton',
    category: 'Himno',
    key: 'G Major',
    tempo: 68,
    lyrics: '[G]Sublime gracia del Señor\n[C]Que a un infeliz salvó',
    chords: '[G] [C] [G] [D]',
    tags: ['Clásico', 'Gracia'],
    sourceFileName: 'Amazing_Grace.docx',
    sourcePath: '',
    status: 'published',
    playCount: 18,
    createdAt: '2026-03-10T09:00:00.000Z',
    updatedAt: '2026-03-18T10:00:00.000Z',
  },
  {
    id: 'canto-0002',
    title: 'Living Waters',
    author: 'Kristene DiMarco',
    category: 'Adoración',
    key: 'D Major',
    tempo: 74,
    lyrics: 'Espíritu Santo, llena este lugar',
    chords: '[D] [G] [Bm] [A]',
    tags: ['Contemporánea'],
    sourceFileName: 'Living_Waters.docx',
    sourcePath: '',
    status: 'published',
    playCount: 11,
    createdAt: '2026-03-09T09:00:00.000Z',
    updatedAt: '2026-03-17T18:00:00.000Z',
  },
  {
    id: 'canto-0003',
    title: 'Behold the Lamb of God',
    author: "The Porter's Gate",
    category: 'Destacada',
    key: 'A Minor',
    tempo: 64,
    lyrics: 'Cordero santo, digno eres tú',
    chords: '[Am] [F] [C] [G]',
    tags: ['Nuevo'],
    sourceFileName: 'Behold_The_Lamb.docx',
    sourcePath: '',
    status: 'published',
    playCount: 5,
    createdAt: '2026-03-16T09:00:00.000Z',
    updatedAt: '2026-03-18T08:00:00.000Z',
  },
  {
    id: 'canto-0004',
    title: 'Resucitando',
    author: 'Elevation Worship',
    category: 'Contemporánea',
    key: 'Db Major',
    tempo: 73,
    lyrics: 'Tu nombre venció la muerte',
    chords: '[Db] [Gb] [Bbm] [Ab]',
    tags: ['Pascua'],
    sourceFileName: 'Resucitando.docx',
    sourcePath: '',
    status: 'published',
    playCount: 15,
    createdAt: '2026-03-05T09:00:00.000Z',
    updatedAt: '2026-03-14T08:00:00.000Z',
  },
  {
    id: 'canto-0005',
    title: 'It Is Well',
    author: 'Horatio Spafford',
    category: 'Himno',
    key: 'C Major',
    tempo: 64,
    lyrics: 'Cuando la paz, como un río, me acompañe',
    chords: '[C] [F] [C] [G]',
    tags: ['Consuelo'],
    sourceFileName: 'It_Is_Well.docx',
    sourcePath: '',
    status: 'published',
    playCount: 8,
    createdAt: '2026-03-03T09:00:00.000Z',
    updatedAt: '2026-03-10T08:00:00.000Z',
  },
  {
    id: 'canto-0006',
    title: 'Gratitud',
    author: 'Brandon Lake',
    category: 'Adoración',
    key: 'B Major',
    tempo: 78,
    lyrics: 'Vengo hoy con manos abiertas',
    chords: '[B] [F#] [G#m] [E]',
    tags: ['Oración'],
    sourceFileName: 'Gratitud.docx',
    sourcePath: '',
    status: 'published',
    playCount: 6,
    createdAt: '2026-03-12T09:00:00.000Z',
    updatedAt: '2026-03-19T08:00:00.000Z',
  },
]

const demoSequence = {
  id: 'secuencia-0001',
  title: 'Adoración Matutina',
  serviceDate: '2026-03-23',
  notes: 'Abrir con lectura congregacional y transiciones suaves.',
  items: [
    { id: 'item-1', songId: 'canto-0001', order: 1, transitionType: 'Entrada suave' },
    { id: 'item-2', songId: 'canto-0002', order: 2, transitionType: 'Crossfade' },
    { id: 'item-3', songId: 'canto-0006', order: 3, transitionType: 'Vamp instrumental' },
  ],
  createdAt: '2026-03-18T12:00:00.000Z',
  updatedAt: '2026-03-19T08:45:00.000Z',
}

function nowIso() {
  return new Date().toISOString()
}

function normalizeTitle(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function readConfig() {
  const raw = localStorage.getItem(CONFIG_KEY)
  if (!raw) {
    return {
      workspaceRoot: '',
      recentRoots: [],
      locale: 'es-MX',
      preferences: {
        compactSidebar: false,
      },
    }
  }

  return JSON.parse(raw)
}

function writeConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  return config
}

function defaultData() {
  return {
    songs: demoSongs,
    sequences: [demoSequence],
    drafts: [],
    appState: {
      nextSongId: 7,
      nextSequenceId: 2,
    },
  }
}

function readData() {
  const raw = localStorage.getItem(DATA_KEY)
  if (!raw) {
    const data = defaultData()
    localStorage.setItem(DATA_KEY, JSON.stringify(data))
    return data
  }

  return JSON.parse(raw)
}

function writeData(data) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data))
  return data
}

function uniqueRoot(root, recentRoots) {
  return [root, ...recentRoots.filter((item) => item !== root)].slice(0, 5)
}

export async function getWorkspaceConfig() {
  return readConfig()
}

export async function selectWorkspaceRoot() {
  const workspaceRoot = 'Google Drive/Ministerio Musical'
  const config = readConfig()

  writeConfig({
    ...config,
    workspaceRoot,
    recentRoots: uniqueRoot(workspaceRoot, config.recentRoots),
  })

  readData()

  return {
    workspaceRoot,
    createdStructure: ['biblioteca', 'secuencias', 'recursos', '.ccp', 'exports'],
  }
}

export async function bootstrapApp(workspaceRoot) {
  const config = readConfig()
  const root = workspaceRoot || config.workspaceRoot
  const data = readData()

  return {
    songs: data.songs,
    sequences: data.sequences,
    drafts: data.drafts,
    stats: buildStats(data.songs, data.sequences),
    workspaceRoot: root,
  }
}

export async function openSongFiles() {
  return { drafts: [] }
}

export async function importSongDocxBatch() {
  return {
    documents: [
      {
        sourceFileName: 'secuencia-demo.docx',
        sourcePath: 'demo/secuencia-demo.docx',
        warnings: [],
        candidates: [
          {
            candidateId: 'candidate-demo-1',
            sourceFileName: 'secuencia-demo.docx',
            sourcePath: 'demo/secuencia-demo.docx',
            order: 1,
            titleDetected: 'Dios Poderoso',
            titleNormalized: normalizeTitle('Dios Poderoso'),
            authorDetected: '',
            keyDetected: 'Bb',
            lyrics: 'VERSO 1\n¿Quién sino el Señor las estrellas creó?\nY su luz limitó?',
            chords: 'VERSO 1\nGm                          Bb',
            contentDraft: {
              version: 1,
              sections: [
                {
                  id: 'section-temp-1',
                  sectionType: 'verse',
                  label: 'VERSO 1',
                  lines: [
                    {
                      id: 'line-temp-1',
                      kind: 'lyric',
                      text: '¿Quién sino el Señor las estrellas creó?',
                      chords: [
                        { symbol: 'Gm', offset: 0 },
                        { symbol: 'Bb', offset: 29 },
                      ],
                    },
                  ],
                },
              ],
            },
            matchedSongId: 'canto-0004',
            matchedSongTitle: 'Resucitando',
            matchType: '',
            confidence: 0.72,
            warnings: [],
          },
          {
            candidateId: 'candidate-demo-2',
            sourceFileName: 'secuencia-demo.docx',
            sourcePath: 'demo/secuencia-demo.docx',
            order: 2,
            titleDetected: 'Invencible',
            titleNormalized: normalizeTitle('Invencible'),
            authorDetected: '',
            keyDetected: 'Dm',
            lyrics: 'CORO\nInvencible, Él ha resucitado',
            chords: 'CORO\nDm      Bb   C',
            contentDraft: {
              version: 1,
              sections: [
                {
                  id: 'section-temp-1',
                  sectionType: 'chorus',
                  label: 'CORO',
                  lines: [
                    {
                      id: 'line-temp-1',
                      kind: 'lyric',
                      text: 'Invencible, Él ha resucitado',
                      chords: [
                        { symbol: 'Dm', offset: 0 },
                        { symbol: 'Bb', offset: 8 },
                        { symbol: 'C', offset: 13 },
                      ],
                    },
                  ],
                },
              ],
            },
            matchedSongId: '',
            matchedSongTitle: '',
            matchType: '',
            confidence: 0.81,
            warnings: [],
          },
        ],
      },
    ],
  }
}

export async function saveSong(payload) {
  const data = readData()
  const timestamp = nowIso()
  const isNewSong = !payload.id
  const songId = payload.id || `canto-${String(data.appState.nextSongId).padStart(4, '0')}`

  const song = {
    playCount: 0,
    ...payload,
    id: songId,
    titleNormalized: normalizeTitle(payload.title),
    status: 'published',
    createdAt: payload.createdAt || timestamp,
    updatedAt: timestamp,
  }

  if (isNewSong) {
    data.appState.nextSongId += 1
  }

  const existingIndex = data.songs.findIndex((item) => item.id === song.id)
  if (existingIndex >= 0) {
    data.songs[existingIndex] = song
  } else {
    data.songs.unshift(song)
  }

  writeData(data)

  return {
    song,
    stats: buildStats(data.songs, data.sequences),
  }
}

export async function updateSong(payload) {
  return saveSong(payload)
}

export async function saveSequence(payload) {
  const data = readData()
  const timestamp = nowIso()
  const isNewSequence = !payload.id

  const sequence = {
    ...payload,
    id: payload.id || `secuencia-${String(data.appState.nextSequenceId).padStart(4, '0')}`,
    createdAt: payload.createdAt || timestamp,
    updatedAt: timestamp,
    items: (payload.items || []).map((item, index) => ({
      transitionType: 'Transición libre',
      ...item,
      order: index + 1,
    })),
  }

  if (isNewSequence) {
    data.appState.nextSequenceId += 1
  }

  const existingIndex = data.sequences.findIndex((item) => item.id === sequence.id)
  if (existingIndex >= 0) {
    data.sequences[existingIndex] = sequence
  } else {
    data.sequences.unshift(sequence)
  }

  writeData(data)

  return {
    sequence,
    stats: buildStats(data.songs, data.sequences),
  }
}

export async function deleteSequence(sequenceId) {
  const data = readData()
  data.sequences = data.sequences.filter((sequence) => sequence.id !== sequenceId)
  writeData(data)
  return { ok: true }
}

export async function deleteSong(songId) {
  const data = readData()
  data.songs = data.songs.filter((song) => song.id !== songId)
  data.sequences = data.sequences.map((sequence) => ({
    ...sequence,
    items: sequence.items.filter((item) => item.songId !== songId),
  }))
  writeData(data)
  return { ok: true }
}

export async function exportSequenceDocx(sequenceId) {
  const data = readData()
  const sequence = data.sequences.find((item) => item.id === sequenceId)
  const fileName = `${(sequence?.title || 'secuencia').replace(/\s+/g, '_')}.docx`

  return {
    filePath: `exports/${fileName}`,
    fileName,
    exportedAt: nowIso(),
  }
}

export async function openExportsFolder() {
  return { ok: true }
}
