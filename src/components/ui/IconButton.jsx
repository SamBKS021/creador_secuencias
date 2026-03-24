import { createElement } from 'react'
import clsx from 'clsx'

function IconButton({ icon: Icon, className, ...props }) {
  return (
    <button
      className={clsx(
        'inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--primary)] transition hover:bg-[var(--hover-surface)]',
        className,
      )}
      {...props}
    >
      {createElement(Icon, { size: 18, strokeWidth: 2.2 })}
    </button>
  )
}

export default IconButton
