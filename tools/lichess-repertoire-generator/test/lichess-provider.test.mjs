import test from "node:test";
import assert from "node:assert/strict";
import { normalizeConfig } from "../src/config.mjs";
import { createState } from "../src/state.mjs";
import { LichessBrowserProvider } from "../src/lichess-browser.mjs";

function testConfig() {
  return normalizeConfig({
    name: "Provider test",
    repertoireSide: "black",
    maxFullmove: 2,
    seedMoves: ["e4", "c5"],
    explorer: { speeds: ["Rapid"], ratings: [1800], requestSpacingMs: 0 },
    engine: { minDepth: 40 },
  });
}

test("authenticated Explorer request converts game totals into move shares", async () => {
  const config = testConfig();
  const state = createState(config);
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({
      white: 60,
      draws: 20,
      black: 20,
      moves: [
        { uci: "g1f3", san: "Nf3", white: 30, draws: 10, black: 10 },
        { uci: "b1c3", san: "Nc3", white: 15, draws: 5, black: 5 },
      ],
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const provider = new LichessBrowserProvider(config, state, () => {}, console, fetchImpl);
  provider.token = "private-test-token";

  const moves = await provider.getExplorerMoves("rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2");

  assert.equal(request.options.headers.Authorization, "Bearer private-test-token");
  assert.equal(request.url.hostname, "explorer.lichess.org");
  assert.equal(request.url.searchParams.get("speeds"), "rapid");
  assert.equal(request.url.searchParams.get("ratings"), "1800");
  assert.deepEqual(moves.map((move) => move.share), [0.5, 0.25]);
});
