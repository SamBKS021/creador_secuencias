import { Bell, Copy, HelpCircle, Minus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAppContext } from "../../app/store/AppContext.jsx";
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
  const { state } = useAppContext();
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

  function handleArrastrarCabecera(event) {
    if (!appWindow || event.button !== 0) {
      return;
    }

    const elemento = event.target instanceof Element ? event.target : null;
    if (elemento?.closest("a, button, input, select, textarea, [role='button']")) {
      return;
    }

    appWindow.startDragging().catch(() => {});
  }

  return (
    <header
      className="shrink-0 border-b border-[rgba(67,71,78,0.12)] bg-[var(--topbar-bg)] px-4 py-3 backdrop-blur-sm lg:px-8"
      onMouseDown={handleArrastrarCabecera}
    >
      <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4">
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
                      : "text-[var(--on-surface-variant)] hover:text-[var(--primary)]"
                  ].join(" ")
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
          <div className="relative">
            <IconButton
              icon={Bell}
              aria-label="Actualizaciones"
              onClick={() => navigate("/actualizaciones")}
              className="text-[var(--primary)]"
            />
            {state.updateStatus.available ? (
              <span
                className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-[var(--error)]"
                style={{ boxShadow: '0 0 0 4px var(--badge-ring)' }}
              />
            ) : null}
          </div>
          <IconButton
            icon={HelpCircle}
            aria-label="Ayuda"
            onClick={() => navigate("/ayuda")}
            className="text-[var(--primary)]"
          />
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full border text-xs font-bold shadow-[0_10px_24px_-18px_var(--shadow-color)]"
            style={{
              borderColor: 'var(--avatar-border)',
              background: 'var(--avatar-bg)',
              color: 'var(--avatar-text)',
            }}
          >
            CCP
          </div>

          {isDesktop ? (
            <div className="ml-2 flex items-center rounded-full border border-[rgba(67,71,78,0.12)] bg-[var(--surface-container-low)] p-1">
              <button
                type="button"
                data-tauri-drag-region={false}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--primary)] transition hover:bg-[var(--surface-container-lowest)]"
                aria-label="Minimizar"
                onClick={handleMinimize}
              >
                <Minus size={16} />
              </button>
              <button
                type="button"
                data-tauri-drag-region={false}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--primary)] transition hover:bg-[var(--surface-container-lowest)]"
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
