import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  PencilLine
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FaFileWord } from "react-icons/fa";
import { sileo } from "sileo";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../app/store/AppContext.jsx";
import { NEW_SEQUENCE_ID } from "../app/store/appReducer.js";
import Button from "../components/ui/Button.jsx";
import EditorialCard from "../components/ui/EditorialCard.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import { formatDisplayDate, formatRelativeDate } from "../utils/formatters.js";

const PAGE_SIZE = 4;

function CompactPagination({ page, totalPages, onChange, label = "Página" }) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--surface-container-low)] px-3 py-3">
      <p className="text-xs font-medium text-[var(--on-surface-variant)]">
        {label} {page} de {totalPages}
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="inline-flex h-9 items-center justify-center gap-1 rounded-xl px-3 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--hover-surface)] disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
        >
          <ChevronLeft size={15} />
          Anterior
        </button>
        <button
          type="button"
          className="inline-flex h-9 items-center justify-center gap-1 rounded-xl px-3 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--hover-surface)] disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
        >
          Siguiente
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

function SequencesPage() {
  const navigate = useNavigate();
  const { state, actions } = useAppContext();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [exportStatuses, setExportStatuses] = useState({});

  const filteredSequences = useMemo(
    () =>
      state.sequences.filter((sequence) =>
        [sequence.title, sequence.serviceDate]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [search, state.sequences]
  );

  const totalPages = Math.max(1, Math.ceil(filteredSequences.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [search, state.sequences]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    let cancelled = false;

    async function loadStatuses() {
      try {
        const statuses = await actions.getSequenceExportStatuses();
        if (cancelled) {
          return;
        }

        setExportStatuses(Object.fromEntries(statuses.map((status) => [status.sequenceId, status])));
      } catch {
        if (!cancelled) {
          setExportStatuses({});
        }
      }
    }

    loadStatuses();

    return () => {
      cancelled = true;
    };
  }, [state.sequences]);

  const paginatedSequences = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredSequences.slice(start, start + PAGE_SIZE);
  }, [filteredSequences, page]);

  function handleCreateNew() {
    actions.setActiveSequence(NEW_SEQUENCE_ID);
    navigate("/constructor-secuencias");
  }

  function handleEditSequence(sequenceId) {
    actions.setActiveSequence(sequenceId);
    navigate("/constructor-secuencias");
  }

  async function handleOpenDocument(sequenceId) {
    try {
      await actions.openExportedSequence(sequenceId);
    } catch (error) {
      sileo.error({
        title: "No se pudo abrir el documento",
        description: error?.message || "Todavía no existe un DOCX exportado para esta secuencia."
      });
    }
  }

  if (!state.workspaceRoot) {
    return (
      <EmptyState
        title="Las secuencias necesitan almacenamiento local listo"
        description="Primero prepara el espacio de trabajo administrado por la app para guardar secuencias, biblioteca y exportaciones."
        action={<Button onClick={actions.chooseWorkspace}>Preparar almacenamiento</Button>}
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Planeación del servicio"
        title="Biblioteca de secuencias"
        description="Revisa secuencias guardadas, abre una para editarla o crea una nueva desde cero."
        actions={
          <Button className="whitespace-nowrap" onClick={handleCreateNew}>
            <Plus size={16} />
            Nueva secuencia
          </Button>
        }
      />

      <EditorialCard className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h2 className="font-headline text-2xl font-extrabold text-[var(--primary)]">
              Secuencias disponibles
            </h2>
            <p className="text-sm text-[var(--on-surface-variant)]">
              {filteredSequences.length} secuencia(s) visibles en la biblioteca actual.
            </p>
          </div>

          <input
            className="w-full rounded-2xl bg-[var(--surface-container-low)] px-4 py-3 outline-none lg:max-w-md"
            placeholder="Buscar por título o fecha del servicio..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {paginatedSequences.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {paginatedSequences.map((sequence) => {
              const exportStatus = exportStatuses[sequence.id];

              return (
                <EditorialCard
                  key={sequence.id}
                  className="space-y-5 border border-[rgba(67,71,78,0.08)] bg-[var(--surface-container-low)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[rgba(201,154,95,1)]">
                        {formatDisplayDate(sequence.serviceDate)}
                      </p>
                      <h3 className="font-headline text-2xl font-extrabold text-[var(--primary)]">
                        {sequence.title || "Secuencia sin título"}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {exportStatus?.exists ? (
                        <button
                          type="button"
                          onClick={() => handleOpenDocument(sequence.id)}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(67,71,78,0.16)] bg-[var(--surface-container-lowest)] text-[var(--primary)] transition hover:border-[var(--primary)]"
                          aria-label="Abrir documento Word"
                          title="Abrir documento Word"
                        >
                          <FaFileWord size={18} />
                        </button>
                      ) : null}
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-container-lowest)] text-[var(--primary)]">
                        <CalendarDays size={20} />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--outline)]">Canciones</p>
                      <p className="mt-2 text-lg font-bold text-[var(--primary)]">{sequence.items.length}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--outline)]">Servicio</p>
                      <p className="mt-2 text-sm font-semibold text-[var(--on-surface)]">
                        {formatDisplayDate(sequence.serviceDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--outline)]">Actualizada</p>
                      <p className="mt-2 text-sm font-semibold text-[var(--on-surface)]">
                        {formatRelativeDate(sequence.updatedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-[var(--on-surface-variant)]">
                      <FileText size={16} />
                      {exportStatus?.exists ? "Lista para editar, exportar y abrir" : "Lista para editar y exportar"}
                    </div>
                    <Button variant="outline" onClick={() => handleEditSequence(sequence.id)}>
                      <PencilLine size={16} />
                      Editar
                    </Button>
                  </div>
                </EditorialCard>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title={state.sequences.length ? "No hay resultados para esta búsqueda" : "Aún no hay secuencias guardadas"}
            description={
              state.sequences.length
                ? "Prueba con otro título o una fecha distinta."
                : "Crea tu primera secuencia para empezar a planear y exportar servicios."
            }
            action={<Button onClick={handleCreateNew}>Crear secuencia</Button>}
          />
        )}

        <CompactPagination page={page} totalPages={totalPages} onChange={setPage} />
      </EditorialCard>
    </div>
  );
}

export default SequencesPage;
