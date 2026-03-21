import { createElement } from "react";
import {
  CloudUpload,
  FolderCog,
  LayoutDashboard,
  Library,
  ListMusic,
  Settings
} from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Inicio", icon: LayoutDashboard },
  { to: "/biblioteca", label: "Biblioteca de canciones", icon: Library },
  { to: "/subir", label: "Centro de carga", icon: CloudUpload },
  { to: "/secuencias", label: "Secuencias", icon: ListMusic }
];

function SideNav() {
  return (
    <aside className="hidden w-[280px] shrink-0 border-r border-white/40 bg-[var(--surface-container-low)]/85 px-5 pb-8 pt-24 lg:flex lg:flex-col">
      <div className="space-y-8">
        <div className="space-y-1 px-2">
          <h2 className="font-headline text-3xl font-extrabold tracking-tight text-[var(--primary)]">
            Centro Musical
          </h2>
          <p className="font-headline text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Gestor de Cantos
          </p>
        </div>

        <nav className="space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  "group relative flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-3 font-headline text-sm font-semibold transition-all duration-300 ease-out",
                  "before:absolute before:bottom-2 before:left-0 before:top-2 before:w-1 before:rounded-r-full before:bg-[var(--primary)] before:transition-all before:duration-300 before:ease-out",
                  isActive
                    ? "translate-x-1 bg-white text-[var(--primary)] shadow-[0_14px_30px_-24px_rgba(0,36,70,0.45)] before:opacity-100 before:translate-x-0"
                    : "text-slate-500 before:-translate-x-2 before:opacity-0 hover:translate-x-1 hover:bg-white/70 hover:text-[var(--primary)]"
                ].join(" ")
              }
            >
              <span className="relative z-10 transition-transform duration-300 ease-out group-hover:scale-105">
                {createElement(Icon, { size: 18 })}
              </span>
              <span className="relative z-10 transition-transform duration-300 ease-out group-hover:translate-x-0.5">
                {label}
              </span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto space-y-2 pt-6">
        <button className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-500 transition hover:bg-white/70">
          <Settings size={18} />
          Ajustes
        </button>
        <button className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-500 transition hover:bg-white/70">
          <FolderCog size={18} />
          Soporte
        </button>
      </div>
    </aside>
  );
}

export default SideNav;
