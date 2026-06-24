import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { formatDisplayDate, summarizeTempo } from '../../utils/formatters.js'

function SongCard({ song, selected, onSelect, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const fechasUso = Array.isArray(song.fechasUso) ? song.fechasUso : []
  const ultimaFechaUso = fechasUso.length ? formatDisplayDate(fechasUso[fechasUso.length - 1]) : ''

  useEffect(() => {
    if (!menuOpen) {
      return undefined
    }

    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [menuOpen])

  return (
    <button
      className={[
        'motion-card group relative rounded-[24px] bg-[var(--surface-container-lowest)] p-6 text-left editorial-shadow transition hover:-translate-y-1',
        selected ? 'cta-gradient text-white' : '',
      ].join(' ')}
      onClick={onSelect}
      onDoubleClick={onEdit}
      type="button"
    >
      <span
        className={[
          'absolute inset-y-6 left-0 w-1 rounded-full',
          selected ? 'bg-[rgba(255,255,255,0.65)]' : 'bg-[var(--primary-fixed-dim)]',
        ].join(' ')}
      />

      <div className="ml-3 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <span
              className={[
                'inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]',
                selected ? 'bg-white/15 text-white' : 'bg-[rgba(240,189,127,0.35)] text-[var(--primary)]',
              ].join(' ')}
            >
              {song.category}
            </span>

            <div>
              <h3 className="font-headline text-3xl font-extrabold leading-tight">{song.title}</h3>
              <p className={selected ? 'text-white/80' : 'text-[var(--on-surface-variant)]'}>
                {song.author || 'Autor sin registrar'}
              </p>
            </div>
          </div>

          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              aria-label={`Opciones de ${song.title}`}
              className={[
                'rounded-full p-2 transition',
                selected ? 'text-white/80 hover:bg-white/10' : 'text-[var(--outline)] hover:bg-[var(--hover-surface)]',
              ].join(' ')}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setMenuOpen((current) => !current)
              }}
            >
              <MoreVertical size={18} />
            </button>

            {menuOpen ? (
              <div
                className="absolute right-0 top-11 z-20 min-w-[190px] rounded-2xl border border-[var(--glass-border)] bg-[var(--surface-container-lowest)] p-2 text-[var(--on-surface)] shadow-[var(--card-shadow)]"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                }}
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--hover-surface)]"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setMenuOpen(false)
                    onEdit()
                  }}
                >
                  <Pencil size={16} />
                  Editar canto
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[var(--error)] transition hover:bg-[rgba(186,26,26,0.08)]"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setMenuOpen(false)
                    onDelete(song.id)
                  }}
                >
                  <Trash2 size={16} />
                  Eliminar canto
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-60">Tonalidad</p>
            <p className="mt-1 font-semibold">{song.key || 'Sin definir'}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-60">Tempo</p>
            <p className="mt-1 font-semibold">
              {song.tempo} BPM
              <span className="block text-xs opacity-70">{summarizeTempo(song.tempo)}</span>
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-60">Estado</p>
            <p className="mt-1 font-semibold">{song.status === 'published' ? 'En biblioteca' : 'Borrador'}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-60">Uso</p>
            <p className="mt-1 font-semibold">
              {fechasUso.length ? `${fechasUso.length} ${fechasUso.length === 1 ? 'vez' : 'veces'}` : 'Sin uso'}
              {ultimaFechaUso ? <span className="block text-xs opacity-70">{ultimaFechaUso}</span> : null}
            </p>
          </div>
        </div>
      </div>
    </button>
  )
}

export default SongCard
