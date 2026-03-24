import { buildStats } from '../utils/workspace.js'
import { defaultSongCategories } from '../utils/workspace.js'

const CONFIG_KEY = 'creador-secuencias-config'
const DATA_KEY = 'creador-secuencias-data'
const MANAGED_WORKSPACE_ROOT = 'AppData/Centro Cristiano Palmas/workspace'
const UPDATE_KEY = 'creador-secuencias-update'

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
    category: 'Adoracion',
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
    category: 'Contemporanea',
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
    category: 'Adoracion',
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
      workspaceRoot: MANAGED_WORKSPACE_ROOT,
      recentRoots: [MANAGED_WORKSPACE_ROOT],
      locale: 'es-MX',
      dismissedUpdateVersion: '',
      preferences: {
        compactSidebar: false,
        motionMode: 'normal',
        themeMode: 'light',
      },
    }
  }

  const parsed = JSON.parse(raw)
  return {
    ...parsed,
    workspaceRoot: parsed.workspaceRoot || MANAGED_WORKSPACE_ROOT,
    recentRoots:
      parsed.workspaceRoot || (parsed.recentRoots || []).length
        ? [parsed.workspaceRoot || MANAGED_WORKSPACE_ROOT, ...(parsed.recentRoots || []).filter((item) => item !== (parsed.workspaceRoot || MANAGED_WORKSPACE_ROOT))].slice(0, 5)
        : [MANAGED_WORKSPACE_ROOT],
    dismissedUpdateVersion: parsed.dismissedUpdateVersion || '',
    preferences: {
      compactSidebar: false,
      motionMode: 'normal',
      themeMode: 'light',
      ...(parsed.preferences || {}),
    },
  }
}

function writeConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  return config
}

function defaultData() {
  return {
    songs: demoSongs,
    sequences: [demoSequence],
    songCategories: defaultSongCategories,
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

export async function getSupportConfig() {
  return {
    configured: true,
    recipientEmail: 'ccp.centromusical.soporte@gmail.com',
    allowedExtensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'pdf', 'docx'],
    maxAttachments: 5,
    maxTotalBytes: 20 * 1024 * 1024,
  }
}

export async function getSongCategories() {
  return readData().songCategories || defaultSongCategories
}

export async function saveSongCategories(categories) {
  const data = readData()
  const nextCategories = categories
    .map((category) => String(category || '').trim())
    .filter(Boolean)
    .filter((category, index, collection) => collection.indexOf(category) === index)

  data.songCategories = nextCategories.length ? nextCategories : defaultSongCategories
  writeData(data)
  return data.songCategories
}

export async function saveMotionMode(motionMode) {
  const config = readConfig()
  const normalized = ['normal', 'reduced', 'off'].includes(motionMode) ? motionMode : 'normal'
  const preferences = {
    ...config.preferences,
    motionMode: normalized,
  }

  writeConfig({
    ...config,
    preferences,
  })

  return preferences
}

export async function saveThemeMode(themeMode) {
  const config = readConfig()
  const normalized = ['light', 'dark', 'retro'].includes(themeMode) ? themeMode : 'light'
  const preferences = {
    ...config.preferences,
    themeMode: normalized,
  }

  writeConfig({
    ...config,
    preferences,
  })

  return preferences
}

export async function selectWorkspaceRoot() {
  const workspaceRoot = MANAGED_WORKSPACE_ROOT
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
    songCategories: data.songCategories || defaultSongCategories,
    drafts: data.drafts,
    stats: buildStats(data.songs, data.sequences),
    workspaceRoot: root,
  }
}

export async function getDriveAuthStatus() {
  const raw = JSON.parse(localStorage.getItem(`${DATA_KEY}-drive-auth`) || 'null')
  return raw || {
    configured: true,
    connected: false,
    connectedAccountEmail: '',
  }
}

export async function connectGoogleDrive() {
  const next = {
    configured: true,
    connected: true,
    connectedAccountEmail: 'demo@ejemplo.com',
  }
  localStorage.setItem(`${DATA_KEY}-drive-auth`, JSON.stringify(next))
  return next
}

export async function disconnectGoogleDrive() {
  const next = {
    configured: true,
    connected: false,
    connectedAccountEmail: '',
  }
  localStorage.setItem(`${DATA_KEY}-drive-auth`, JSON.stringify(next))
  return next
}

export async function getSyncStatus() {
  const auth = await getDriveAuthStatus()
  const lastSyncAt = localStorage.getItem(`${DATA_KEY}-last-sync-at`) || ''
  const connectedAccountEmail = auth.connectedAccountEmail || ''
  return {
    configured: auth.configured,
    connected: auth.connected,
    connectedAccountEmail,
    lastSyncedAccountEmail: localStorage.getItem(`${DATA_KEY}-last-sync-account`) || '',
    needsInitialSyncChoice: Boolean(auth.connected && connectedAccountEmail && !lastSyncAt),
    syncing: false,
    lastSyncAt,
    lastSyncResult: localStorage.getItem(`${DATA_KEY}-last-sync-result`) || '',
    pendingConflicts: JSON.parse(localStorage.getItem(`${DATA_KEY}-sync-conflicts`) || '[]'),
  }
}

function readMockUpdateState() {
  const raw = localStorage.getItem(UPDATE_KEY)
  if (!raw) {
    return {
      configured: false,
      available: false,
      currentVersion: '0.1.0',
      latestVersion: '',
      title: '',
      releaseNotes: [],
      pubDate: '',
      downloadUrl: '',
      source: '',
    }
  }

  return JSON.parse(raw)
}

function writeMockUpdateState(next) {
  localStorage.setItem(UPDATE_KEY, JSON.stringify(next))
  return next
}

export async function getAppVersion() {
  return '0.1.0'
}

export async function getUpdateNoticeManifest() {
  return null
}

export async function checkAppUpdate() {
  const config = readConfig()
  const current = readMockUpdateState()
  return {
    ...current,
    dismissedVersion: config.dismissedUpdateVersion || '',
  }
}

export async function dismissAppUpdate(version) {
  const config = readConfig()
  writeConfig({
    ...config,
    dismissedUpdateVersion: version,
  })
  return { ok: true }
}

export async function installAppUpdate() {
  const current = readMockUpdateState()
  if (!current.available) {
    throw new Error('No hay una actualización disponible para instalar.')
  }

  writeMockUpdateState({
    ...current,
    available: false,
  })

  return { ok: true }
}

export async function syncWorkspaceNow(reason = 'manual', mode = 'merge') {
  void reason
  const auth = await getDriveAuthStatus()
  const lastSyncAt = localStorage.getItem(`${DATA_KEY}-last-sync-at`) || ''
  if (auth.connected && auth.connectedAccountEmail && !lastSyncAt && mode === 'merge') {
    throw new Error(
      'Esta cuenta aún no tiene dirección inicial de sincronización. Elige si quieres subir lo local o bajar lo que ya existe en Drive.',
    )
  }

  const now = nowIso()
  localStorage.setItem(`${DATA_KEY}-last-sync-at`, now)
  localStorage.setItem(
    `${DATA_KEY}-last-sync-result`,
    mode === 'push' ? 'ok (local -> drive)' : mode === 'pull' ? 'ok (drive -> local)' : 'ok',
  )
  localStorage.setItem(`${DATA_KEY}-last-sync-account`, auth.connectedAccountEmail || '')
  localStorage.setItem(`${DATA_KEY}-sync-conflicts`, '[]')
  return {
    appliedDownloads: 0,
    appliedUploads: 0,
    detectedConflicts: 0,
    lastSyncAt: now,
    lastSyncResult: 'ok',
    pendingConflicts: [],
  }
}

export async function resolveSyncConflict() {
  return syncWorkspaceNow()
}

export async function exitApplication() {
  return { ok: true }
}

export async function minimizeMainWindow() {
  return { ok: true }
}

export async function toggleMaximizeMainWindow() {
  return { ok: true }
}

export async function closeMainWindow() {
  return { ok: true }
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
    chords: '',
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
  const removedSequence = data.sequences.find((sequence) => sequence.id === sequenceId)
  data.sequences = data.sequences.filter((sequence) => sequence.id !== sequenceId)
  writeData(data)

  if (removedSequence) {
    const exportKey = `${DATA_KEY}-exports`
    const fileName = `${(removedSequence.title || 'secuencia').replace(/\s+/g, '_')}.docx`
    const existing = JSON.parse(localStorage.getItem(exportKey) || '[]')
    localStorage.setItem(exportKey, JSON.stringify(existing.filter((item) => item !== fileName)))
  }

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

export async function checkSequenceExportDocx(sequenceId) {
  const data = readData()
  const sequence = data.sequences.find((item) => item.id === sequenceId)
  const fileName = `${(sequence?.title || 'secuencia').replace(/\s+/g, '_')}.docx`
  const existing = JSON.parse(localStorage.getItem(`${DATA_KEY}-exports`) || '[]')

  return {
    exists: existing.includes(fileName),
    filePath: `exports/${fileName}`,
    fileName,
  }
}

export async function getSequenceExportStatuses() {
  const data = readData()
  const existing = JSON.parse(localStorage.getItem(`${DATA_KEY}-exports`) || '[]')

  return data.sequences.map((sequence) => {
    const fileName = `${(sequence?.title || 'secuencia').replace(/\s+/g, '_')}.docx`
    return {
      sequenceId: sequence.id,
      exists: existing.includes(fileName),
      filePath: `exports/${fileName}`,
      fileName,
    }
  })
}

export async function openExportedSequenceDocx(sequenceId) {
  const check = await checkSequenceExportDocx(sequenceId)
  if (!check.exists) {
    throw new Error('Todavia no existe un documento exportado para esta secuencia.')
  }
  return { ok: true }
}

export async function exportSequenceDocx(sequenceId, overwrite = false) {
  const data = readData()
  const sequence = data.sequences.find((item) => item.id === sequenceId)
  const fileName = `${(sequence?.title || 'secuencia').replace(/\s+/g, '_')}.docx`
  const exportKey = `${DATA_KEY}-exports`
  const existing = JSON.parse(localStorage.getItem(exportKey) || '[]')
  const alreadyExists = existing.includes(fileName)

  if (alreadyExists && !overwrite) {
    throw new Error('El archivo de exportacion ya existe.')
  }

  if (!alreadyExists) {
    localStorage.setItem(exportKey, JSON.stringify([...existing, fileName]))
  }

  return {
    filePath: `exports/${fileName}`,
    fileName,
    exportedAt: nowIso(),
    overwritten: alreadyExists,
  }
}

export async function openExportsFolder() {
  return { ok: true }
}

export async function sendSupportRequest() {
  return {
    ok: true,
    messageId: `mock-support-${Date.now()}`,
  }
}
