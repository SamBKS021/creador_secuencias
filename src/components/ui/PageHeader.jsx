function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-3">
        {eyebrow ? (
          <p className="font-headline text-xs font-bold uppercase tracking-[0.35em] text-[var(--outline)]">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-2">
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-[var(--primary)]">
            {title}
          </h1>
          {description ? (
            <p className="max-w-3xl text-base leading-7 text-[var(--on-surface-variant)]">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  )
}

export default PageHeader
