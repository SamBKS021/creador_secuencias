import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'

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
  ariaLabel,
}) {
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const listboxId = useId()
  const normalizedOptions = useMemo(() => normalizeOptions(options), [options])
  const selectedIndex = normalizedOptions.findIndex((option) => option.value === value)
  const selectedOption = selectedIndex >= 0 ? normalizedOptions[selectedIndex] : undefined

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

  function openMenu() {
    if (disabled) {
      return
    }
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }

  function handleKeyDown(event) {
    if (disabled || !normalizedOptions.length) {
      return
    }

    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openMenu()
      }
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setHighlightedIndex((current) => (current + 1) % normalizedOptions.length)
        break
      case 'ArrowUp':
        event.preventDefault()
        setHighlightedIndex((current) => (current <= 0 ? normalizedOptions.length - 1 : current - 1))
        break
      case 'Home':
        event.preventDefault()
        setHighlightedIndex(0)
        break
      case 'End':
        event.preventDefault()
        setHighlightedIndex(normalizedOptions.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (highlightedIndex >= 0 && normalizedOptions[highlightedIndex]) {
          onChange(normalizedOptions[highlightedIndex].value)
        }
        setOpen(false)
        triggerRef.current?.focus()
        break
      case 'Escape':
        event.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
        break
      default:
        break
    }
  }

  return (
    <div ref={rootRef} className="relative" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
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
          if (open) {
            setOpen(false)
          } else {
            openMenu()
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
          <div id={listboxId} role="listbox" className="max-h-72 overflow-y-auto p-2">
            {normalizedOptions.map((option, index) => {
              const selected = option.value === value
              const highlighted = index === highlightedIndex

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={[
                    'flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm transition',
                    selected
                      ? 'bg-[rgba(31,111,235,0.10)] font-semibold text-[var(--primary)]'
                      : highlighted
                        ? 'bg-[var(--surface-container-low)] text-[var(--on-surface)]'
                        : 'text-[var(--on-surface)] hover:bg-[var(--surface-container-low)]',
                  ].join(' ')}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                    triggerRef.current?.focus()
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
