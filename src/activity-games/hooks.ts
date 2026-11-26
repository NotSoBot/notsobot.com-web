import { useEffect, useState, useSyncExternalStore } from 'react';

import type { FlagGameConnection, GameSnapshot } from './connection';
import type { GamePlayer, GameState } from './protocol';


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


// this machine's clock, re-rendering every `interval` while `active` (the reveal's own timer, the api doesn't send one)
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


// a round's flag, fetched by the connection (the api's needs the token). null while it loads
export function useFlagImage(connection: FlagGameConnection, flagUrl: string | null): {src: string | null, failed: boolean, retry: () => void} {
  const [ loaded, setLoaded ] = useState<{url: string, src: string} | null>(null);
  const [ failedUrl, setFailedUrl ] = useState<string | null>(null);
  const [ attempt, setAttempt ] = useState(0);
  useEffect(() => {
    if (!flagUrl) {
      return;
    }
    let alive = true;
    connection.loadFlag(flagUrl).then((src) => {
      if (alive) {
        setLoaded({url: flagUrl, src});
        setFailedUrl(null);
      }
    }).catch(() => {
      if (alive) {
        setFailedUrl(flagUrl);
      }
    });
    return () => {
      alive = false;
    };
  }, [connection, flagUrl, attempt]);
  return {
    src: (loaded && loaded.url === flagUrl) ? loaded.src : null,
    failed: Boolean(flagUrl) && failedUrl === flagUrl,
    retry: () => setAttempt((value) => value + 1),
  };
}


export function playerOf(game: GameState, userId: string | null): GamePlayer | null {
  if (userId === null) {
    return null;
  }
  return game.players.find((player) => player.user_id === userId) ?? null;
}


// highest score first, the api's order (who joined first) breaks ties
export function rankedPlayers(game: GameState): Array<GamePlayer> {
  return game.players.map((player, index) => ({player, index}))
    .sort((a, b) => b.player.score - a.player.score || a.index - b.index)
    .map(({ player }) => player);
}
