function ModalShell({
  open = true,
  children,
  className = '',
  panelClassName = '',
  onClose,
  zIndex = 'z-[230]',
}) {
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
      <div className={['app-modal-panel', panelClassName].join(' ')}>
        {children}
      </div>
    </div>
  )
}

export default ModalShell
