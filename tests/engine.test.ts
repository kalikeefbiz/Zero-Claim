import { describe, it, expect } from "vitest";
import {
  applyAction,
  coordinate,
  isLegal,
  legalActions,
  neighbors,
  newGame,
  scores,
  type Game,
  type Player,
} from "../src/engine";
import { chooseAction } from "../src/ai";

const fixture = (overrides: Partial<Game> = {}): Game => ({
  ...newGame(10),
  ...overrides,
});
const own = (cells: [number, Player][]) => {
  const result: Game["owners"] = Array(36).fill(null);
  cells.forEach(([i, p]) => {
    result[i] = p;
  });
  return result;
};
describe("field and determinism", () => {
  it("creates a reproducible 6×6 field with symmetric printed values and two charges each", () => {
    const a = newGame(123);
    expect(a).toEqual(newGame(123));
    expect(a.owners).toHaveLength(36);
    expect(a.charges).toEqual([2, 2]);
    expect(a.countdown).toBe(3);
    expect(a.turn).toBe(0);
    a.values.forEach((v, i) => {
      expect(v).toBe(a.values[35 - i]);
      expect([1, 2, 3]).toContain(v);
    });
  });
  it("varies starting fields across seeds", () => {
    expect(newGame(1)).not.toEqual(newGame(2));
  });
  it("labels coordinates correctly", () => {
    expect(coordinate(0)).toBe("A1");
    expect(coordinate(35)).toBe("F6");
  });
  it.each([
    [0, [1, 6]],
    [5, [11, 4]],
    [30, [24, 31]],
    [35, [29, 34]],
    [14, [8, 15, 20, 13]],
  ])("bounds neighbors at %i", (index, expected) => {
    expect(neighbors(index as number)).toEqual(expected);
  });
  it("never wraps horizontal moves or accepts out-of-range indices", () => {
    expect(isLegal(fixture({ core: 5 }), { type: "shift", to: 6 })).toBe(false);
    for (const to of [-1, 36, 1.5, NaN])
      expect(isLegal(fixture({ core: 0 }), { type: "shift", to })).toBe(false);
    expect(neighbors(-1)).toEqual([]);
  });
});
describe("actions and captures", () => {
  it("SHIFT changes one cell and decrements countdown, alternating actor", () => {
    const g = fixture({ core: 14 });
    const n = applyAction(g, { type: "shift", to: 15 });
    expect(n.core).toBe(15);
    expect(n.countdown).toBe(2);
    expect(n.turn).toBe(1);
    expect(n.moves).toBe(1);
    expect(g.core).toBe(14);
    expect(g.countdown).toBe(3);
  });
  it("HOLD decrements on the same cell", () => {
    const g = fixture();
    const n = applyAction(g, { type: "hold" });
    expect(n.core).toBe(g.core);
    expect(n.countdown).toBe(2);
  });
  it("REWIND sets exactly four and consumes only the acting player’s charge and turn", () => {
    const n = applyAction(fixture({ countdown: 1, turn: 1 }), {
      type: "rewind",
    });
    expect(n.countdown).toBe(4);
    expect(n.charges).toEqual([2, 1]);
    expect(n.turn).toBe(0);
    expect(n.captures).toBe(0);
  });
  it("exhausted charges cannot be used or regenerated", () => {
    let g = fixture({ charges: [1, 0] });
    g = applyAction(g, { type: "rewind" });
    g = applyAction(g, { type: "hold" });
    expect(g.charges).toEqual([0, 0]);
    expect(legalActions(g).some((a) => a.type === "rewind")).toBe(false);
    expect(() => applyAction(g, { type: "rewind" })).toThrow("Illegal action");
  });
  it("rejects illegal actions without mutating input", () => {
    const g = fixture({ core: 0 });
    const before = structuredClone(g);
    expect(() => applyAction(g, { type: "shift", to: 35 })).toThrow();
    expect(g).toEqual(before);
  });
  it("actor of zero claims the destination, resets to three, relocates unclaimed and passes turn", () => {
    const g = fixture({ core: 14, countdown: 1, turn: 1 });
    const n = applyAction(g, { type: "shift", to: 15 });
    expect(n.owners[15]).toBe(1);
    expect(n.captures).toBe(1);
    expect(n.turn).toBe(0);
    expect(n.countdown).toBe(3);
    expect(n.owners[n.core]).toBeNull();
    expect(n.lastCapture).toEqual({
      tile: 15,
      player: 1,
      previous: null,
      number: 1,
    });
    expect(g.owners[15]).toBeNull();
  });
  it("captures enemy territory and recalculates both scores including broken shared edges", () => {
    const g = fixture({
      core: 7,
      countdown: 1,
      turn: 0,
      values: Array(36).fill(1),
      owners: own([
        [6, 1],
        [7, 1],
        [8, 1],
        [1, 0],
      ]),
    });
    expect(scores(g)).toEqual([1, 5]);
    const n = applyAction(g, { type: "hold" });
    expect(n.owners[7]).toBe(0);
    expect(scores(n)).toEqual([3, 2]);
    expect(n.lastCapture?.previous).toBe(1);
  });
  it("counts a recapture resolution but never duplicates ownership points", () => {
    const g = fixture({ core: 0, countdown: 1, owners: own([[0, 0]]) });
    const before = scores(g);
    const n = applyAction(g, { type: "hold" });
    expect(n.captures).toBe(1);
    expect(scores(n)).toEqual(before);
  });
  it("rewind can change capture parity", () => {
    let g = fixture({ core: 14, countdown: 2, turn: 0 });
    g = applyAction(g, { type: "rewind" });
    for (let i = 0; i < 4; i++) g = applyAction(g, { type: "hold" });
    expect(g.lastCapture?.player).toBe(0);
    expect(g.turn).toBe(1);
  });
  it("relocation stays legal across many complete matches", () => {
    for (let seed = 0; seed < 100; seed++) {
      let g = newGame(seed);
      let steps = 0;
      while (g.winner === null && steps++ < 100) {
        g = applyAction(g, { type: "hold" });
        if (g.lastCapture && g.winner === null)
          expect(g.owners[g.core]).toBeNull();
      }
      expect(g.winner).not.toBeNull();
      expect(g.captures).toBeGreaterThanOrEqual(12);
      expect(g.captures).toBeLessThanOrEqual(13);
    }
  });
});
describe("scoring and end conditions", () => {
  it("scores isolated values and each shared orthogonal edge exactly once", () => {
    const g = fixture({
      values: Array(36).fill(2),
      owners: own([
        [0, 0],
        [1, 0],
        [6, 0],
        [7, 0],
        [35, 1],
      ]),
    });
    expect(scores(g)).toEqual([12, 2]);
  });
  it("ignores diagonal adjacency and row wrapping", () => {
    expect(
      scores(
        fixture({
          values: Array(36).fill(1),
          owners: own([
            [5, 0],
            [6, 0],
            [13, 0],
          ]),
        }),
      ),
    ).toEqual([3, 0]);
  });
  it.each([0, 1] as const)(
    "declares operator %i the winner by territory after twelve and forbids further actions",
    (p) => {
      const g = fixture({
        captures: 11,
        countdown: 1,
        turn: p,
        core: 14,
        values: Array(36).fill(1),
        owners: own([
          [30, p],
          [31, p],
        ]),
      });
      const n = applyAction(g, { type: "hold" });
      expect(n.winner).toBe(p);
      expect(n.captures).toBe(12);
      expect(legalActions(n)).toEqual([]);
      expect(() => applyAction(n, { type: "hold" })).toThrow();
    },
  );
  it("enters sudden death at a tie, and the next capture definitively wins", () => {
    let g = fixture({
      captures: 11,
      countdown: 1,
      turn: 0,
      core: 0,
      owners: own([[35, 1]]),
      values: Array(36).fill(1),
    });
    g = applyAction(g, { type: "hold" });
    expect(scores(g)).toEqual([1, 1]);
    expect(g.suddenDeath).toBe(true);
    expect(g.winner).toBeNull();
    expect(g.countdown).toBe(3);
    expect(g.turn).toBe(1);
    for (let i = 0; i < 3; i++) g = applyAction(g, { type: "hold" });
    expect(g.winner).toBe(1);
    expect(g.captures).toBe(13);
  });
  it("a new match clears territory and restores charges without touching its predecessor", () => {
    const g = applyAction(fixture(), { type: "rewind" });
    const n = newGame(10);
    expect(n.charges).toEqual([2, 2]);
    expect(n.captures).toBe(0);
    expect(n.owners.every((o) => o === null)).toBe(true);
    expect(g.charges[0]).toBe(1);
  });
});
describe("CPU tactical search", () => {
  it("takes the highest scoring immediate claim, including theft and adjacency", () => {
    const g = fixture({
      core: 14,
      countdown: 1,
      turn: 1,
      charges: [0, 0],
      values: Array(36).fill(1),
      owners: own([
        [8, 0],
        [2, 0],
        [9, 0],
      ]),
    });
    expect(chooseAction(g)).toEqual({ type: "shift", to: 8 });
  });
  it("spends a rewind to rescue a losing final capture and win", () => {
    const g = fixture({
      core: 14,
      countdown: 2,
      turn: 1,
      captures: 11,
      charges: [0, 1],
      owners: own([[14, 0]]),
      values: Array(36).fill(1),
    });
    expect(chooseAction(g)).toEqual({ type: "rewind" });
  });
  it("conserves charges when an immediate capture already wins", () => {
    const g = fixture({
      core: 14,
      countdown: 1,
      turn: 1,
      captures: 11,
      charges: [0, 2],
      values: Array(36).fill(1),
    });
    expect(chooseAction(g).type).not.toBe("rewind");
  });
  it("finds a guaranteed next-round capture against every legal opponent response", () => {
    const g = fixture({
      core: 14,
      countdown: 2,
      turn: 1,
      charges: [0, 1],
      captures: 11,
      values: Array(36).fill(3),
    });
    function allReplies(s: Game): void {
      if (s.winner !== null) {
        expect(s.winner).toBe(1);
        return;
      }
      if (s.turn === 1) allReplies(applyAction(s, chooseAction(s)));
      else
        for (const action of legalActions(s))
          allReplies(applyAction(s, action));
    }
    allReplies(g);
  });
  it("is reproducible and leaves input unchanged", () => {
    const g = fixture();
    const clone = structuredClone(g);
    expect(chooseAction(g)).toEqual(chooseAction(g));
    expect(g).toEqual(clone);
  });
  it("only plays legal actions and completes 80 self-play matches within finite bounds", () => {
    let wins = [0, 0];
    let maxSteps = 0;
    for (let seed = 0; seed < 80; seed++) {
      let g = newGame(seed);
      let steps = 0;
      while (g.winner === null && steps++ < 80) {
        const a = chooseAction(g);
        expect(isLegal(g, a)).toBe(true);
        g = applyAction(g, a);
        expect(g.countdown).toBeGreaterThanOrEqual(g.winner === null ? 1 : 0);
        expect(g.charges.every((c) => c >= 0 && c <= 2)).toBe(true);
      }
      expect(g.winner).not.toBeNull();
      wins[g.winner!]++;
      maxSteps = Math.max(maxSteps, steps);
    }
    expect(wins[0]).toBeGreaterThan(0);
    expect(wins[1]).toBeGreaterThan(0);
    expect(maxSteps).toBeLessThanOrEqual(55);
    console.info("Self-play audit:", { matches: 80, wins, maxSteps });
  }, 60000);
});
