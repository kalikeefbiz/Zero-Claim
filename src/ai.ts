import {
  applyAction,
  legalActions,
  scores,
  type Action,
  type Game,
  type Player,
} from "./engine";

/** Exact minimax to the next capture, including every remaining rewind response.
 * No depth cutoff inside a resolution. Each rewind spends a finite charge, so
 * the search terminates. A per-decision transposition cache bounds the work.
 * Score is zero-sum; a charge has option value for later, more valuable claims.
 */
export function chooseAction(game: Game): Action {
  const actions = legalActions(game);
  if (!actions.length) throw new Error("Cannot act in a finished match");
  const cache = new Map<string, number>();
  const perspective: Player = game.turn;
  function evaluate(g: Game): number {
    if (g.winner !== null) return g.winner === perspective ? 10000 : -10000;
    const s = scores(g);
    const rival = perspective === 0 ? 1 : 0;
    // Charges become less valuable as the match runs out, and have no reserve
    // value in sudden death. This avoids hoarding them through the final claim.
    const reserve = g.suddenDeath
      ? 0
      : 1.65 * Math.min(1, (12 - g.captures) / 3);
    return (
      s[perspective] -
      s[rival] +
      reserve * (g.charges[perspective] - g.charges[rival])
    );
  }
  function search(g: Game): number {
    if (g.captures > game.captures || g.winner !== null) return evaluate(g);
    const key = `${g.core}/${g.countdown}/${g.turn}/${g.charges[0]}/${g.charges[1]}`;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const maximizing = g.turn === perspective;
    let best = maximizing ? -Infinity : Infinity;
    for (const a of legalActions(g)) {
      const value = search(applyAction(g, a));
      best = maximizing ? Math.max(best, value) : Math.min(best, value);
    }
    cache.set(key, best);
    return best;
  }
  // Stable order and strict comparison keep choices reproducible. Equal moves
  // prefer conserving a rewind; shifts explore clockwise from north.
  let best = -Infinity;
  let chosen = actions[0];
  for (const action of actions) {
    const value = search(applyAction(game, action));
    if (value > best) {
      best = value;
      chosen = action;
    }
  }
  return chosen;
}
