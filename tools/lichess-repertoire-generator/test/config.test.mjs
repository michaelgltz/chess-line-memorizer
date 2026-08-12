import test from "node:test";
import assert from "node:assert/strict";
import { configHash, normalizeConfig } from "../src/config.mjs";

const raw = {
  name: "Test",
  repertoireSide: "white",
  maxFullmove: 3,
  seedMoves: ["d4"],
  engine: { minDepth: 40 },
};

test("config hash changes for chess policy but not browser presentation", () => {
  const first = normalizeConfig(raw, "/tmp/one/config.json");
  const headed = normalizeConfig({ ...raw, browser: { headless: false } }, "/tmp/two/config.json");
  const deeper = normalizeConfig({ ...raw, engine: { minDepth: 41 } }, "/tmp/one/config.json");

  assert.equal(configHash(first), configHash(headed));
  assert.notEqual(configHash(first), configHash(deeper));
  assert.equal(first.explorer.tokenKeychainService, "com.recall64.lichess-explorer");
});

test("rejects a seed beyond the requested repertoire horizon", () => {
  assert.throws(
    () => normalizeConfig({ ...raw, maxFullmove: 1, seedMoves: ["d4", "d5"] }),
    /longer than maxFullmove/
  );
});
