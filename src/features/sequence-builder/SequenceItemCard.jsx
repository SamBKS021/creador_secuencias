import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, GripVertical, Trash2 } from "lucide-react";

function SequenceItemCard({ item, song, index, motionDelay = 0, onRemove, onMove, canMoveUp, canMoveDown }) {
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        "--motion-delay": `${motionDelay}ms`,
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 24 : "auto",
        opacity: isDragging ? 0.92 : 1,
      }}
      className={[
        isDragging ? "relative" : "motion-list-item relative",
        "rounded-[20px] bg-[var(--surface-container-lowest)] px-4 py-4 editorial-shadow",
        isDragging
          ? "scale-[1.02] shadow-[0_32px_64px_-26px_var(--shadow-color)] ring-2 ring-[color:var(--primary)]"
          : "",
      ].join(" ")}
    >
      {isDragging ? (
        <div className="pointer-events-none absolute inset-0 rounded-[20px] border-2 border-dashed border-[color:var(--primary)] bg-[color:var(--hover-surface)]/80" />
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              className="rounded-lg p-1 text-[var(--outline)] transition hover:bg-[var(--surface-container-low)] disabled:cursor-not-allowed disabled:opacity-35"
              onClick={() => onMove(item.id, "up")}
              disabled={!canMoveUp}
              aria-label="Mover arriba"
            >
              <ChevronUp size={14} />
            </button>
            <button
              type="button"
              ref={setActivatorNodeRef}
              className={[
                "touch-none rounded-xl bg-[var(--surface-container-low)] p-2 text-[var(--outline)]",
                "cursor-grab select-none transition active:cursor-grabbing",
                isDragging
                  ? "bg-[var(--secondary-container)] text-[var(--primary)] shadow-[inset_0_0_0_1px_var(--primary)]"
                  : "hover:bg-[var(--secondary-container)] hover:text-[var(--primary)]",
              ].join(" ")}
              aria-label="Reordenar"
              {...attributes}
              {...listeners}
            >
              <GripVertical size={15} />
            </button>
            <button
              type="button"
              className="rounded-lg p-1 text-[var(--outline)] transition hover:bg-[var(--surface-container-low)] disabled:cursor-not-allowed disabled:opacity-35"
              onClick={() => onMove(item.id, "down")}
              disabled={!canMoveDown}
              aria-label="Mover abajo"
            >
              <ChevronDown size={14} />
            </button>
          </div>

          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-white">
                {index}
              </span>
              <h4 className="font-headline line-clamp-2 text-xl font-extrabold leading-tight text-[var(--primary)]">
                {song?.title || "Canción no encontrada"}
              </h4>
            </div>

            <p className="line-clamp-1 text-sm text-[var(--on-surface-variant)]">
              {[song?.author || "Autor sin registrar", song?.key || "Sin tonalidad", `${song?.tempo || "--"} BPM`].join(" · ")}
            </p>

            <span className="inline-flex rounded-full bg-[var(--secondary-container)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--primary)]">
              {item.transitionType || "Transición libre"}
            </span>
          </div>
        </div>

        <button
          className="rounded-full p-2 text-[var(--outline)] transition hover:bg-[var(--hover-surface)] hover:text-[var(--error)]"
          onClick={() => onRemove(item.id)}
          type="button"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

export default SequenceItemCard;
