import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

function normalizeOptions(options) {
  return options.map((option) => {
    if (typeof option === 'string') {
      return {
        value: option,
        label: option,
      }
    }

    return option
  })
}

function AppSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar',
  disabled = false,
  tone = 'surface',
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const normalizedOptions = useMemo(() => normalizeOptions(options), [options])
  const selectedOption = normalizedOptions.find((option) => option.value === value)

  useEffect(() => {
    if (!open) {
      return undefined
    }

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        className={[
          'flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition outline-none',
          tone === 'white'
            ? 'bg-[var(--surface-container-lowest)] text-[var(--primary)] shadow-[inset_0_0_0_1px_rgba(0,36,70,0.04)]'
            : 'bg-[var(--surface-container-low)] text-[var(--on-surface)]',
          disabled ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-0.5',
          open ? 'ring-2 ring-[rgba(31,111,235,0.16)]' : '',
          className,
        ].join(' ')}
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current)
          }
        }}
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        <ChevronDown
          size={18}
          className={[
            'shrink-0 text-[var(--primary)] transition',
            open ? 'rotate-180' : '',
          ].join(' ')}
        />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.55rem)] z-30 overflow-hidden rounded-[20px] border border-[rgba(67,71,78,0.12)] bg-[var(--surface-container-lowest)] shadow-[0_24px_44px_-26px_rgba(0,24,49,0.45)]">
          <div className="max-h-72 overflow-y-auto p-2">
            {normalizedOptions.map((option) => {
              const selected = option.value === value

              return (
                <button
                  key={option.value}
                  type="button"
                  className={[
                    'flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm transition',
                    selected
                      ? 'bg-[rgba(31,111,235,0.10)] font-semibold text-[var(--primary)]'
                      : 'text-[var(--on-surface)] hover:bg-[var(--surface-container-low)]',
                  ].join(' ')}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  <span className="truncate">{option.label}</span>
                  {selected ? <Check size={16} className="shrink-0 text-[var(--primary)]" /> : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default AppSelect
