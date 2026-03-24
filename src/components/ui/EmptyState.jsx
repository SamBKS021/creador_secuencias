function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[rgba(67,71,78,0.18)] bg-[var(--surface-container-lowest)] px-6 py-10 text-center">
      <h3 className="font-headline text-xl font-bold text-[var(--primary)]">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--on-surface-variant)]">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}

export default EmptyState
