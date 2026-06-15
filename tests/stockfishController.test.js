import assert from "node:assert/strict";
import test from "node:test";
import {
  createStockfishController,
  isStockfishRequestCancelled,
} from "../src/lib/stockfishController.js";

class FakeWorker {
  constructor() {
    this.messages = [];
    this.onmessage = null;
    this.onerror = null;
    this.terminated = false;
  }

  postMessage(message) {
    this.messages.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  emit(message) {
    this.onmessage?.({ data: message });
  }
}

function createTestController() {
  const workers = [];
  const controller = createStockfishController({
    workerFactory: () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    },
  });

  return { controller, workers };
}

test("a newer channel request cancels the old worker and ignores its late messages", async () => {
  const { controller, workers } = createTestController();
  const updates = [];
  const firstRequest = controller.analyzeFen("fen-one", {
    channel: "board-eval",
    onUpdate: ({ result }) => updates.push(result.value),
  });
  const staleHandler = workers[0].onmessage;
  const secondRequest = controller.analyzeFen("fen-two", {
    channel: "board-eval",
    onUpdate: ({ result }) => updates.push(result.value),
  });

  await assert.rejects(firstRequest, isStockfishRequestCancelled);
  assert.equal(workers[0].terminated, true);
  assert.equal(workers[0].messages.includes("stop"), true);

  staleHandler({ data: "info depth 10 score cp 999 pv a2a4" });
  staleHandler({ data: "bestmove a2a4" });
  workers[1].emit("info depth 10 score cp 25 pv e2e4 e7e5");
  workers[1].emit("bestmove e2e4");

  assert.deepEqual(await secondRequest, {
    type: "cp",
    value: 25,
    depth: 10,
    pv: "e2e4 e7e5",
    bestMove: "e2e4",
  });
  assert.deepEqual(updates, [25]);
  controller.dispose();
});

test("independent analysis channels can complete without cancelling each other", async () => {
  const { controller, workers } = createTestController();
  const boardRequest = controller.analyzeFen("board-fen", { channel: "board-eval" });
  const mistakeRequest = controller.analyzeFen("mistake-fen", { channel: "wrong-move" });

  assert.equal(workers[0].terminated, false);
  assert.equal(workers[1].terminated, false);

  workers[0].emit("info depth 10 score cp 12 pv d2d4");
  workers[0].emit("bestmove d2d4");
  workers[1].emit("info depth 10 score cp -45 pv g8f6");
  workers[1].emit("bestmove g8f6");

  assert.equal((await boardRequest).bestMove, "d2d4");
  assert.equal((await mistakeRequest).bestMove, "g8f6");
  controller.dispose();
});

test("completed top-move analysis is sorted and reused from the shared cache", async () => {
  const { controller, workers } = createTestController();
  const firstRequest = controller.analyzeTopMoves("top-fen", {
    channel: "free-play-top",
    multiPv: 3,
  });

  workers[0].emit("info depth 10 multipv 2 score cp 18 pv d2d4 d7d5");
  workers[0].emit("info depth 10 multipv 1 score cp 30 pv e2e4 e7e5");
  workers[0].emit("info depth 10 multipv 3 score cp 8 pv g1f3 d7d5");
  workers[0].emit("bestmove e2e4");

  const firstResult = await firstRequest;
  assert.deepEqual(firstResult.map((entry) => entry.bestMove), ["e2e4", "d2d4", "g1f3"]);

  const cachedResult = await controller.analyzeTopMoves("top-fen", {
    channel: "extension-top",
    multiPv: 3,
  });

  assert.equal(workers.length, 1);
  assert.deepEqual(cachedResult, firstResult);
  controller.dispose();
});

test("an abort signal terminates its worker and rejects as cancellation", async () => {
  const { controller, workers } = createTestController();
  const abortController = new AbortController();
  const request = controller.analyzeFen("abort-fen", {
    channel: "wrong-move",
    signal: abortController.signal,
  });

  abortController.abort();

  await assert.rejects(request, isStockfishRequestCancelled);
  assert.equal(workers[0].terminated, true);
  controller.dispose();
});
