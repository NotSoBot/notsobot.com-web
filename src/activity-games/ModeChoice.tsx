import { ChevronRight, Gamepad2, Wand2, type LucideIcon } from 'lucide-react';

import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';


// What the Activity opens on (after sign-in) from Discord's app launcher: the media editor or the flag game. Launches
// with media or a template skip it for a new edit, `/editor` for the editor's rooms and `/games` for the game rooms
// (src/editor/hosts/activityLaunch.ts). Everyone in the activity picks for themselves and can come back here any time.
// `notice`: why they're here instead (a room invite that couldn't be opened)
export function ModeChoice({ onEdit, onGame, notice }: {onEdit: () => void, onGame: () => void, notice?: string | null}) {
  const { t } = useI18n();
  return (
    <div className='mx-auto flex min-h-[var(--editor-height,100dvh)] w-full max-w-3xl flex-col justify-center gap-6 px-4 py-8'>
      <header className='flex flex-col gap-2'>
        <h1 className='font-display text-3xl font-bold text-white sm:text-4xl'>{t('games.choice.title')}</h1>
        <p className='text-muted'>{t('games.choice.description')}</p>
      </header>
      {(notice) ? <p role='status' className='rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning'>{notice}</p> : null}
      <div className='grid gap-3 sm:grid-cols-2'>
        <ChoiceCard
          icon={Wand2}
          accent='bg-brand/20 text-brand-text'
          title={t('games.choice.edit_title')}
          description={t('games.choice.edit_description')}
          onClick={onEdit}
        />
        <ChoiceCard
          icon={Gamepad2}
          accent='bg-success/20 text-success-text'
          title={t('games.choice.games_title')}
          description={t('games.choice.games_description')}
          onClick={onGame}
        />
      </div>
    </div>
  );
}


function ChoiceCard({ icon: Icon, accent, title, description, onClick }: {
  icon: LucideIcon,
  accent: string,
  title: string,
  description: string,
  onClick: () => void,
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='group flex min-h-32 w-full items-center gap-4 rounded-2xl border border-line-strong bg-surface p-5 text-left transition-colors hover:border-brand hover:bg-surface-2 active:bg-surface-3 sm:min-h-44 sm:flex-col sm:items-start'
    >
      <span className={cn('flex size-14 shrink-0 items-center justify-center rounded-xl', accent)}>
        <Icon aria-hidden className='size-7'/>
      </span>
      <span className='flex min-w-0 flex-1 flex-col gap-1'>
        <span className='font-display text-xl font-bold text-white'>{title}</span>
        <span className='text-sm text-muted'>{description}</span>
      </span>
      <ChevronRight aria-hidden className='size-5 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 sm:hidden'/>
    </button>
  );
}
