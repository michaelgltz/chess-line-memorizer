import { makeGameAtMove, normalizeMove, randomIndex, sideForIndex } from "./chess.js";
import { buildVariationEntries } from "./variations.js";

export const TRAINING_MEMORY_STORAGE_KEY = "opening-lab-training-memory";

export const PRACTICE_MODES = [
  {
    id: "random",
    label: "Random",
    description: "Mix all unique lines.",
  },
  {
    id: "weak",
    label: "Weak spots",
    description: "Favor lines with missed positions.",
  },
  {
    id: "due",
    label: "Due review",
    description: "Favor positions ready to revisit.",
  },
];

const REVIEW_DAY_MS = 24 * 60 * 60 * 1000;
const REVIEW_INTERVAL_DAYS = [0, 1, 2, 4, 7, 14, 30];

function trainingFenKey(fen) {
  return fen.split(" ").slice(0, 4).join(" ");
}

export function trainingPositionKey(openingId, fen, expectedSan) {
  return `${openingId}|${trainingFenKey(fen)}|${normalizeMove(expectedSan)}`;
}

function nextReviewAt(now, outcome, strength) {
  if (outcome === "wrong" || outcome === "answer") return now;
  if (outcome === "correct-after-retry") return now + REVIEW_DAY_MS;

  const days = REVIEW_INTERVAL_DAYS[Math.max(0, Math.min(strength, REVIEW_INTERVAL_DAYS.length - 1))];
  return now + days * REVIEW_DAY_MS;
}

function isWeakTrainingRecord(record) {
  if (!record) return false;
  const misses = (record.mistakes || 0) + (record.answerReveals || 0);
  if (!misses) return false;
  return (record.strength || 0) <= 2 || misses >= Math.max(2, record.correctFirstTry || 0);
}

function isDueTrainingRecord(record, now = Date.now()) {
  return !!record?.nextReviewAt && record.nextReviewAt <= now;
}

export function summarizeTrainingMemory(trainingMemory, openingId) {
  const records = Object.values(trainingMemory).filter((record) => record.openingId === openingId);
  const attempts = records.reduce((sum, record) => sum + (record.attempts || 0), 0);
  const correct = records.reduce((sum, record) => sum + (record.correct || 0), 0);
  const weak = records.filter(isWeakTrainingRecord).length;
  const due = records.filter((record) => isDueTrainingRecord(record)).length;

  return {
    positions: records.length,
    attempts,
    weak,
    due,
    accuracy: attempts ? Math.round((correct / attempts) * 100) : null,
  };
}

export function updateTrainingMemoryRecord(trainingMemory, attempt) {
  const now = Date.now();
  const previous = trainingMemory[attempt.key] || {};
  const wasCorrect = attempt.outcome === "correct" || attempt.outcome === "correct-after-retry";
  const wasFirstTry = attempt.outcome === "correct";
  const wasWrong = attempt.outcome === "wrong";
  const usedAnswer = attempt.outcome === "answer";
  const previousStrength = previous.strength || 0;
  const nextStrength = wasFirstTry
    ? Math.min(6, previousStrength + 1)
    : wasCorrect
      ? Math.max(1, previousStrength)
      : Math.max(0, previousStrength - 1);

  return {
    ...trainingMemory,
    [attempt.key]: {
      ...previous,
      key: attempt.key,
      openingId: attempt.openingId,
      openingName: attempt.openingName,
      variationName: attempt.variationName,
      variationSaved: attempt.variationSaved,
      fen: attempt.fen,
      fenKey: trainingFenKey(attempt.fen),
      expectedSan: attempt.expectedSan,
      lastPlayedSan: attempt.playedSan || previous.lastPlayedSan || "",
      side: attempt.side,
      moveNumber: attempt.moveNumber,
      history: attempt.history,
      attempts: (previous.attempts || 0) + 1,
      correct: (previous.correct || 0) + (wasCorrect ? 1 : 0),
      correctFirstTry: (previous.correctFirstTry || 0) + (wasFirstTry ? 1 : 0),
      correctAfterRetry: (previous.correctAfterRetry || 0) + (attempt.outcome === "correct-after-retry" ? 1 : 0),
      mistakes: (previous.mistakes || 0) + (wasWrong ? 1 : 0),
      answerReveals: (previous.answerReveals || 0) + (usedAnswer ? 1 : 0),
      strength: nextStrength,
      lastOutcome: attempt.outcome,
      lastPracticedAt: now,
      nextReviewAt: nextReviewAt(now, attempt.outcome, nextStrength),
    },
  };
}

function variationMemoryScore({ entry, openingId, quizSide, trainingMemory, mode }) {
  let score = 0;

  entry.moves.forEach((move, index) => {
    if (sideForIndex(index) !== quizSide) return;
    const fen = makeGameAtMove(entry.moves, index).fen();
    const record = trainingMemory[trainingPositionKey(openingId, fen, move)];
    if (!record) return;

    if (mode === "weak" && isWeakTrainingRecord(record)) {
      score += 8 + (record.mistakes || 0) * 2 + (record.answerReveals || 0) * 3 - (record.strength || 0);
    }

    if (mode === "due" && isDueTrainingRecord(record)) {
      score += 6 + Math.max(0, 3 - (record.strength || 0));
    }
  });

  return score;
}

export function chooseVariationIndexForPracticeMode({ mode, openingId, variations, quizSide, trainingMemory }) {
  if (!variations.length) return 0;
  if (mode === "random") return randomIndex(variations.length);

  const entries = buildVariationEntries(variations);
  const scored = entries
    .map((entry) => ({
      index: entry.index,
      score: variationMemoryScore({ entry, openingId, quizSide, trainingMemory, mode }),
    }))
    .filter((entry) => entry.score > 0)
    .sort((entryA, entryB) => entryB.score - entryA.score);

  if (!scored.length) return randomIndex(variations.length);

  const bestScore = scored[0].score;
  const best = scored.filter((entry) => entry.score === bestScore);
  return best[randomIndex(best.length)].index;
}
