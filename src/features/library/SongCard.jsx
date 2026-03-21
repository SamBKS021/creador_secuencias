import { MoreVertical, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { summarizeTempo } from '../../utils/formatters.js'

function SongCard({ song, selected, onSelect, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

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
        'group relative rounded-[24px] bg-[var(--surface-container-lowest)] p-6 text-left editorial-shadow transition hover:-translate-y-1',
        selected ? 'cta-gradient text-white' : '',
      ].join(' ')}
      onClick={onSelect}
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
              <p className={selected ? 'text-white/80' : 'text-[var(--on-surface-variant)]'}>{song.author || 'Autor pendiente'}</p>
            </div>
          </div>

          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              aria-label={`Opciones de ${song.title}`}
              className={[
                'rounded-full p-2 transition',
                selected ? 'text-white/80 hover:bg-white/10' : 'text-slate-400 hover:bg-[rgba(0,36,70,0.06)]',
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
                className="absolute right-0 top-11 z-20 min-w-[190px] rounded-2xl border border-[rgba(67,71,78,0.14)] bg-white p-2 text-[var(--on-surface)] shadow-[0_18px_36px_-20px_rgba(0,24,49,0.45)]"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                }}
              >
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
                  Eliminar canción
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
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
        </div>
      </div>
    </button>
  )
}

export default SongCard
