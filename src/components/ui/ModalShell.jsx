import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function ModalShell({
  open = true,
  children,
  className = '',
  panelClassName = '',
  onClose,
  zIndex = 'z-[230]',
  ariaLabel,
  ariaLabelledBy,
}) {
  const panelRef = useRef(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const previousFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const frameId = requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel) {
        return
      }
      const focusable = panel.querySelectorAll(FOCUSABLE_SELECTOR)
      if (focusable.length > 0 && focusable[0] instanceof HTMLElement) {
        focusable[0].focus()
      } else {
        panel.focus()
      }
    })

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        if (onCloseRef.current) {
          event.stopPropagation()
          onCloseRef.current()
        }
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const panel = panelRef.current
      if (!panel) {
        return
      }

      const focusable = Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (element) => element instanceof HTMLElement && element.offsetParent !== null,
      )
      if (focusable.length === 0) {
        event.preventDefault()
        panel.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      cancelAnimationFrame(frameId)
      document.removeEventListener('keydown', handleKeyDown)
      if (previousFocused && typeof previousFocused.focus === 'function') {
        previousFocused.focus()
      }
    }
  }, [open])

  if (!open) {
    return null
  }

  return (
    <div
      className={[
        'app-modal-overlay fixed inset-0 flex items-center justify-center bg-[var(--modal-scrim)] px-4 backdrop-blur-md',
        zIndex,
        className,
      ].join(' ')}
      onMouseDown={(event) => {
        if (onClose && event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        tabIndex={-1}
        className={['app-modal-panel outline-none', panelClassName].join(' ')}
      >
        {children}
      </div>
    </div>
  )
}

export default ModalShell
