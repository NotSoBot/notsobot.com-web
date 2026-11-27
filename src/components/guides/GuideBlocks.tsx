// Renders a guide's data (src/content/guides): its quick rules and its sections' blocks. The site's guide pages use it,
// and the Activity's "How to play" sheet can too: nothing here needs the router, links go through `renderLink` so each
// host decides what a `/path` or a `guide:<slug>` link does (the site navigates, the sheet switches guides).
import { Lightbulb } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';

import type { GuideBlock, GuideSection } from '@/content/guides';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';


export type GuideLinkRenderer = (href: string, children: ReactNode) => ReactNode;

// without a host's renderer, `guide:` links are plain text (there's nowhere to go) and paths are ordinary links
const plainLink: GuideLinkRenderer = (href, children) => {
  if (href.startsWith('guide:')) {
    return children;
  }
  return <a href={href} className='font-medium text-brand-text underline-offset-4 hover:underline'>{children}</a>;
};


const INLINE_PATTERN = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

// `code`, **bold** and [label](href), the guides' whole markup
export function GuideInline({ text, renderLink = plainLink }: {text: string, renderLink?: GuideLinkRenderer}) {
  return (
    <>
      {text.split(INLINE_PATTERN).map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`') && 2 < part.length) {
          // short ones (a command, the `F _ _ _` letters hint) stay on one line, long ones may wrap on phones
          const code = part.slice(1, -1);
          return <code key={i} className={cn('rounded bg-deep box-decoration-clone px-1.5 py-0.5 font-mono text-[0.85em] text-code', code.length <= 28 && 'whitespace-nowrap')}>{code}</code>;
        }
        if (part.startsWith('**') && part.endsWith('**') && 4 < part.length) {
          return <strong key={i} className='font-semibold text-white'>{part.slice(2, -2)}</strong>;
        }
        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link) {
          return <Fragment key={i}>{renderLink(link[2], <GuideInline text={link[1]}/>)}</Fragment>;
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}


// the short version, a numbered card. `compact` pads it less, for a narrow sheet
export function GuideQuickRules({ rules, renderLink, compact = false, className }: {
  rules: ReadonlyArray<string>,
  renderLink?: GuideLinkRenderer,
  compact?: boolean,
  className?: string,
}) {
  const { t } = useI18n();
  return (
    <section aria-label={t('guides.quick_rules')} className={cn('rounded-lg border border-line border-l-[3px] border-l-brand bg-surface', (compact) ? 'p-4' : 'p-5 sm:p-6', className)}>
      <h2 className='section-label mb-3'>{t('guides.quick_rules')}</h2>
      <ol className='space-y-2.5'>
        {rules.map((rule, i) => (
          <li key={i} className='flex gap-3 leading-relaxed text-fg'>
            <span aria-hidden className='mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/20 text-xs font-semibold text-brand-text tabular-nums'>{i + 1}</span>
            <span className='min-w-0'><GuideInline text={rule} renderLink={renderLink}/></span>
          </li>
        ))}
      </ol>
    </section>
  );
}


export function GuideBlocks({ blocks, renderLink }: {blocks: ReadonlyArray<GuideBlock>, renderLink?: GuideLinkRenderer}) {
  const { t } = useI18n();
  return (
    <div className='space-y-4 leading-relaxed text-fg'>
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'text':
            return <p key={i}><GuideInline text={block.text} renderLink={renderLink}/></p>;
          case 'list':
            return (
              <ul key={i} className='space-y-2 pl-1'>
                {block.items.map((item, j) => (
                  <li key={j} className='flex gap-2.5'>
                    <span aria-hidden className='mt-2.5 size-1.5 shrink-0 rounded-full bg-brand'/>
                    <span className='min-w-0'><GuideInline text={item} renderLink={renderLink}/></span>
                  </li>
                ))}
              </ul>
            );
          case 'steps':
            return (
              <ol key={i} className='space-y-2.5'>
                {block.items.map((item, j) => (
                  <li key={j} className='flex gap-3'>
                    <span aria-hidden className='mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-line-strong bg-surface-2 text-xs font-semibold text-white tabular-nums'>{j + 1}</span>
                    <span className='min-w-0'><GuideInline text={item} renderLink={renderLink}/></span>
                  </li>
                ))}
              </ol>
            );
          case 'facts':
            // a two column table from `sm` up, label over value on phones
            return (
              <dl key={i} className='overflow-hidden rounded-lg border border-line bg-surface'>
                {block.items.map((item, j) => (
                  <div key={j} className={cn('grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:gap-4', 0 < j && 'border-t border-line')}>
                    <dt className='font-medium text-white'><GuideInline text={item.label} renderLink={renderLink}/></dt>
                    <dd className='min-w-0 text-fg'><GuideInline text={item.value} renderLink={renderLink}/></dd>
                  </div>
                ))}
              </dl>
            );
          case 'tip':
            return (
              <aside key={i} className='flex gap-3 rounded-lg border border-line-strong bg-surface-2/60 p-4 text-sm'>
                <Lightbulb aria-hidden className='mt-0.5 size-4 shrink-0 text-warning'/>
                <p className='min-w-0'>
                  <span className='sr-only'>{t('guides.tip')}: </span>
                  <GuideInline text={block.text} renderLink={renderLink}/>
                </p>
              </aside>
            );
        }
      })}
    </div>
  );
}


// a section with its heading. The section's id is its anchor, so links like `#scoring` land on it
export function GuideSectionView({ section, renderLink, className }: {
  section: GuideSection,
  renderLink?: GuideLinkRenderer,
  className?: string,
}) {
  return (
    <section id={section.id} aria-labelledby={`${section.id}-title`} className={cn('scroll-mt-24', className)}>
      <h2 id={`${section.id}-title`} className='mb-3 text-xl font-semibold text-white'>{section.title}</h2>
      <GuideBlocks blocks={section.blocks} renderLink={renderLink}/>
    </section>
  );
}
