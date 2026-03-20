import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { GripVertical, Trash2 } from 'lucide-react'

function SequenceItemCard({ item, song, index, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className="rounded-[24px] bg-white p-5 editorial-shadow"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            type="button"
            className="mt-1 rounded-xl bg-[var(--surface-container-low)] p-2 text-[var(--outline)]"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={16} />
          </button>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white">
                {index}
              </span>
              <h4 className="font-headline text-2xl font-extrabold text-[var(--primary)]">{song?.title || 'Canción no encontrada'}</h4>
            </div>
            <p className="text-sm text-[var(--on-surface-variant)]">
              {song?.author || 'Autor pendiente'} · {song?.key || 'Sin tonalidad'} · {song?.tempo || '--'} BPM
            </p>
            <span className="inline-flex rounded-full bg-[var(--secondary-container)] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]">
              {item.transitionType || 'Transición libre'}
            </span>
          </div>
        </div>
        <button
          className="rounded-full p-2 text-[var(--outline)] transition hover:bg-[rgba(0,36,70,0.06)] hover:text-[var(--error)]"
          onClick={() => onRemove(item.id)}
          type="button"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  )
}

export default SequenceItemCard
