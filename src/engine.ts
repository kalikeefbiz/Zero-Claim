/** Pure deterministic rules. Rendering and AI both use these exact transitions. */
export type Player = 0 | 1;
export type Owner = Player | null;
export type Action =
  { type: "shift"; to: number } | { type: "hold" } | { type: "rewind" };
export interface Capture {
  tile: number;
  player: Player;
  previous: Owner;
  number: number;
}
export interface Game {
  owners: Owner[];
  values: number[];
  core: number;
  countdown: number;
  turn: Player;
  charges: [number, number];
  captures: number;
  seed: number;
  winner: Owner;
  suddenDeath: boolean;
  lastCapture: Capture | null;
  moves: number;
}
export const SIZE = 6;
export const CAPTURE_LIMIT = 12;
export const other = (p: Player): Player => (p === 0 ? 1 : 0);
export const coordinate = (i: number) =>
  `${"ABCDEF"[i % SIZE]}${Math.floor(i / SIZE) + 1}`;
export function neighbors(i: number): number[] {
  if (!Number.isInteger(i) || i < 0 || i >= 36) return [];
  const n: number[] = [];
  if (i >= SIZE) n.push(i - SIZE);
  if (i % SIZE < SIZE - 1) n.push(i + 1);
  if (i < SIZE * (SIZE - 1)) n.push(i + SIZE);
  if (i % SIZE > 0) n.push(i - 1);
  return n;
}
function random(seed: number): [number, number] {
  const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return [next / 4294967296, next];
}
function relocate(owners: Owner[], seed: number): [number, number] {
  const free = owners.flatMap((o, i) => (o === null ? [i] : []));
  // At most 13 captures: an unclaimed cell always exists in a valid match.
  if (!free.length) throw new Error("No unclaimed cells");
  const [r, next] = random(seed);
  return [free[Math.floor(r * free.length)], next];
}
export function newGame(seed = Date.now() >>> 0): Game {
  // Rotational symmetry prevents one starting side receiving better territory.
  const values = Array<number>(36).fill(1);
  let s = seed >>> 0;
  const pairs = Array.from({ length: 18 }, (_, i) => i);
  for (let i = pairs.length - 1; i > 0; i--) {
    const [r, next] = random(s);
    s = next;
    const j = Math.floor(r * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  pairs.slice(0, 8).forEach((p, i) => {
    values[p] = values[35 - p] = i < 3 ? 3 : 2;
  });
  const owners = Array<Owner>(36).fill(null);
  const [core, next] = relocate(owners, s);
  return {
    owners,
    values,
    core,
    countdown: 3,
    turn: 0,
    charges: [2, 2],
    captures: 0,
    seed: next,
    winner: null,
    suddenDeath: false,
    lastCapture: null,
    moves: 0,
  };
}
export function scores(g: Pick<Game, "owners" | "values">): [number, number] {
  const total: [number, number] = [0, 0];
  g.owners.forEach((owner, i) => {
    if (owner === null) return;
    total[owner] += g.values[i];
    // Each same-owner orthogonal edge contributes exactly one point.
    if (i % SIZE < SIZE - 1 && g.owners[i + 1] === owner) total[owner]++;
    if (i < 30 && g.owners[i + SIZE] === owner) total[owner]++;
  });
  return total;
}
export function legalActions(g: Game): Action[] {
  if (g.winner !== null) return [];
  return [
    ...neighbors(g.core).map((to) => ({ type: "shift" as const, to })),
    { type: "hold" as const },
    ...(g.charges[g.turn] > 0 ? [{ type: "rewind" as const }] : []),
  ];
}
export function isLegal(g: Game, action: Action): boolean {
  if (g.winner !== null) return false;
  if (action.type === "shift") return neighbors(g.core).includes(action.to);
  if (action.type === "rewind") return g.charges[g.turn] > 0;
  return action.type === "hold";
}
export function applyAction(g: Game, action: Action): Game {
  if (!isLegal(g, action)) throw new Error("Illegal action");
  const next: Game = {
    ...g,
    owners: [...g.owners],
    charges: [...g.charges],
    turn: other(g.turn),
    moves: g.moves + 1,
    lastCapture: null,
  };
  if (action.type === "rewind") {
    next.charges[g.turn]--;
    next.countdown = 4;
    return next;
  }
  if (action.type === "shift") next.core = action.to;
  next.countdown--;
  if (next.countdown > 0) return next;
  next.lastCapture = {
    tile: next.core,
    player: g.turn,
    previous: next.owners[next.core],
    number: g.captures + 1,
  };
  next.owners[next.core] = g.turn;
  next.captures++;
  const [you, cpu] = scores(next);
  if (g.suddenDeath) next.winner = g.turn;
  else if (next.captures === CAPTURE_LIMIT) {
    if (you !== cpu) next.winner = you > cpu ? 0 : 1;
    else next.suddenDeath = true;
  }
  if (next.winner === null) {
    [next.core, next.seed] = relocate(next.owners, next.seed);
    next.countdown = 3;
  }
  return next;
}
