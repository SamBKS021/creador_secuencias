import { Bell, FolderOpen, HelpCircle, Search } from "lucide-react";
import { NavLink } from "react-router-dom";
import Button from "../ui/Button.jsx";
import IconButton from "../ui/IconButton.jsx";

const topLinks = [
  { to: "/", label: "Inicio" },
  { to: "/biblioteca", label: "Biblioteca" },
  { to: "/subir", label: "Centro de carga" },
  { to: "/secuencias", label: "Secuencias" }
];

function TopBar({ workspaceRoot, onChooseWorkspace }) {
  return (
    <header className="glass-panel fixed inset-x-0 top-0 z-40 border-b border-white/30 px-4 py-4 lg:px-8">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-6">
          <p className="font-headline text-lg font-extrabold uppercase tracking-[0.22em] text-[var(--primary)]">
            Centro Cristiano Palmas
          </p>
          <nav className="hidden items-center gap-5 lg:flex">
            {topLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  [
                    "font-headline text-sm font-semibold tracking-tight transition",
                    isActive
                      ? "text-[var(--primary)]"
                      : "text-slate-500 hover:text-[var(--primary)]"
                  ].join(" ")
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
          <div className="hidden items-center gap-3 rounded-full bg-[var(--surface-container)] px-4 py-2 text-sm text-[var(--outline)] lg:flex">
            <Search size={16} />
            <span>{workspaceRoot || "Sin carpeta de trabajo"}</span>
          </div>
          <Button
            variant="secondary"
            className="hidden lg:inline-flex"
            onClick={onChooseWorkspace}
          >
            <FolderOpen size={16} />
            {workspaceRoot ? "Cambiar carpeta" : "Elegir carpeta"}
          </Button>
          <IconButton icon={Bell} aria-label="Notificaciones" />
          <IconButton icon={HelpCircle} aria-label="Ayuda" />
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(171,200,245,0.9)] bg-[var(--tertiary-fixed)] text-xs font-bold text-[var(--primary)]">
            SL
          </div>
        </div>
      </div>
    </header>
  );
}

export default TopBar;
