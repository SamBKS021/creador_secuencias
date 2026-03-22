import { Copy, HelpCircle, Minus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import IconButton from "../ui/IconButton.jsx";
import { isTauriRuntime } from "../../utils/platform.js";
import service from "../../services/workspaceService.js";

const topLinks = [
  { to: "/", label: "Inicio" },
  { to: "/biblioteca", label: "Biblioteca" },
  { to: "/subir", label: "Centro de carga" },
  { to: "/secuencias", label: "Secuencias" }
];

function TopBar() {
  const navigate = useNavigate();
  const isDesktop = useMemo(() => isTauriRuntime(), []);
  const appWindow = useMemo(() => (isDesktop ? getCurrentWindow() : null), [isDesktop]);
  const [isMaximized, setIsMaximized] = useState(true);

  useEffect(() => {
    if (!appWindow) {
      return undefined;
    }

    let removeResizeListener;
    let mounted = true;

    (async () => {
      const maximized = await appWindow.isMaximized().catch(() => false);
      if (mounted) {
        setIsMaximized(maximized);
      }

      removeResizeListener = await appWindow.onResized(async () => {
        const nextMaximized = await appWindow.isMaximized().catch(() => false);
        if (mounted) {
          setIsMaximized(nextMaximized);
        }
      });
    })();

    return () => {
      mounted = false;
      if (removeResizeListener) {
        removeResizeListener();
      }
    };
  }, [appWindow]);

  async function handleMinimize(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!appWindow) {
      return;
    }
    await service.minimizeMainWindow();
  }

  async function handleToggleMaximize(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!appWindow) {
      return;
    }
    await service.toggleMaximizeMainWindow();
    const maximized = await appWindow.isMaximized().catch(() => false);
    setIsMaximized(maximized);
  }

  async function handleClose(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!appWindow) {
      return;
    }
    await service.closeMainWindow();
  }

  return (
    <header className="shrink-0 border-b border-[rgba(0,36,70,0.08)] bg-white/95 px-4 py-3 backdrop-blur-sm lg:px-8">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-6">
          <div
            data-tauri-drag-region={isDesktop ? true : undefined}
            className="flex min-w-0 items-center"
          >
            <p className="select-none font-headline text-lg font-extrabold uppercase tracking-[0.22em] text-[var(--primary)]">
              Centro Cristiano Palmas
            </p>
          </div>

          <div
            data-tauri-drag-region={isDesktop ? true : undefined}
            className="hidden h-10 min-w-10 flex-1 lg:block"
          />

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
          <IconButton
            icon={HelpCircle}
            aria-label="Ayuda"
            onClick={() => navigate("/ayuda")}
            className="text-[var(--primary)]"
          />
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(171,200,245,0.9)] bg-[var(--tertiary-fixed)] text-xs font-bold text-[var(--primary)]">
            CCP
          </div>

          {isDesktop ? (
            <div className="ml-2 flex items-center rounded-full border border-[rgba(0,36,70,0.08)] bg-[var(--surface-container-low)] p-1">
              <button
                type="button"
                data-tauri-drag-region={false}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--primary)] transition hover:bg-white"
                aria-label="Minimizar"
                onClick={handleMinimize}
              >
                <Minus size={16} />
              </button>
              <button
                type="button"
                data-tauri-drag-region={false}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--primary)] transition hover:bg-white"
                aria-label={isMaximized ? "Restaurar" : "Maximizar"}
                onClick={handleToggleMaximize}
              >
                <Copy size={15} />
              </button>
              <button
                type="button"
                data-tauri-drag-region={false}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--primary)] transition hover:bg-[rgba(186,26,26,0.1)] hover:text-[var(--error)]"
                aria-label="Cerrar"
                onClick={handleClose}
              >
                <X size={16} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default TopBar;
