import { Search } from 'lucide-react'
import AppSelect from '../../components/ui/AppSelect.jsx'

function FilterBar({ filters, categories, onChange }) {
  return (
    <div className="grid gap-4 rounded-[28px] bg-[var(--surface-container-low)] p-5 lg:grid-cols-[2.2fr_1fr_1fr_1fr]">
      <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
        <Search size={16} className="text-[var(--outline)]" />
        <input
          className="w-full bg-transparent outline-none"
          placeholder="Buscar titulos, autores o letra..."
          value={filters.search}
          onChange={(event) => onChange({ search: event.target.value })}
        />
      </label>

      <AppSelect
        tone="white"
        options={['Todas', ...categories]}
        value={filters.category}
        onChange={(nextValue) => onChange({ category: nextValue })}
      />

      <AppSelect
        tone="white"
        options={['Cualquiera', 'Lento', 'Medio', 'Rapido']}
        value={filters.tempo}
        onChange={(nextValue) => onChange({ tempo: nextValue })}
      />

      <AppSelect
        tone="white"
        options={[
          { value: 'date-desc', label: 'Mas recientes' },
          { value: 'alpha', label: 'Alfabetico' },
          { value: 'plays', label: 'Mas usadas' },
          { value: 'key', label: 'Tonalidad' },
        ]}
        value={filters.sortBy}
        onChange={(nextValue) => onChange({ sortBy: nextValue })}
      />
    </div>
  )
}

export default FilterBar
