import EditorialCard from '../../components/ui/EditorialCard.jsx'

function StatCard({ label, value, accent = 'light', icon: Icon }) {
  const tones = {
    light: 'bg-[var(--surface-container-lowest)] text-[var(--primary)]',
    primary: 'cta-gradient text-white',
    secondary: 'bg-[var(--secondary-container)] text-[var(--primary)]',
  }

  return (
    <EditorialCard className={`min-h-[146px] ${tones[accent] || tones.light}`}>
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <p className="font-headline text-xs font-bold uppercase tracking-[0.22em] opacity-70">{label}</p>
          {Icon ? <Icon size={18} className="opacity-70" /> : null}
        </div>
        <div>
          <p className="font-headline text-4xl font-extrabold tracking-tight">{value}</p>
        </div>
      </div>
    </EditorialCard>
  )
}

export default StatCard
