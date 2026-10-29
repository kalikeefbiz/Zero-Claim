import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { freshRecord, loadRecord, saveRecord } from "../src/storage";
let stored: string | null;
beforeEach(() => {
  stored = null;
  vi.stubGlobal("localStorage", {
    getItem: () => stored,
    setItem: (_k: string, v: string) => {
      stored = v;
    },
  });
});
afterEach(() => vi.unstubAllGlobals());
it("loads defaults on first play", () => {
  expect(loadRecord()).toEqual(freshRecord());
});
it("persists the completed record and preferences", () => {
  const r = {
    wins: 4,
    losses: 2,
    best: 24,
    played: 6,
    sound: false,
    tutorial: true,
  };
  saveRecord(r);
  expect(loadRecord()).toEqual(r);
});
it("tolerates corrupt JSON", () => {
  stored = "{broken";
  expect(loadRecord()).toEqual(freshRecord());
});
it("sanitizes invalid values", () => {
  stored = JSON.stringify({
    wins: -1,
    losses: "4",
    best: Infinity,
    played: 1.1,
    sound: "false",
    tutorial: 1,
  });
  expect(loadRecord()).toEqual(freshRecord());
});
it("keeps the game usable when storage is denied", () => {
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw Error("denied");
    },
    setItem: () => {
      throw Error("full");
    },
  });
  expect(loadRecord()).toEqual(freshRecord());
  expect(() => saveRecord(freshRecord())).not.toThrow();
});
