import { MoreVertical } from 'lucide-react'
import { summarizeTempo } from '../../utils/formatters.js'

function SongCard({ song, selected, onSelect }) {
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
          <MoreVertical size={18} className={selected ? 'text-white/80' : 'text-slate-400'} />
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
