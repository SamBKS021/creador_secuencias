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
    <aside className="hidden h-full w-[280px] shrink-0 border-r border-[rgba(67,71,78,0.12)] bg-[var(--glass-bg)] backdrop-blur-sm lg:flex lg:flex-col">
      <div className="sidebar-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-8 pt-8">
        <div className="space-y-8">
          <div className="space-y-1 px-2">
            <h2 className="font-headline text-3xl font-extrabold tracking-tight text-[var(--primary)]">
              Centro Musical
            </h2>
            <p className="font-headline text-xs font-semibold uppercase tracking-[0.18em] text-[var(--on-surface-variant)]">
              Gestor de Cantos
            </p>
          </div>

          <nav className="space-y-1 pr-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  [
                    "group relative flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-3 font-headline text-sm font-semibold transition-all duration-300 ease-out",
                    "before:absolute before:bottom-2 before:left-0 before:top-2 before:w-1 before:rounded-r-full before:bg-[var(--primary)] before:transition-all before:duration-300 before:ease-out",
                    isActive
                      ? "translate-x-1 bg-[var(--surface-container-lowest)] text-[var(--primary)] shadow-[var(--nav-shadow)] before:opacity-100 before:translate-x-0"
                      : "text-[var(--on-surface-variant)] before:-translate-x-2 before:opacity-0 hover:translate-x-1 hover:bg-[var(--surface-container-lowest)] hover:text-[var(--primary)]"
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
          <NavLink
            to="/ajustes"
            className={({ isActive }) =>
              [
                "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition",
                isActive
                  ? "bg-[var(--surface-container-lowest)] text-[var(--primary)] shadow-[var(--nav-shadow)]"
                  : "text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-lowest)]",
              ].join(" ")
            }
          >
            <Settings size={18} />
            Ajustes
          </NavLink>
          <NavLink
            to="/soporte"
            className={({ isActive }) =>
              [
                "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition",
                isActive
                  ? "bg-[var(--surface-container-lowest)] text-[var(--primary)] shadow-[var(--nav-shadow)]"
                  : "text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-lowest)]",
              ].join(" ")
            }
          >
            <FolderCog size={18} />
            Soporte
          </NavLink>
        </div>
      </div>
    </aside>
  );
}

export default SideNav;
