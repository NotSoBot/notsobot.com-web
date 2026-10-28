import { Calendar, Mail, type LucideIcon } from 'lucide-react';

import { Urls } from '@/config';
import type { LegalDocument } from '@/content/legal';
import { DEFAULT_LANGUAGE, useI18n } from '@/i18n';


function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}


export function LegalPage({ document, icon: Icon }: {document: LegalDocument, icon: LucideIcon}) {
  const { t, rich, language } = useI18n();
  return (
    <div className='mx-auto max-w-4xl px-4 py-8 sm:px-6'>
      <header className='card mb-6 p-8'>
        <div className='mb-4 flex items-center gap-3'>
          <Icon className='size-10 shrink-0 text-brand-text'/>
          <h1 className='text-3xl font-bold text-white sm:text-4xl'>{document.title}</h1>
        </div>
        <div className='flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted'>
          <span className='flex items-center gap-2'><Calendar className='size-4'/>{t('legal.effective', {date: document.effective})}</span>
          <span className='flex items-center gap-2'><Calendar className='size-4'/>{t('legal.updated', {date: document.lastUpdated})}</span>
        </div>
        {(language === DEFAULT_LANGUAGE) ? null : <p className='mt-4 text-sm text-subtle'>{t('legal.english_only')}</p>}
        {(document.intro) ? <p className='mt-4 text-fg' lang={DEFAULT_LANGUAGE}>{document.intro}</p> : null}
      </header>

      <div className='space-y-6' lang={DEFAULT_LANGUAGE}>
        {document.sections.map((section) => (
          <section key={section.title} id={slugify(section.title)} className='card scroll-mt-24 p-6'>
            <h2 className='mb-4 text-2xl font-bold text-white'>{section.title}</h2>
            <div className='prose-legal'>
              {section.blocks.map((block, i) => (
                (block.type === 'paragraph') ? (
                  <p key={i}>{block.text}</p>
                ) : (
                  <ul key={i}>
                    {block.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                )
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className='mt-6 flex items-center gap-3 rounded-lg border border-brand/30 bg-brand/10 p-6'>
        <Mail className='size-5 shrink-0 text-brand-text'/>
        <p className='text-sm'>
          {rich('legal.questions', {email: (chunk) => <a href={`mailto:${chunk}`} className='text-brand-text hover:underline'>{chunk}</a>}, {email: Urls.CONTACT_EMAIL})}
        </p>
      </div>
    </div>
  );
}
