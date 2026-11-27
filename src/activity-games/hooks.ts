import { useEffect, useState, useSyncExternalStore } from 'react';

import type { FlagGameConnection, GameSnapshot } from './connection';
import type { AnyGameState, GamePlayer } from './protocol';


export function useGameSnapshot(connection: FlagGameConnection): GameSnapshot {
  return useSyncExternalStore(connection.subscribe, connection.getSnapshot);
}


// the api's clock, re-rendering every `interval` while `active`
export function useServerNow(connection: FlagGameConnection, active: boolean, interval = 100): number {
  const [ now, setNow ] = useState(() => connection.serverNow());
  useEffect(() => {
    setNow(connection.serverNow());
    if (!active) {
      return;
    }
    const timer = window.setInterval(() => setNow(connection.serverNow()), interval);
    return () => window.clearInterval(timer);
  }, [connection, active, interval]);
  return now;
}


// this machine's clock, re-rendering every `interval` while `active` (a reveal's bar: the api's `reveal.ends_at` less
// this and the skew)
export function useLocalNow(active: boolean, interval = 100): number {
  const [ now, setNow ] = useState(() => Date.now());
  useEffect(() => {
    if (!active) {
      return;
    }
    const timer = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(timer);
  }, [active, interval]);
  return now;
}


// how a flag's fetch stands: the flag it's of (another round's by now is as good as loading), and its image once loaded
type FlagLoad =
  | {url: string, status: 'loading' | 'failed', src: null}
  | {url: string, status: 'loaded', src: string};

// a round's flag, fetched by the connection (the api's needs the token). null while it loads. `retry` after `failed`
// loads again (it's loading meanwhile, not failed)
export function useFlagImage(connection: FlagGameConnection, flagUrl: string | null): {src: string | null, failed: boolean, retry: () => void} {
  const [ load, setLoad ] = useState<FlagLoad | null>(null);
  // only says "fetch again", how it's going is `load`
  const [ attempt, setAttempt ] = useState(0);
  useEffect(() => {
    if (!flagUrl) {
      return;
    }
    let alive = true;
    connection.loadFlag(flagUrl).then((src) => {
      if (alive) {
        setLoad({url: flagUrl, status: 'loaded', src});
      }
    }).catch(() => {
      if (alive) {
        setLoad({url: flagUrl, status: 'failed', src: null});
      }
    });
    return () => {
      alive = false;
    };
  }, [connection, flagUrl, attempt]);
  // nothing for this flag yet (the first render with it, or the last round's still held): loading
  const status = (load && load.url === flagUrl) ? load.status : 'loading';
  return {
    src: (load && load.url === flagUrl) ? load.src : null,
    failed: status === 'failed',
    retry: () => {
      if (flagUrl) {
        setLoad({url: flagUrl, status: 'loading', src: null});
        setAttempt((value) => value + 1);
      }
    },
  };
}


export function playerOf(game: AnyGameState, userId: string | null): GamePlayer | null {
  if (userId === null) {
    return null;
  }
  return game.players.find((player) => player.user_id === userId) ?? null;
}


// highest score first, the api's order (who joined first) breaks ties
export function rankedPlayers(game: AnyGameState): Array<GamePlayer> {
  return game.players.map((player, index) => ({player, index}))
    .sort((a, b) => b.player.score - a.player.score || a.index - b.index)
    .map(({ player }) => player);
}
