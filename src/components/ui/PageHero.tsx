import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';


// The band the public pages open with: a small badge line, the title, a description, then the page's search and
// controls (`children`). One component so the titles are the same size and weight everywhere.
// `lead` goes above the badge (the docs' notice), `aside` next to the title from `sm` up (the commands' counts).
export function PageHero({ badge, title, description, descriptionClassName, lead, aside, children, className }: {
  // an icon and a few words
  badge?: ReactNode,
  title: ReactNode,
  description?: ReactNode,
  // the description's bottom margin when it isn't the usual gap to the controls
  descriptionClassName?: string,
  lead?: ReactNode,
  // null keeps its place while what it shows loads, so nothing above it is remounted when it arrives
  aside?: ReactNode,
  children?: ReactNode,
  className?: string,
}) {
  const heading = (
    <>
      {(badge) ? <div className='mb-3 flex items-center gap-2 text-sm font-medium text-muted'>{badge}</div> : null}
      <h1 className='mb-2 text-3xl font-semibold text-white sm:text-4xl'>{title}</h1>
      {(description) ? (
        <p className={cn(descriptionClassName ?? ((children) ? 'mb-6' : null), 'max-w-prose text-muted')}>{description}</p>
      ) : null}
    </>
  );
  return (
    <div className={cn('border-b border-line bg-surface', className)}>
      <div className='container-page py-10 sm:py-12'>
        {lead}
        {(aside !== undefined) ? (
          <div className='flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between'>
            <div>{heading}</div>
            {aside}
          </div>
        ) : heading}
        {children}
      </div>
    </div>
  );
}
