function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0 space-y-3 xl:flex-1">
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
      {actions ? (
        <div className="flex w-full items-center gap-3 sm:flex-nowrap xl:w-auto xl:shrink-0">
          {actions}
        </div>
      ) : null}
    </div>
  )
}

export default PageHeader
