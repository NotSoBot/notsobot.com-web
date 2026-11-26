import { GitFork } from 'lucide-react';
import { useId, useState } from 'react';

import { DialogError } from '@/components/ui/DialogError';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useI18n } from '@/i18n';

import type { EditorHost } from '../api';
import type { useEditorDocument } from '../useEditorDocument';
import { RoomSettingsFields, roomSettingsReady, type LobbyMode } from './RoomSettings';


// "Fork": the media and its steps as they are now, into a new room (or their own edit), with its own settings
function ForkDialog({ host, state, onClose }: {host: EditorHost, state: ReturnType<typeof useEditorDocument>, onClose: () => void}) {
  const { t, plural } = useI18n();
  const titleId = useId();
  const document = state.document!;
  // what it forks from: a password room stays one unless they change it, an edit of their own becomes a public room
  const [ mode, setMode ] = useState<LobbyMode>((document.locked) ? 'password' : 'public');
  const [ name, setName ] = useState(document.lobby_name ?? '');
  const [ password, setPassword ] = useState('');
  // a fork of a watch-only room is one too unless they change it
  const [ watchOnly, setWatchOnly ] = useState(Boolean(document.watch_only));
  const [ pending, setPending ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);
  const ready = roomSettingsReady(mode, password);

  const fork = async () => {
    setPending(true);
    setError(null);
    try {
      // the steps on screen, once every edit has saved
      if (!await state.whenSaved()) {
        throw new Error(t('editor.render.unsaved'));
      }
      await host.fork!({...document, steps: state.steps}, {mode, name, password, watchOnly});
    } catch (failure) {
      setError(host.errorOf(failure)?.message || ((failure instanceof Error) ? failure.message : t('editor.session.failed')));
      setPending(false);
    }
  };

  return (
    <Modal labelledBy={titleId} onClose={() => !pending && onClose()} className='max-w-md'>
      <form
        className='flex flex-col gap-4 p-5 sm:p-6'
        onSubmit={(event) => {
          event.preventDefault();
          if (ready && !pending) {
            void fork();
          }
        }}
      >
        <div>
          <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>{t('editor.fork.title')}</h2>
          <p className='mt-2 text-sm text-muted'>{plural('editor.fork.description', state.steps.length)}</p>
        </div>
        <RoomSettingsFields mode={mode} onModeChange={setMode} name={name} onNameChange={setName} password={password} onPasswordChange={setPassword} watchOnly={watchOnly} onWatchOnlyChange={setWatchOnly}/>
        {(error) ? <DialogError>{error}</DialogError> : null}
        <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={pending}>{t('common.cancel')}</button>
          <button type='submit' className='btn btn-primary' disabled={!ready || pending}>
            {(pending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : <GitFork aria-hidden className='size-4'/>}
            {t('editor.fork.create')}
          </button>
        </div>
      </form>
    </Modal>
  );
}


export function ForkButton({ host, state }: {host: EditorHost, state: ReturnType<typeof useEditorDocument>}) {
  const { t } = useI18n();
  const [ open, setOpen ] = useState(false);
  return (
    <>
      <button
        type='button'
        disabled={!state.document}
        aria-label={t('editor.fork.button')}
        title={t('editor.fork.button')}
        onClick={() => setOpen(true)}
        className='inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-muted hover:bg-surface hover:text-fg disabled:cursor-not-allowed disabled:opacity-40'
      >
        <GitFork aria-hidden className='size-4'/>
        <span className='hidden sm:inline'>{t('editor.fork.button')}</span>
      </button>
      {(open && state.document) ? <ForkDialog host={host} state={state} onClose={() => setOpen(false)}/> : null}
    </>
  );
}

