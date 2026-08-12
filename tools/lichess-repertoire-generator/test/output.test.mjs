import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Chess } from "chess.js";
import { normalizeConfig } from "../src/config.mjs";
import { createState } from "../src/state.mjs";
import { writeOutputs } from "../src/output.mjs";

test("writes distinct, valid PGN games plus an engine-depth audit", (context) => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "lichess-repertoire-output-"));
  context.after(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));
  const config = normalizeConfig({
    name: "White d4 output test",
    repertoireSide: "white",
    maxFullmove: 2,
    seedMoves: ["d4"],
    outputDirectory: "output",
  }, path.join(temporaryDirectory, "config.json"));
  const state = createState(config);
  state.queue = [];
  state.leaves = [
    { seedName: "Seed 1", san: ["d4", "d5", "c4"], uci: ["d2d4", "d7d5", "c2c4"], reach: 0.6, decisions: [] },
    { seedName: "Seed 1", san: ["d4", "Nf6", "c4"], uci: ["d2d4", "g8f6", "c2c4"], reach: 0.3, decisions: [] },
  ];
  state.engineCache = {
    first: { depth: 58, cloud: true },
    second: { depth: 55, cloud: false },
  };

  const output = writeOutputs(config, state);
  const pgn = fs.readFileSync(output.pgnPath, "utf8");
  const games = pgn.trim().split(/\n\s*\n(?=\[Event\s)/);

  assert.equal(games.length, 2);
  for (const game of games) {
    const chess = new Chess();
    assert.doesNotThrow(() => chess.loadPgn(game));
    assert.equal(chess.history().length, 3);
  }
  assert.equal(output.summary.uniqueOutputLines, 2);
  assert.equal(output.summary.minimumEngineDepth, 55);
  assert.equal(output.summary.maximumEngineDepth, 58);
  assert.equal(output.summary.cloudEvaluations, 1);
  assert.ok(fs.existsSync(output.auditPath));
  assert.ok(fs.existsSync(output.summaryPath));
});
