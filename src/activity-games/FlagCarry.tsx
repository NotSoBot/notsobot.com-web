import { Flag, List, Play } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { useI18n } from '@/i18n';


// the in-chat Flag Guesser they pressed Open in Activity on (the api's `launch.flag_game`): its difficulty, and whether
// a flag was still up there. The flag itself is only an image from the api, its code (the answer) never comes here
export interface CarriedFlagGame {
  difficulty: 'easy' | 'medium' | 'hard',
  has_flag: boolean,
}

// what a room continuing it plays (the api's `carried_settings`): typed like in chat, 60 seconds a flag like the chat's
// three hints of 20, ten flags
const CARRIED_ROUNDS = 10;
const CARRIED_SECONDS = 60;


export function carriedFlagGameOf(launch: Record<string, unknown> | null | undefined): CarriedFlagGame | null {
  const value = launch?.flag_game;
  if (!value || typeof value !== 'object') {
    return null;
  }
  const { difficulty, has_flag } = value as Record<string, unknown>;
  if (difficulty !== 'easy' && difficulty !== 'medium' && difficulty !== 'hard') {
    return null;
  }
  return {difficulty, has_flag: has_flag === true};
}


// Open in Activity on the in-chat Flag Guesser lands here instead of the room list: the flag that was up in chat and
// the game's settings, Open a room makes a room playing it (that flag first) and goes into its lobby, where everyone in
// the Activity can join or watch before its creator starts. Offered once, the room list is a button away
export function FlagCarry({ carry, loadFlag, onStart, onRooms }: {
  carry: CarriedFlagGame,
  // the flag's image as an object url (null when it can't be had)
  loadFlag: () => Promise<string | null>,
  // makes the room and goes into it, a rejection's message is shown
  onStart: () => Promise<void>,
  onRooms: () => void,
}) {
  const { t, plural } = useI18n();
  const [ flagUrl, setFlagUrl ] = useState<string | null>(null);
  const [ flagState, setFlagState ] = useState<'loading' | 'shown' | 'none'>((carry.has_flag) ? 'loading' : 'none');
  const [ starting, setStarting ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);

  useEffect(() => {
    if (!carry.has_flag) {
      return;
    }
    let alive = true;
    let url: string | null = null;
    loadFlag().then((result) => {
      if (!alive) {
        // left before it came: the cleanup had nothing to let go of yet
        if (result) {
          URL.revokeObjectURL(result);
        }
        return;
      }
      url = result;
      setFlagUrl(result);
      setFlagState((result) ? 'shown' : 'none');
    }).catch(() => {
      if (alive) {
        setFlagState('none');
      }
    });
    return () => {
      alive = false;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [carry.has_flag, loadFlag]);

  const start = async () => {
    setStarting(true);
    setError(null);
    try {
      await onStart();
    } catch (failure) {
      setError((failure instanceof Error && failure.message) ? failure.message : t('games.carry.failed'));
      setStarting(false);
    }
  };

  return (
    <div className='mx-auto flex min-h-[var(--editor-height,100dvh)] w-full max-w-md flex-col justify-center gap-5 px-4 py-8'>
      <header className='flex flex-col gap-1.5'>
        <p className='flex items-center gap-1.5 text-xs font-semibold tracking-wide text-success-text uppercase'>
          <Flag aria-hidden className='size-3.5'/>{t('games.flag.title')}
        </p>
        <h1 className='font-display text-2xl font-bold text-white sm:text-3xl'>{t('games.carry.title')}</h1>
        <p className='text-sm text-muted'>{(carry.has_flag) ? t('games.carry.description_flag') : t('games.carry.description')}</p>
      </header>

      {/* the same height loading, shown or without a flag, so nothing below moves when it comes */}
      <div className='flex h-52 items-center justify-center overflow-hidden rounded-2xl border border-line-strong bg-surface p-4'>
        {(flagState === 'shown' && flagUrl) ? (
          <img src={flagUrl} alt={t('games.carry.flag_alt')} className='max-h-full max-w-full rounded-md object-contain shadow-lg'/>
        ) : (flagState === 'loading') ? (
          <Spinner/>
        ) : (
          <span className='flex flex-col items-center gap-2 text-center text-sm text-muted'>
            <Flag aria-hidden className='size-10 text-success-text/60'/>
            {t('games.carry.new_flag')}
          </span>
        )}
      </div>

      <ul className='flex flex-wrap gap-1.5 text-xs font-medium text-muted' aria-label={t('games.carry.settings')}>
        {[
          t('games.flag.settings_mode_type'),
          t(`games.flag.settings_difficulty_${carry.difficulty}`),
          t('games.carry.seconds', {seconds: CARRIED_SECONDS}),
          plural('games.rooms.flags', CARRIED_ROUNDS),
        ].map((label) => (
          <li key={label} className='rounded-full border border-line bg-surface px-2.5 py-1'>{label}</li>
        ))}
      </ul>

      {(error) ? <p role='alert' className='rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger-text'>{error}</p> : null}

      <div className='flex flex-col gap-2 sm:flex-row'>
        <button type='button' className='btn btn-primary flex-1' disabled={starting} onClick={start}>
          {(starting) ? <Spinner className='size-4'/> : <Play aria-hidden className='size-4'/>}{t('games.carry.start')}
        </button>
        <button type='button' className='btn btn-secondary' disabled={starting} onClick={onRooms}>
          <List aria-hidden className='size-4'/>{t('games.carry.rooms')}
        </button>
      </div>
      <p className='text-xs text-subtle'>{t('games.carry.note')}</p>
    </div>
  );
}
