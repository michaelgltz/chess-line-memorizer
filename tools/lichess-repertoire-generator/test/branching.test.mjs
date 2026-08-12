import test from "node:test";
import assert from "node:assert/strict";
import { selectOpponentMoves } from "../src/branching.mjs";

const moves = [
  { uci: "a2a3", share: 0.5 },
  { uci: "b2b3", share: 0.25 },
  { uci: "c2c3", share: 0.15 },
  { uci: "d2d3", share: 0.1 },
];

test("selects popular moves until target coverage", () => {
  const selected = selectOpponentMoves(moves, 1, {
    maxBranches: 4,
    minMoveShare: 0.1,
    minAbsoluteReach: 0,
    targetCoverage: 0.75,
  });
  assert.deepEqual(selected.map((move) => move.uci), ["a2a3", "b2b3"]);
});

test("always keeps a main move when reach pruning removes everything", () => {
  const selected = selectOpponentMoves(moves, 0.001, {
    maxBranches: 3,
    minMoveShare: 0.2,
    minAbsoluteReach: 0.01,
    targetCoverage: 0.8,
  });
  assert.deepEqual(selected.map((move) => move.uci), ["a2a3"]);
});
