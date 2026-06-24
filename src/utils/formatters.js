export function formatDisplayDate(value) {
  if (!value) return 'Sin fecha'

  const dateOnlyMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const date = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatRelativeDate(value) {
  if (!value) return 'Sin actividad'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const diff = date.getTime() - Date.now()
  const days = Math.round(diff / 86400000)

  if (days === 0) return 'Hoy'
  if (days === 1) return 'Mañana'
  if (days === -1) return 'Ayer'

  return `${Math.abs(days)} ${Math.abs(days) === 1 ? 'día' : 'días'} ${days > 0 ? 'restantes' : 'atrás'}`
}

export function summarizeTempo(tempo) {
  if (!tempo) return 'Sin tempo'
  if (tempo < 70) return 'Lento'
  if (tempo <= 110) return 'Medio'
  return 'Rápido'
}

export function fileNameFromPath(pathValue) {
  if (!pathValue) return ''
  return pathValue.split(/[\\/]/).pop()
}
