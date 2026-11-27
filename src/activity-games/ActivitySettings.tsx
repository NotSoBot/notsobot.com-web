import { Check, RotateCcw, Settings } from 'lucide-react';
import { useId, useState } from 'react';

import { GuideInline } from '@/components/guides/GuideBlocks';
import { forgetOpenedGuides } from '@/components/guides/GuideSheet';
import { Modal } from '@/components/ui/Modal';
import { Segmented } from '@/components/ui/Segmented';
import { Toggle } from '@/components/ui/form';
import { useActivityLanguage } from '@/editor/activityLanguage';
import { LANGUAGE_NAMES, useI18n } from '@/i18n';
import { setActivityPrefs, useActivityPrefs, type LobbyRulesPref } from '@/lib/activityPrefs';
import { cn } from '@/lib/utils';

import { forgetPlayedGames } from './howTo';


// The Activity's settings: a sheet from a gear on the start screen and the Games tab, per viewer (src/lib/activityPrefs.ts,
// saved on this device). The language isn't picked here: it follows the bot's (your NotSoBot setting, your Discord app,
// the server's setting, the server's Discord language), and the sheet says which one it came from and how to change it


// a gear that opens the sheet
export function SettingsButton({ className }: {className?: string}) {
  const { t } = useI18n();
  const [ open, setOpen ] = useState(false);
  return (
    <>
      <button
        type='button'
        aria-label={t('games.settings.open')}
        title={t('games.settings.open')}
        aria-haspopup='dialog'
        onClick={() => setOpen(true)}
        className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-fg', className)}
      >
        <Settings aria-hidden className='size-5'/>
      </button>
      {(open) ? <ActivitySettings onClose={() => setOpen(false)}/> : null}
    </>
  );
}


const LANGUAGE_SOURCES = {
  setting: 'games.settings.language_setting',
  discord: 'games.settings.language_discord',
  server_setting: 'games.settings.language_server_setting',
  server_discord: 'games.settings.language_server_discord',
  default: 'games.settings.language_default',
} as const;


export function ActivitySettings({ onClose }: {onClose: () => void}) {
  const { t } = useI18n();
  const titleId = useId();
  const prefs = useActivityPrefs();
  const { language, source } = useActivityLanguage();
  // "Show tips again" says it worked until something else changes
  const [ reset, setReset ] = useState(false);

  const rulesOptions: Array<{value: LobbyRulesPref, label: string}> = [
    {value: 'until_played', label: t('games.settings.rules_until_played')},
    {value: 'always', label: t('games.settings.rules_always')},
    {value: 'never', label: t('games.settings.rules_never')},
  ];

  return (
    <Modal anchor='top' labelledBy={titleId} onClose={onClose} className='max-w-lg'>
      <div className='flex flex-col gap-6 p-4 sm:p-6'>
        <header className='flex flex-col gap-1 pr-10'>
          <h2 id={titleId} className='font-display text-xl font-bold text-white'>{t('games.settings.title')}</h2>
          <p className='text-sm text-muted'>{t('games.settings.description')}</p>
        </header>

        <section aria-labelledby={`${titleId}-language`} className='flex flex-col gap-2'>
          <h3 id={`${titleId}-language`} className='section-label'>{t('games.settings.language')}</h3>
          <div className='flex flex-col gap-1 rounded-lg border border-line bg-surface px-4 py-3'>
            <span className='text-sm font-semibold text-white'>{LANGUAGE_NAMES[language]}</span>
            <p className='text-xs leading-relaxed text-subtle'><GuideInline text={t(LANGUAGE_SOURCES[source])}/></p>
          </div>
        </section>

        <section aria-labelledby={`${titleId}-guides`} className='flex flex-col gap-4'>
          <h3 id={`${titleId}-guides`} className='section-label'>{t('games.settings.guides')}</h3>
          <div className='flex flex-col gap-2'>
            {/* Segmented's label is for screen readers only */}
            <span aria-hidden className='text-sm font-medium text-fg'>{t('games.settings.rules')}</span>
            <Segmented
              label={t('games.settings.rules')}
              value={prefs.lobbyRules}
              options={rulesOptions}
              onChange={(value) => {
                setReset(false);
                setActivityPrefs({lobbyRules: value as LobbyRulesPref});
              }}
            />
            <p className='text-xs text-subtle'>{t(`games.settings.rules_${prefs.lobbyRules}_hint`)}</p>
          </div>
          <Toggle
            checked={prefs.guideDots}
            onChange={(guideDots) => {
              setReset(false);
              setActivityPrefs({guideDots});
            }}
            label={t('games.settings.dots')}
            description={t('games.settings.dots_hint')}
          />
          <div className='flex flex-wrap items-center gap-3'>
            <button
              type='button'
              className='btn btn-secondary btn-sm min-h-10'
              onClick={() => {
                forgetOpenedGuides();
                forgetPlayedGames();
                setReset(true);
              }}
            >
              <RotateCcw aria-hidden className='size-4'/>{t('games.settings.reset')}
            </button>
            <span role='status' className='flex items-center gap-1.5 text-xs text-success-text'>
              {(reset) ? <><Check aria-hidden className='size-3.5'/>{t('games.settings.reset_done')}</> : null}
            </span>
          </div>
        </section>

        <section aria-labelledby={`${titleId}-motion`} className='flex flex-col gap-4'>
          <h3 id={`${titleId}-motion`} className='section-label'>{t('games.settings.motion')}</h3>
          <Toggle
            checked={prefs.lessMotion}
            onChange={(lessMotion) => setActivityPrefs({lessMotion})}
            label={t('games.settings.less_motion')}
            description={t('games.settings.less_motion_hint')}
          />
        </section>
      </div>
    </Modal>
  );
}
