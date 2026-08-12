import test from "node:test";
import assert from "node:assert/strict";
import { normalizeConfig } from "../src/config.mjs";
import { createState } from "../src/state.mjs";
import { generate } from "../src/generator.mjs";

test("branches opponent moves and chooses one engine reply per branch", async () => {
  const config = normalizeConfig({
    name: "White d4 test",
    repertoireSide: "white",
    maxFullmove: 2,
    seedMoves: ["d4"],
    branching: { minMoveShare: 0.1, maxBranches: 3, targetCoverage: 0.8, minAbsoluteReach: 0 },
  });
  const state = createState(config);
  let checkpoints = 0;
  const provider = {
    async getExplorerMoves() {
      return [
        { uci: "d7d5", share: 0.55, games: 550 },
        { uci: "g8f6", share: 0.3, games: 300 },
        { uci: "e7e6", share: 0.15, games: 150 },
      ];
    },
    async analyze() {
      return { uci: "c2c4", depth: 60, cloud: true };
    },
  };

  const leaves = await generate(config, state, provider, () => { checkpoints += 1; }, { log() {} });

  assert.deepEqual(leaves.map((leaf) => leaf.san), [
    ["d4", "d5", "c4"],
    ["d4", "Nf6", "c4"],
  ]);
  assert.deepEqual(leaves.map((leaf) => leaf.reach), [0.55, 0.3]);
  assert.ok(checkpoints >= 5);
});
