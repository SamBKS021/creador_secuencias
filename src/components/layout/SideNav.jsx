import { createElement } from 'react'
import { CloudUpload, FolderCog, LayoutDashboard, Library, ListMusic, Settings, Sparkles } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import Button from '../ui/Button.jsx'

const navItems = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard },
  { to: '/biblioteca', label: 'Biblioteca de canciones', icon: Library },
  { to: '/subir', label: 'Centro de carga', icon: CloudUpload },
  { to: '/constructor-secuencias', label: 'Constructor', icon: ListMusic },
]

function SideNav() {
  return (
    <aside className="hidden w-[280px] shrink-0 border-r border-white/40 bg-[var(--surface-container-low)]/85 px-5 pb-8 pt-24 lg:flex lg:flex-col">
      <div className="space-y-8">
        <div className="space-y-1 px-2">
          <h2 className="font-headline text-3xl font-extrabold tracking-tight text-[var(--primary)]">The Liturgy</h2>
          <p className="font-headline text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Music Management
          </p>
        </div>

        <nav className="space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-2xl px-4 py-3 font-headline text-sm font-semibold transition',
                  isActive
                    ? 'bg-white text-[var(--primary)] shadow-[inset_3px_0_0_0_var(--primary)]'
                    : 'text-slate-500 hover:bg-white/70 hover:text-[var(--primary)]',
                ].join(' ')
              }
            >
              {createElement(Icon, { size: 18 })}
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <Button className="w-full">
          <Sparkles size={16} />
          Nueva secuencia
        </Button>
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
  )
}

export default SideNav
