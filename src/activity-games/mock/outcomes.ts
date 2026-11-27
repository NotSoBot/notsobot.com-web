import type { GameOutcome, GamePlayer } from '../protocol';


// Dev mocks only: each player's `outcome` at a game's end like the api's (game-stats-plan.md "What counts"). Everyone
// counts (the mocks have no late joiners), a disconnected player has left, a solo room (or one player) is `solo`, and
// among the rest the top score alone wins, a shared one ties
export function withOutcomes(players: Array<GamePlayer>, solo: boolean): Array<GamePlayer> {
  if (solo || players.length < 2) {
    return players.map((player) => ({...player, outcome: 'solo'}));
  }
  const here = players.filter((player) => player.connected);
  const top = Math.max(...here.map((player) => player.score));
  const tied = here.filter((player) => player.score === top).length > 1;
  return players.map((player) => {
    const outcome: GameOutcome = (!player.connected) ? 'left' : (player.score < top) ? 'loss' : (tied) ? 'tie' : 'win';
    return {...player, outcome};
  });
}
