const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function calcularUsoAnual(fechasUso, year = new Date().getFullYear()) {
  const usosPorMes = Array(12).fill(0)

  ;(Array.isArray(fechasUso) ? fechasUso : []).forEach((fechaUso) => {
    const match = String(fechaUso || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (!match || Number(match[1]) !== year) {
      return
    }

    const monthIndex = Number(match[2]) - 1
    if (monthIndex >= 0 && monthIndex < 12) {
      usosPorMes[monthIndex] += 1
    }
  })

  return usosPorMes
}

function SongUsageChart({ fechasUso }) {
  const year = new Date().getFullYear()
  const usosPorMes = calcularUsoAnual(fechasUso, year)
  const total = usosPorMes.reduce((sum, value) => sum + value, 0)
  const maxUso = Math.max(1, ...usosPorMes)
  const activeMonths = usosPorMes.filter(Boolean).length

  return (
    <section className="flex h-full flex-col rounded-[24px] bg-[var(--surface-container-low)] p-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--outline)]">Uso anual</p>
          <h4 className="font-headline mt-2 text-3xl font-extrabold text-[var(--primary)]">{year}</h4>
        </div>
        <div className="grid grid-cols-2 gap-3 text-right">
          <div>
            <p className="text-3xl font-extrabold text-[var(--primary)]">{total}</p>
            <p className="text-xs font-semibold text-[var(--on-surface-variant)]">uso(s)</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-[var(--primary)]">{activeMonths}</p>
            <p className="text-xs font-semibold text-[var(--on-surface-variant)]">mes(es)</p>
          </div>
        </div>
      </div>

      <div className="mt-7 flex-1 space-y-3">
        {usosPorMes.map((count, index) => {
          const width = count ? Math.max(8, (count / maxUso) * 100) : 0

          return (
            <div key={MONTH_LABELS[index]} className="grid grid-cols-[3rem_minmax(0,1fr)_2.5rem] items-center gap-3">
              <span className="text-xs font-bold uppercase text-[var(--on-surface-variant)]">{MONTH_LABELS[index]}</span>
              <div className="h-5 overflow-hidden rounded-full bg-[var(--surface-container-lowest)]">
                <div
                  className="h-full rounded-full bg-[var(--primary)] transition-[width]"
                  style={{ width: `${width}%` }}
                  title={`${MONTH_LABELS[index]}: ${count} uso(s)`}
                />
              </div>
              <span className="text-right text-sm font-extrabold text-[var(--primary)]">{count}</span>
            </div>
          )
        })}
      </div>

      {!total ? (
        <p className="mt-5 rounded-2xl bg-[var(--surface-container-lowest)] px-4 py-3 text-sm text-[var(--on-surface-variant)]">
          Sin usos registrados este ano.
        </p>
      ) : null}
    </section>
  )
}

export default SongUsageChart
