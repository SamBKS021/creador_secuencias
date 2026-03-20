import clsx from 'clsx'

function EditorialCard({ className, children }) {
  return (
    <section
      className={clsx(
        'rounded-[24px] bg-[var(--surface-container-lowest)] p-5 editorial-shadow',
        className,
      )}
    >
      {children}
    </section>
  )
}

export default EditorialCard
