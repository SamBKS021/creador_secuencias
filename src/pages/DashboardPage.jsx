import { CalendarDays, FileStack, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../app/store/AppContext.jsx";
import Button from "../components/ui/Button.jsx";
import EditorialCard from "../components/ui/EditorialCard.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import StatCard from "../features/dashboard/StatCard.jsx";
import { formatDisplayDate, formatRelativeDate } from "../utils/formatters.js";

function DashboardPage() {
  const navigate = useNavigate();
  const { state, actions } = useAppContext();

  if (!state.workspaceRoot) {
    return (
      <EmptyState
        title="Define una carpeta raíz para comenzar"
        description="Selecciona una carpeta pensada para sincronizarse con Google Drive. La biblioteca, secuencias, borradores y exportaciones vivirán allí."
        action={
          <Button onClick={actions.chooseWorkspace}>
            Elegir carpeta de trabajo
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Panorama Actual"
        description="Tu biblioteca está sincronizada y lista para el próximo servicio. Usa esta vista para revisar repertorio reciente, secuencias próximas y accesos rápidos."
      />

      <section className="grid gap-4 md:grid-cols-2">
        <StatCard
          label="Canciones totales"
          value={state.stats.totalSongs}
          icon={FileStack}
        />
        <StatCard
          label="Secuencias"
          value={state.stats.totalSequences}
          icon={CalendarDays}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-3xl font-extrabold text-[var(--primary)]">
              Repertorio reciente
            </h2>
            <Button variant="ghost" onClick={() => navigate("/biblioteca")}>
              Ver biblioteca
            </Button>
          </div>

          <div className="space-y-4">
            {state.stats.recentUploads.map((song) => (
              <EditorialCard
                key={song.id}
                className="flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-container-low)] text-[var(--primary)]">
                    <FileStack size={20} />
                  </div>
                  <div>
                    <h3 className="font-headline text-2xl font-bold text-[var(--primary)]">
                      {song.title}
                    </h3>
                    <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
                      {song.key} · {song.tempo} BPM · actualizado{" "}
                      {formatRelativeDate(song.updatedAt)}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" onClick={() => navigate("/biblioteca")}>
                  Editar
                </Button>
              </EditorialCard>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <EditorialCard>
            <h2 className="font-headline text-3xl font-extrabold text-[var(--primary)]">
              Próximas secuencias
            </h2>
            <div className="mt-5 space-y-4">
              {state.stats.upcomingSequences.map((sequence) => (
                <div
                  key={sequence.id}
                  className="rounded-2xl bg-[var(--surface-container-low)] p-4"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[rgba(201,154,95,1)]">
                    {formatDisplayDate(sequence.serviceDate)}
                  </p>
                  <h3 className="font-headline mt-2 text-xl font-extrabold text-[var(--primary)]">
                    {sequence.title}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--on-surface-variant)]">
                    {sequence.items.length} canciones programadas
                  </p>
                </div>
              ))}
            </div>
            <Button
              className="mt-6 w-full"
              variant="outline"
              onClick={() => navigate("/secuencias")}
            >
              Ver secuencias
            </Button>
          </EditorialCard>

          <EditorialCard className="space-y-4">
            <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-[var(--outline)]">
              Carga reciente
            </p>
            {state.stats.recentUploads.slice(0, 2).map((song) => (
              <div
                key={song.id}
                className="flex items-center gap-3 rounded-2xl bg-[var(--surface-container-low)] p-4"
              >
                <Upload size={16} className="text-[var(--primary)]" />
                <span className="text-sm text-[var(--on-surface-variant)]">
                  {song.sourceFileName}
                </span>
              </div>
            ))}
          </EditorialCard>
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;
