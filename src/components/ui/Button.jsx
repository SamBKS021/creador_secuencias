import clsx from 'clsx'

function Button({ className, variant = 'primary', children, disabled = false, ...props }) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:shadow-none',
        variant === 'primary' &&
          (disabled
            ? 'bg-[var(--outline-variant)] text-[var(--on-surface-variant)]'
            : 'cta-gradient text-white shadow-[0_14px_30px_-18px_rgba(0,36,70,0.7)] hover:-translate-y-0.5'),
        variant === 'secondary' &&
          'border border-[rgba(67,71,78,0.08)] bg-[var(--surface-container-lowest)] text-[var(--primary)] hover:bg-[var(--primary-fixed)]',
        variant === 'ghost' &&
          'bg-transparent text-[var(--on-surface-variant)] hover:bg-[var(--hover-surface)]',
        variant === 'outline' &&
          'border border-[rgba(67,71,78,0.16)] bg-[var(--surface-container-lowest)] text-[var(--primary)] hover:border-[var(--primary)] hover:bg-[var(--surface-container)]',
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
