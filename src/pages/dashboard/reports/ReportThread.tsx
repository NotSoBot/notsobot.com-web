// The conversation on a report between the reporter and staff, shared by the user's reports page and the admin one. Staff
// are only ever "NotSoAdmin" to the reporter; the admin side also shows which staff member it was. A server's reports
// use it too, with its moderators as the staff (only ever "the moderators" to the reporter).
// Status changes are in the thread too, so it reads as the report's history. Messages are only ever rendered as plain text.

import { ArrowDown, Languages, MessagesSquare, Send } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import logo from '@/assets/logos/NotSoLogo.svg';
import { Spinner } from '@/components/ui/Spinner';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { ReportStatuses, type ReportMessage, type ReportTranslation, type User } from '@/lib/api';
import { errorMessage } from '@/lib/api/dashboardQueries';
import { userDisplayTag } from '@/lib/discord';
import { cn, formatDateTime } from '@/lib/utils';

import { ExactDate } from '../admin/adminUi';
import { CharCounter, InlineError, Skeleton } from '../ui';
import { REPORT_STAFF_NAME } from './reportLabels';


export { REPORT_STAFF_NAME };
const MAX_LENGTH = 2000;

const STATUS_VERBS: Record<number, string> = {
  [ReportStatuses.OPEN]: 'reopened',
  [ReportStatuses.RESOLVED]: 'resolved',
  [ReportStatuses.DISMISSED]: 'dismissed',
};


export function ReportThread({ viewer, reporter, messages, loading, error, onRetry, onSend, sending, notice, actions, onTranslate, staff, emptyText, placeholder: placeholderText, maxLength = MAX_LENGTH }: {
  // who's looking: the reporter sees themself as "You", staff see the reporter's name and which staff member replied
  viewer: 'staff' | 'reporter',
  reporter: Pick<User, 'id' | 'avatar' | 'discriminator' | 'username'> | null,
  messages: Array<ReportMessage> | undefined,
  loading: boolean,
  error: unknown,
  onRetry: () => void,
  // resolves when it's sent, the draft is only cleared then
  onSend: (content: string) => Promise<unknown>,
  sending: boolean,
  // shown above the reply box, e.g. that replying won't reopen it
  notice?: ReactNode,
  // next to the send button, e.g. the reporter's Reopen
  actions?: ReactNode,
  // staff only, puts a Translate button on the reporter's messages. Rejects on failure (the caller says why)
  onTranslate?: (messageId: string) => Promise<ReportTranslation>,
  // who the staff side is, NotSoAdmin with the logo by default
  staff?: {name: string, icon: ReactNode},
  // instead of the default empty thread and reply box texts
  emptyText?: string,
  placeholder?: string,
  maxLength?: number,
}) {
  const [ draft, setDraft ] = useState('');
  const content = draft.trim();
  // the conversation scrolls inside itself past `max-h-96` instead of making the modal taller. It opens at the newest
  // message; after that new ones never move you: scrolled up, a "new messages" button takes you down when you want, at
  // the bottom it just stays there. Your own replies always scroll down to them
  const listRef = useRef<HTMLOListElement>(null);
  const count = messages?.length ?? 0;
  const seen = useRef({count: 0, opened: false});
  const atBottom = useRef(true);
  const sentHere = useRef(false);
  const [ unseen, setUnseen ] = useState(0);
  const scrollToBottom = () => {
    const element = listRef.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
    atBottom.current = true;
    setUnseen(0);
  };
  // before paint, so opening it doesn't flash the oldest messages first
  useLayoutEffect(() => {
    const previous = seen.current.count;
    seen.current.count = count;
    if (!count) {
      return;
    }
    if (!seen.current.opened) {
      seen.current.opened = true;
      scrollToBottom();
    } else if (previous < count) {
      if (sentHere.current || atBottom.current) {
        scrollToBottom();
      } else {
        setUnseen((value) => value + count - previous);
      }
    }
    sentHere.current = false;
  }, [count]);
  const onListScroll = () => {
    const element = listRef.current;
    if (!element) {
      return;
    }
    // a little slack, a line's worth from the end still counts as the bottom
    atBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 24;
    if (atBottom.current) {
      setUnseen(0);
    }
  };
  const canSend = !!content && content.length <= maxLength && !sending;
  const staffName = staff?.name ?? REPORT_STAFF_NAME;

  const send = () => {
    if (!canSend) {
      return;
    }
    // the reply comes back as a new message, which scrolls down to it (set before it lands, the list can update first)
    sentHere.current = true;
    onSend(content).then(() => setDraft(''), () => {
      sentHere.current = false;
    });
  };

  const reporterName = (viewer === 'reporter') ? 'You' : (reporter) ? userDisplayTag(reporter) : 'Reporter';
  const placeholder = placeholderText ?? ((viewer === 'staff') ? `Reply to the reporter as ${staffName}...` : `Reply to ${staffName}...`);

  return (
    <section aria-label='Conversation'>
      {(loading) ? (
        <ThreadSkeleton/>
      ) : (error && !messages) ? (
        <InlineError>
          Couldn’t load the conversation: {errorMessage(error)}{' '}
          <button type='button' className='underline hover:text-fg' onClick={onRetry}>Try again</button>
        </InlineError>
      ) : (!messages?.length) ? (
        <p className='flex items-center gap-2 rounded-md border border-dashed border-line px-3 py-3 text-sm text-subtle'>
          <MessagesSquare aria-hidden className='size-4 shrink-0'/>
          {emptyText ?? ((viewer === 'staff') ? 'No replies yet. Anything you send here shows up on the reporter’s dashboard as NotSoAdmin.' : 'No replies yet. You can message the NotSoBot team about this report here.')}
        </p>
      ) : (
        <div className='relative'>
          <ol ref={listRef} onScroll={onListScroll} className='flex max-h-96 flex-col gap-3 overflow-y-auto overscroll-contain pr-1'>
            {messages.map((message) => (
              <li key={message.id}>
                {(message.content === null) ? (
                  <StatusEvent message={message} viewer={viewer} reporterName={reporterName} staffName={staffName}/>
                ) : (
                  <Message message={message} viewer={viewer} reporter={reporter} reporterName={reporterName} onTranslate={onTranslate} staffName={staffName} staffIcon={staff?.icon}/>
                )}
              </li>
            ))}
          </ol>
          {(unseen) ? (
            <button
              type='button'
              className='btn btn-primary btn-sm absolute bottom-2 left-1/2 -translate-x-1/2 shadow-lg'
              onClick={scrollToBottom}
            >
              <ArrowDown aria-hidden className='size-3.5'/>
              {unseen} new {(unseen === 1) ? 'message' : 'messages'}
            </button>
          ) : null}
        </div>
      )}

      <form
        className='mt-3'
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        {(notice) ? <p className='mb-2 text-xs text-subtle'>{notice}</p> : null}
        <textarea
          aria-label='Reply'
          className='input min-h-20 resize-y'
          rows={3}
          maxLength={maxLength}
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // ctrl/cmd+enter sends, a plain enter is a new line
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              send();
            }
          }}
        />
        <div className='mt-2 flex flex-wrap items-center justify-end gap-2'>
          {(draft.length) ? <span className='mr-auto text-xs text-subtle'><CharCounter length={draft.length} max={maxLength}/></span> : null}
          {actions}
          <button type='submit' className='btn btn-primary btn-sm' disabled={!canSend}>
            {(sending) ? <Spinner className='size-3.5 border-white/40 border-t-white'/> : <Send aria-hidden className='size-3.5'/>}
            Send
          </button>
        </div>
      </form>
    </section>
  );
}


function StaffAvatar({ className, icon }: {className?: string, icon?: ReactNode}) {
  return (
    <span aria-hidden className={cn('flex shrink-0 items-center justify-center rounded-full bg-brand/15', className)}>
      {icon ?? <img src={logo} alt='' className='size-[70%]'/>}
    </span>
  );
}


function Message({ message, viewer, reporter, reporterName, onTranslate, staffName, staffIcon }: {
  message: ReportMessage,
  viewer: 'staff' | 'reporter',
  reporter: Pick<User, 'id' | 'avatar' | 'discriminator' | 'username'> | null,
  reporterName: string,
  onTranslate?: (messageId: string) => Promise<ReportTranslation>,
  staffName: string,
  staffIcon?: ReactNode,
}) {
  const fromStaff = message.author === 'staff';
  // only kept while the thread's open, it isn't stored
  const [ translation, setTranslation ] = useState<ReportTranslation | null>(null);
  const [ translating, setTranslating ] = useState(false);
  const canTranslate = !!onTranslate && !fromStaff && !translation;
  const translate = () => {
    if (!onTranslate) {
      return;
    }
    setTranslating(true);
    onTranslate(message.id).then(setTranslation, () => {}).finally(() => setTranslating(false));
  };
  return (
    <div className={cn('flex items-start gap-2.5', (fromStaff === (viewer === 'staff')) && 'flex-row-reverse')}>
      {(fromStaff) ? (
        <StaffAvatar className='size-8' icon={staffIcon}/>
      ) : (reporter) ? (
        <UserAvatar user={reporter} size={64} loading='lazy' className='size-8 shrink-0 rounded-full bg-surface-3'/>
      ) : (
        <span aria-hidden className='size-8 shrink-0 rounded-full bg-surface-3'/>
      )}
      <div className={cn('min-w-0 max-w-[85%] rounded-lg border px-3 py-2', (fromStaff) ? 'border-brand/30 bg-brand/10' : 'border-line bg-deep')}>
        <div className='flex flex-wrap items-baseline gap-x-2 gap-y-0.5'>
          <span className='text-sm font-medium text-white'>{(fromStaff) ? staffName : reporterName}</span>
          {/* which staff member it was, the reporter never gets this */}
          {(fromStaff && viewer === 'staff' && message.author_id) ? (
            <span className='font-mono text-xs text-subtle' title={`Who sent it, the reporter only sees ${staffName}`}>{message.author_id}</span>
          ) : null}
          <span className='text-xs text-subtle'><ExactDate value={message.created} format={formatDateTime}/></span>
          {(canTranslate) ? (
            <button
              type='button'
              className='ml-auto inline-flex cursor-pointer items-center gap-1 self-center text-xs text-subtle hover:text-fg disabled:cursor-default'
              disabled={translating}
              onClick={translate}
            >
              {(translating) ? <Spinner className='size-3'/> : <Languages aria-hidden className='size-3.5'/>}
              Translate
            </button>
          ) : null}
        </div>
        <p className='mt-1 text-sm whitespace-pre-wrap break-words text-fg'>{message.content}</p>
        {(translation?.translation) ? (
          <div className='mt-2 border-t border-line pt-2'>
            <p className='text-xs text-subtle'>Translated from {translation.translation_language ?? '?'}</p>
            <p className='mt-0.5 text-sm whitespace-pre-wrap break-words text-fg'>{translation.translation}</p>
          </div>
        ) : (translation) ? (
          <p className='mt-1 text-xs text-subtle'>{(translation.translation_language === 'en') ? 'Already in English.' : 'No translation returned.'}</p>
        ) : null}
      </div>
    </div>
  );
}


function StatusEvent({ message, viewer, reporterName, staffName }: {message: ReportMessage, viewer: 'staff' | 'reporter', reporterName: string, staffName: string}) {
  const who = (message.author === 'staff') ? staffName : reporterName;
  const verb = STATUS_VERBS[message.status ?? -1] ?? 'changed';
  return (
    <p className='flex items-center gap-3 text-xs text-subtle'>
      <span aria-hidden className='h-px flex-1 bg-line'/>
      <span className='text-center'>
        <span className='text-muted'>{who}</span> {verb} this report
        {(message.author === 'staff' && viewer === 'staff' && message.author_id) ? <> (<span className='font-mono'>{message.author_id}</span>)</> : null}
        {' · '}
        <ExactDate value={message.created} format={formatDateTime}/>
      </span>
      <span aria-hidden className='h-px flex-1 bg-line'/>
    </p>
  );
}


function ThreadSkeleton() {
  return (
    <div aria-hidden className='flex flex-col gap-3'>
      {Array.from({length: 2}, (_, i) => (
        <div key={i} className={cn('flex items-start gap-2.5', i % 2 && 'flex-row-reverse')}>
          <Skeleton className='size-8 rounded-full'/>
          <Skeleton className='h-14 w-2/3 rounded-lg bg-surface-2'/>
        </div>
      ))}
    </div>
  );
}
