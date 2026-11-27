import { createContext, useContext, useEffect, useMemo, useState, type PointerEvent, type ReactNode } from 'react';

import type { EditorRoom, RoomCursor, RoomMember } from '../room';


// Live pointers of the others editing the same lobby: over the preview, over an effect tile (only for people looking
// at the same picker tab) and over a step. From the room's `cursor` events, nothing's saved


// a pointer that hasn't moved for this long is taken as gone (its "left" can be lost with a socket)
const CURSOR_STALE = 60 * 1000;
// a color per person, the same for everyone looking
const CURSOR_COLORS = ['#f04747', '#faa61a', '#43b581', '#1abc9c', '#3498db', '#9b59b6', '#e91e63', '#e67e22'];


export function cursorColor(userId: string): string {
  let hash = 0;
  for (const character of userId) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
}


interface PlacedCursor {
  member: RoomMember,
  cursor: RoomCursor,
  color: string,
}

export type CursorSend = (cursor: RoomCursor | null) => void;

// Two contexts on purpose. Everyone else's pointers change with every `cursor` message (dozens a second with a few
// people moving), and only the small parts that draw them read those. Sending your own never changes, so the picker,
// its tiles, the step list and the preview (which only send) don't re-render when someone else's pointer moves
const CursorSendContext = createContext<CursorSend | null>(null);
// everyone else's, newest move last
const CursorListContext = createContext<Array<PlacedCursor> | null>(null);


// your own pointer, for the others. null outside a group edit (the web, a solo edit in the Activity)
export function useCursorSend(): CursorSend | null {
  return useContext(CursorSendContext);
}

// the others' pointers, only for what draws them
function useCursorList(): Array<PlacedCursor> | null {
  return useContext(CursorListContext);
}


export function CursorProvider({ room, documentId, editors, children }: {
  room: EditorRoom | null,
  documentId: string,
  // this lobby's editors: a pointer stays only while its owner's one of them
  editors: Array<RoomMember>,
  children: ReactNode,
}) {
  const [ raw, setRaw ] = useState<Map<string, {cursor: RoomCursor, at: number}>>(() => new Map());

  useEffect(() => {
    if (!room) {
      return;
    }
    setRaw(new Map());
    const unsubscribe = room.subscribe((event) => {
      if (event.t !== 'cursor' || event.document_id !== documentId || event.user_id === room.you) {
        return;
      }
      setRaw((current) => {
        const next = new Map(current);
        // re-added, so the latest mover draws on top
        next.delete(event.user_id);
        if (event.cursor) {
          next.set(event.user_id, {cursor: event.cursor, at: Date.now()});
        }
        return next;
      });
    });
    const sweep = window.setInterval(() => {
      const now = Date.now();
      setRaw((current) => {
        const kept = [...current].filter(([ , value ]) => now - value.at < CURSOR_STALE);
        return (kept.length === current.size) ? current : new Map(kept);
      });
    }, 5000);
    return () => {
      unsubscribe();
      window.clearInterval(sweep);
      // theirs, for the others: gone with this editor
      room.sendCursor(null);
    };
  }, [documentId, room]);

  const send = useMemo<CursorSend | null>(() => (room) ? (cursor) => room.sendCursor(cursor) : null, [room]);
  const cursors = useMemo<Array<PlacedCursor> | null>(() => {
    if (!room) {
      return null;
    }
    const byId = new Map(editors.map((member) => [member.user_id, member]));
    const placed: Array<PlacedCursor> = [];
    for (const [ userId, { cursor } ] of raw) {
      const member = byId.get(userId);
      if (member) {
        placed.push({member, cursor, color: cursorColor(userId)});
      }
    }
    return placed;
  }, [editors, raw, room]);

  return (
    <CursorSendContext.Provider value={send}>
      <CursorListContext.Provider value={cursors}>{children}</CursorListContext.Provider>
    </CursorSendContext.Provider>
  );
}


// where on `element` the pointer is, 0-1 each way
function relative(event: PointerEvent<Element>): {x: number, y: number} | null {
  const rect = event.currentTarget.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return null;
  }
  const clamp = (value: number) => Math.round(Math.min(Math.max(value, 0), 1) * 10000) / 10000;
  return {x: clamp((event.clientX - rect.left) / rect.width), y: clamp((event.clientY - rect.top) / rect.height)};
}


// pointer handlers for the preview's media box
export function usePreviewPointer() {
  const send = useCursorSend();
  return useMemo(() => (send) ? {
    onPointerMove: (event: PointerEvent<Element>) => {
      const point = relative(event);
      if (point) {
        send({at: 'preview', ...point});
      }
    },
    onPointerLeave: () => send(null),
  } : {}, [send]);
}


// pointer handlers for an effect tile on a picker tab
export function tilePointer(send: CursorSend | null, tab: string, effect: string) {
  if (!send) {
    return {};
  }
  return {
    onPointerMove: (event: PointerEvent<Element>) => {
      const point = relative(event);
      send({at: 'picker', tab, effect, ...(point ?? {})});
    },
  };
}


function Arrow({ color, name, x, y }: {color: string, name: string, x: number, y: number}) {
  return (
    <span
      aria-hidden
      className='pointer-events-none absolute z-20 transition-[left,top] duration-75 ease-linear'
      style={{left: `${x * 100}%`, top: `${y * 100}%`}}
    >
      <svg width='16' height='18' viewBox='0 0 16 18' className='drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]'>
        <path d='M1 1 L1 15 L5 11 L8 17 L10.5 16 L7.5 10 L13 10 Z' fill={color} stroke='white' strokeWidth='1.2' strokeLinejoin='round'/>
      </svg>
      <span className='absolute top-4 left-3 max-w-28 truncate rounded px-1.5 py-0.5 text-[11px] leading-tight font-semibold whitespace-nowrap text-white' style={{backgroundColor: color}}>
        {name}
      </span>
    </span>
  );
}


// everyone's pointer over the preview, inside its (relative) media box
export function PreviewCursors() {
  const cursors = useCursorList();
  if (!cursors) {
    return null;
  }
  return (
    <>
      {cursors.map(({ member, cursor, color }) => (cursor.at === 'preview') ? (
        <Arrow key={member.user_id} color={color} name={member.username} x={cursor.x} y={cursor.y}/>
      ) : null)}
    </>
  );
}


// pointers over this tile, from people on the same tab (another tab's tiles aren't where they look on yours)
export function TileCursors({ tab, effect }: {tab: string, effect: string}) {
  const cursors = useCursorList();
  if (!cursors) {
    return null;
  }
  return (
    <>
      {cursors.map(({ member, cursor, color }) => (cursor.at === 'picker' && cursor.tab === tab && cursor.effect === effect) ? (
        <Arrow key={member.user_id} color={color} name={member.username} x={cursor.x ?? 0.5} y={cursor.y ?? 0.5}/>
      ) : null)}
    </>
  );
}


// a dot per person looking at this tab, so you can see where everyone is in the picker
export function TabDots({ tab }: {tab: string}) {
  const cursors = useCursorList();
  const here = cursors?.filter(({ cursor }) => cursor.at === 'picker' && cursor.tab === tab) ?? [];
  if (!here.length) {
    return null;
  }
  return (
    <span aria-hidden className='pointer-events-none absolute top-0.5 right-0.5 flex -space-x-1'>
      {here.slice(0, 3).map(({ member, color }) => (
        <span key={member.user_id} title={member.username} className='size-2.5 rounded-full border border-deep' style={{backgroundColor: color}}/>
      ))}
    </span>
  );
}


// who's pointing at this step, faces in their color
export function StepCursors({ stepId }: {stepId: string}) {
  const cursors = useCursorList();
  const here = cursors?.filter(({ cursor }) => cursor.at === 'step' && cursor.step_id === stepId) ?? [];
  if (!here.length) {
    return null;
  }
  return (
    <span className='flex shrink-0 -space-x-1.5' title={here.map(({ member }) => member.username).join(', ')}>
      {here.slice(0, 3).map(({ member, color }) => (
        (member.avatar_url) ? (
          <img key={member.user_id} src={member.avatar_url} alt='' className='size-5 rounded-full border-2 object-cover' style={{borderColor: color}}/>
        ) : (
          <span key={member.user_id} aria-hidden className='flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white' style={{backgroundColor: color}}>
            {member.username.charAt(0).toUpperCase()}
          </span>
        )
      ))}
    </span>
  );
}
