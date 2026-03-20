import { Search } from 'lucide-react'

function FilterBar({ filters, onChange }) {
  return (
    <div className="grid gap-4 rounded-[28px] bg-[var(--surface-container-low)] p-5 lg:grid-cols-[2.2fr_1fr_1fr_1fr]">
      <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
        <Search size={16} className="text-[var(--outline)]" />
        <input
          className="w-full bg-transparent outline-none"
          placeholder="Buscar títulos, autores o letra..."
          value={filters.search}
          onChange={(event) => onChange({ search: event.target.value })}
        />
      </label>

      <select
        className="rounded-2xl bg-white px-4 py-3 outline-none"
        value={filters.category}
        onChange={(event) => onChange({ category: event.target.value })}
      >
        <option>Todas</option>
        <option>Himno</option>
        <option>Adoración</option>
        <option>Contemporánea</option>
        <option>Destacada</option>
      </select>

      <select
        className="rounded-2xl bg-white px-4 py-3 outline-none"
        value={filters.tempo}
        onChange={(event) => onChange({ tempo: event.target.value })}
      >
        <option>Cualquiera</option>
        <option>Lento</option>
        <option>Medio</option>
        <option>Rápido</option>
      </select>

      <select
        className="rounded-2xl bg-white px-4 py-3 outline-none"
        value={filters.sortBy}
        onChange={(event) => onChange({ sortBy: event.target.value })}
      >
        <option value="date-desc">Más recientes</option>
        <option value="alpha">Alfabético</option>
        <option value="plays">Más usadas</option>
        <option value="key">Tonalidad</option>
      </select>
    </div>
  )
}

export default FilterBar
