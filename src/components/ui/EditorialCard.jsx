import clsx from 'clsx'

function EditorialCard({ className, children }) {
  return (
    <section
      className={clsx(
        'motion-card rounded-[24px] bg-[var(--surface-container-lowest)] p-5 editorial-shadow transition-transform duration-300',
        className,
      )}
    >
      {children}
    </section>
  )
}

export default EditorialCard
