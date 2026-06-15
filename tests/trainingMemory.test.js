import assert from "node:assert/strict";
import test from "node:test";
import { makeGameAtMove, parseMoves } from "../src/lib/chess.js";
import {
  chooseVariationIndexForPracticeMode,
  completeSessionReview,
  createSessionTrainingStats,
  enqueueSessionReview,
  isDueTrainingRecord,
  isMasteredTrainingRecord,
  isWeakTrainingRecord,
  summarizeSessionTraining,
  summarizeTrainingMemory,
  trainingPositionKey,
  trainingRecordPriority,
  updateSessionTrainingStats,
  updateTrainingMemoryRecord,
} from "../src/lib/trainingMemory.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 5, 15, 12);

function attempt(overrides = {}) {
  return {
    key: "opening|fen|e4",
    openingId: "opening",
    openingName: "Opening",
    variationName: "Main line",
    variationSaved: false,
    fen: "start fen",
    expectedSan: "e4",
    playedSan: "e4",
    side: "White",
    moveNumber: 1,
    history: "",
    outcome: "correct",
    ...overrides,
  };
}

function recordForMove(openingId, line, moveIndex, overrides = {}) {
  const moves = parseMoves(line);
  const fen = makeGameAtMove(moves, moveIndex).fen();
  const expectedSan = moves[moveIndex];
  return {
    key: trainingPositionKey(openingId, fen, expectedSan),
    openingId,
    fen,
    expectedSan,
    side: moveIndex % 2 === 0 ? "White" : "Black",
    nextReviewAt: NOW,
    lastPracticedAt: NOW,
    ...overrides,
  };
}

test("training records track streaks, recent outcomes, and deterministic review timing", () => {
  const memory = updateTrainingMemoryRecord({}, attempt(), { now: NOW });
  const record = memory["opening|fen|e4"];

  assert.equal(record.strength, 1);
  assert.equal(record.correctStreak, 1);
  assert.equal(record.mistakeStreak, 0);
  assert.equal(record.lapses, 0);
  assert.equal(record.firstSeenAt, NOW);
  assert.equal(record.nextReviewAt, NOW + DAY_MS);
  assert.deepEqual(record.recentOutcomes, [{ outcome: "correct", at: NOW, playedSan: "e4" }]);
});

test("a learned position records one lapse across repeated misses and returns tomorrow after correction", () => {
  const learned = {
    "opening|fen|e4": {
      ...attempt(),
      strength: 4,
      correctStreak: 4,
      lastOutcome: "correct",
      correct: 4,
      attempts: 4,
    },
  };
  const firstMiss = updateTrainingMemoryRecord(learned, attempt({ outcome: "wrong", playedSan: "d4" }), { now: NOW });
  const secondMiss = updateTrainingMemoryRecord(firstMiss, attempt({ outcome: "wrong", playedSan: "c4" }), { now: NOW + 1000 });
  const corrected = updateTrainingMemoryRecord(secondMiss, attempt({ outcome: "correct-after-retry" }), { now: NOW + 2000 });
  const record = corrected["opening|fen|e4"];

  assert.equal(secondMiss["opening|fen|e4"].lapses, 1);
  assert.equal(secondMiss["opening|fen|e4"].mistakeStreak, 2);
  assert.equal(record.correctStreak, 1);
  assert.equal(record.mistakeStreak, 0);
  assert.equal(record.nextReviewAt, NOW + 2000 + DAY_MS);
});

test("weak and due priorities reward mistake streaks and overdue positions", () => {
  const weak = {
    mistakes: 2,
    mistakeStreak: 2,
    strength: 1,
    lapses: 1,
    lastPracticedAt: NOW - DAY_MS,
    recentOutcomes: [{ outcome: "wrong", at: NOW - 1000 }],
  };
  const overdue = {
    strength: 4,
    correctStreak: 3,
    nextReviewAt: NOW - 5 * DAY_MS,
  };

  assert.equal(isWeakTrainingRecord(weak), true);
  assert.equal(isDueTrainingRecord(overdue, NOW), true);
  assert.ok(trainingRecordPriority(weak, "weak", NOW) > 20);
  assert.ok(trainingRecordPriority(overdue, "due", NOW) > 40);
});

test("practice selection follows the single highest-priority position in a line", () => {
  const openingId = "test-opening";
  const variations = [
    { name: "Two mildly due positions", line: "1. e4 e5 2. Nf3" },
    { name: "One very overdue position", line: "1. d4 d5 2. c4" },
  ];
  const mildOne = recordForMove(openingId, variations[0].line, 0, { nextReviewAt: NOW - DAY_MS, strength: 4, correctStreak: 3 });
  const mildTwo = recordForMove(openingId, variations[0].line, 2, { nextReviewAt: NOW - DAY_MS, strength: 4, correctStreak: 3 });
  const severe = recordForMove(openingId, variations[1].line, 0, { nextReviewAt: NOW - 10 * DAY_MS, strength: 4, correctStreak: 3 });
  const memory = {
    [mildOne.key]: mildOne,
    [mildTwo.key]: mildTwo,
    [severe.key]: severe,
  };

  const chosen = chooseVariationIndexForPracticeMode({
    mode: "due",
    openingId,
    variations,
    quizSide: "White",
    trainingMemory: memory,
    now: NOW,
    random: () => 0,
  });

  assert.equal(chosen, 1);
});

test("training summaries are practice-side-aware and report mastery and next review", () => {
  const whiteMastered = {
    key: "white-mastered",
    openingId: "opening",
    side: "White",
    attempts: 5,
    correct: 5,
    strength: 5,
    correctStreak: 3,
    nextReviewAt: NOW + 2 * DAY_MS,
    recentOutcomes: [{ outcome: "correct", at: NOW - 1000 }],
  };
  const whiteWeak = {
    key: "white-weak",
    openingId: "opening",
    side: "White",
    attempts: 2,
    correct: 1,
    mistakes: 1,
    strength: 1,
    mistakeStreak: 1,
    nextReviewAt: NOW,
    recentOutcomes: [{ outcome: "wrong", at: NOW - 500 }],
  };
  const blackRecord = {
    key: "black",
    openingId: "opening",
    side: "Black",
    attempts: 10,
    correct: 10,
    strength: 6,
    correctStreak: 6,
    nextReviewAt: NOW + DAY_MS,
  };
  const summary = summarizeTrainingMemory({
    [whiteMastered.key]: whiteMastered,
    [whiteWeak.key]: whiteWeak,
    [blackRecord.key]: blackRecord,
  }, "opening", { quizSide: "White", now: NOW });

  assert.equal(isMasteredTrainingRecord(whiteMastered), true);
  assert.equal(summary.positions, 2);
  assert.equal(summary.mastered, 1);
  assert.equal(summary.masteryPercent, 50);
  assert.equal(summary.weak, 1);
  assert.equal(summary.due, 1);
  assert.equal(summary.nextReviewAt, NOW + 2 * DAY_MS);
});

test("session stats and review queue stay unique by trained position", () => {
  let stats = createSessionTrainingStats();
  stats = updateSessionTrainingStats(stats, { key: "a", outcome: "wrong" });
  stats = updateSessionTrainingStats(stats, { key: "a", outcome: "correct-after-retry" });
  stats = updateSessionTrainingStats(stats, { key: "a", outcome: "correct", reviewed: true });
  stats = updateSessionTrainingStats(stats, { key: "b", outcome: "correct" });
  const summary = summarizeSessionTraining(stats);

  assert.equal(summary.positions, 2);
  assert.equal(summary.firstTryAccuracy, 50);
  assert.equal(summary.weakSpotsFound, 1);
  assert.equal(summary.weakSpotsImproved, 1);

  const review = { key: "a", moves: ["e4"], moveIndex: 0 };
  const queue = enqueueSessionReview(enqueueSessionReview([], review), review);
  assert.equal(queue.length, 1);
  assert.deepEqual(completeSessionReview(queue, "a"), []);
});
