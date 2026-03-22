import { createElement } from 'react'
import { CloudUpload, LayoutDashboard, Library, ListMusic, Settings } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard },
  { to: '/biblioteca', label: 'Biblioteca', icon: Library },
  { to: '/subir', label: 'Carga', icon: CloudUpload },
  { to: '/secuencias', label: 'Secuencias', icon: ListMusic },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
]

function MobileNav() {
  return (
    <nav className="glass-panel fixed inset-x-4 bottom-4 z-40 grid grid-cols-5 rounded-[24px] border border-white/60 p-2 shadow-[0_16px_30px_-18px_rgba(0,36,70,0.36)] lg:hidden">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            [
              'flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs font-semibold',
              isActive ? 'bg-[var(--primary)] text-white' : 'text-slate-500',
            ].join(' ')
          }
        >
          {createElement(Icon, { size: 18 })}
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export default MobileNav
