import { arrayMove } from "@dnd-kit/sortable";
import { CalendarDays, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppContext } from "../app/store/AppContext.jsx";
import Button from "../components/ui/Button.jsx";
import EditorialCard from "../components/ui/EditorialCard.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import ExportPanel from "../features/sequence-builder/ExportPanel.jsx";
import SequenceList from "../features/sequence-builder/SequenceList.jsx";
import {
  createEmptySequence,
  generateSequenceMetrics
} from "../utils/workspace.js";

function SequenceBuilderPage() {
  const { state, activeSequence, filteredSongs, actions } = useAppContext();
  const [sequence, setSequence] = useState(activeSequence);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSequence(activeSequence);
  }, [activeSequence]);

  const sequenceMetrics = generateSequenceMetrics(sequence, state.songs);

  const filteredLibrary = filteredSongs.filter((song) =>
    [song.title, song.author, song.key]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  if (!state.workspaceRoot) {
    return (
      <EmptyState
        title="El constructor necesita una carpeta raíz activa"
        description="Las secuencias se guardan en la carpeta seleccionada y las exportaciones DOCX se generan dentro de `exports/`."
        action={
          <Button onClick={actions.chooseWorkspace}>
            Elegir carpeta de trabajo
          </Button>
        }
      />
    );
  }

  function addSong(songId) {
    setSequence((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          id: `item-${Date.now()}-${songId}`,
          songId,
          order: current.items.length + 1,
          transitionType: current.items.length ? "Crossfade" : "Entrada suave"
        }
      ]
    }));
  }

  function removeSong(itemId) {
    setSequence((current) => ({
      ...current,
      items: current.items
        .filter((item) => item.id !== itemId)
        .map((item, index) => ({ ...item, order: index + 1 }))
    }));
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSequence((current) => {
      const oldIndex = current.items.findIndex((item) => item.id === active.id);
      const newIndex = current.items.findIndex((item) => item.id === over.id);
      const reordered = arrayMove(current.items, oldIndex, newIndex).map(
        (item, index) => ({
          ...item,
          order: index + 1
        })
      );
      return {
        ...current,
        items: reordered
      };
    });
  }

  return (
    <div className="space-y-8 mt-4">
      <PageHeader
        eyebrow="Preparación del servicio"
        title="Constructor de secuencias"
        description="Arma el orden litúrgico, reordena canciones con drag-and-drop y exporta un DOCX listo para compartir o descargar."
        actions={
          <>
            <Button
              variant="secondary"
              className="whitespace-nowrap"
              onClick={() => setSequence(createEmptySequence())}
            >
              <Plus size={16} />
              Nueva secuencia
            </Button>
            <Button
              className="whitespace-nowrap"
              onClick={() => actions.saveSequence(sequence)}
            >
              <Save size={16} />
              Guardar secuencia
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <EditorialCard className="space-y-5">
          <h3 className="font-headline text-2xl font-extrabold text-[var(--primary)]">
            Biblioteca disponible
          </h3>
          <input
            className="w-full rounded-2xl bg-[var(--surface-container-low)] px-4 py-3 outline-none"
            placeholder="Buscar canciones, autores o tonalidades..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="space-y-3">
            {filteredLibrary.slice(0, 6).map((song) => (
              <button
                key={song.id}
                type="button"
                onClick={() => addSong(song.id)}
                className="flex w-full items-center justify-between rounded-2xl bg-[var(--surface-container-low)] px-4 py-4 text-left transition hover:bg-[var(--secondary-container)]"
              >
                <div>
                  <p className="font-headline text-lg font-bold text-[var(--primary)]">
                    {song.title}
                  </p>
                  <p className="text-sm text-[var(--on-surface-variant)]">
                    {song.author} · {song.key} · {song.tempo} BPM
                  </p>
                </div>
                <Plus size={18} className="text-[var(--primary)]" />
              </button>
            ))}
          </div>
        </EditorialCard>

        <div className="space-y-6">
          <EditorialCard className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">
                    Título de la secuencia
                  </span>
                  <input
                    className="w-full rounded-2xl bg-[var(--surface-container-low)] px-4 py-3 outline-none"
                    value={sequence.title}
                    onChange={(event) =>
                      setSequence({ ...sequence, title: event.target.value })
                    }
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">
                    Fecha del servicio
                  </span>
                  <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-container-low)] px-4 py-3">
                    <CalendarDays size={16} className="text-[var(--outline)]" />
                    <input
                      className="w-full bg-transparent outline-none"
                      type="date"
                      value={sequence.serviceDate}
                      onChange={(event) =>
                        setSequence({
                          ...sequence,
                          serviceDate: event.target.value
                        })
                      }
                    />
                  </div>
                </label>
              </div>

              {sequence.id ? (
                <Button
                  variant="outline"
                  onClick={() => actions.deleteSequence(sequence.id)}
                >
                  <Trash2 size={16} />
                  Eliminar
                </Button>
              ) : null}
            </div>

            {sequence.items.length ? (
              <SequenceList
                items={sequence.items}
                songs={state.songs}
                onDragEnd={handleDragEnd}
                onRemove={removeSong}
              />
            ) : (
              <EmptyState
                title="Aún no hay canciones en esta secuencia"
                description="Agrega canciones desde la columna izquierda para construir el flujo del servicio."
              />
            )}
          </EditorialCard>

          <div className="grid gap-4 md:grid-cols-4">
            <EditorialCard>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--outline)]">
                Canciones
              </p>
              <p className="font-headline mt-3 text-3xl font-extrabold text-[var(--primary)]">
                {sequenceMetrics.totalSongs}
              </p>
            </EditorialCard>
            <EditorialCard>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--outline)]">
                Duración
              </p>
              <p className="font-headline mt-3 text-3xl font-extrabold text-[var(--primary)]">
                {sequenceMetrics.estimatedDuration}
              </p>
            </EditorialCard>
            <EditorialCard>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--outline)]">
                Energía
              </p>
              <p className="font-headline mt-3 text-3xl font-extrabold text-[var(--primary)]">
                {sequenceMetrics.energyFlow}
              </p>
            </EditorialCard>
            <EditorialCard>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--outline)]">
                Complejidad
              </p>
              <p className="font-headline mt-3 text-3xl font-extrabold text-[var(--primary)]">
                {sequenceMetrics.complexity}
              </p>
            </EditorialCard>
          </div>

          <ExportPanel
            exportResult={state.exportResult}
            onExport={() => actions.exportSequence(sequence.id)}
            onOpenFolder={actions.openExportsFolder}
            disabled={!sequence.id || !sequence.items.length}
          />
        </div>
      </div>
    </div>
  );
}

export default SequenceBuilderPage;
