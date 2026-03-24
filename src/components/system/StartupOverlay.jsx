function StartupOverlay({ open, progress = 0, detail = '' }) {
  if (!open) {
    return null
  }

  const safeProgress = Math.max(6, Math.min(100, Number(progress) || 0))

  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center bg-transparent px-4">
      <div className="w-full max-w-xl rounded-[34px] border border-[rgba(67,71,78,0.08)] bg-[var(--surface-container-lowest)] px-7 py-8 shadow-[var(--modal-shadow)]">
        <p className="startup-title text-center font-headline text-[clamp(2rem,4vw,3.2rem)] font-extrabold tracking-[0.06em] text-[var(--primary)]">
          Centro Cristiano Palmas
        </p>
        <p className="startup-subtitle mt-2 text-center font-headline text-xl italic text-[var(--on-surface-variant)]">
          Creador de secuencias
        </p>

        <div className="mt-8 space-y-3">
          <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-container)]">
            <div
              className="h-full rounded-full cta-gradient transition-[width] duration-500 ease-out"
              style={{ width: `${safeProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[var(--on-surface-variant)]">{detail}</p>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--outline)]">
              {Math.round(safeProgress)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StartupOverlay
