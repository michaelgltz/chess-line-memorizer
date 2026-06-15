import { makeGameAtMove, normalizeMove, sideForIndex } from "./chess.js";
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
    description: "Prioritize positions with recent misses and mistake streaks.",
  },
  {
    id: "due",
    label: "Due review",
    description: "Prioritize the most overdue positions.",
  },
];

const REVIEW_DAY_MS = 24 * 60 * 60 * 1000;
const REVIEW_INTERVAL_DAYS = [0, 1, 2, 4, 7, 14, 30];
const RECENT_OUTCOME_LIMIT = 8;

function trainingFenKey(fen) {
  return fen.split(" ").slice(0, 4).join(" ");
}

function randomArrayIndex(length, random) {
  const randomValue = typeof random === "function" ? Number(random()) || 0 : 0;
  return Math.min(length - 1, Math.max(0, Math.floor(randomValue * length)));
}

function nextReviewAt(now, outcome, strength) {
  if (outcome === "wrong" || outcome === "answer") return now;
  if (outcome === "correct-after-retry") return now + REVIEW_DAY_MS;

  const days = REVIEW_INTERVAL_DAYS[Math.max(0, Math.min(strength, REVIEW_INTERVAL_DAYS.length - 1))];
  return now + days * REVIEW_DAY_MS;
}

function recentMissCount(record) {
  return (record?.recentOutcomes || []).filter((entry) => entry.outcome === "wrong" || entry.outcome === "answer").length;
}

function daysSince(timestamp, now) {
  if (!timestamp) return 0;
  return Math.max(0, (now - timestamp) / REVIEW_DAY_MS);
}

export function trainingPositionKey(openingId, fen, expectedSan) {
  return `${openingId}|${trainingFenKey(fen)}|${normalizeMove(expectedSan)}`;
}

export function isWeakTrainingRecord(record) {
  if (!record) return false;
  const misses = (record.mistakes || 0) + (record.answerReveals || 0);
  if (!misses) return false;

  return (record.mistakeStreak || 0) > 0
    || (record.strength || 0) <= 2
    || ((record.lapses || 0) >= 2 && (record.correctStreak || 0) < 3)
    || recentMissCount(record) >= 2;
}

export function isDueTrainingRecord(record, now = Date.now()) {
  return !!record?.nextReviewAt && record.nextReviewAt <= now;
}

export function isMasteredTrainingRecord(record) {
  return !!record
    && (record.strength || 0) >= 4
    && (record.correctStreak || 0) >= 2
    && (record.mistakeStreak || 0) === 0;
}

export function trainingRecordPriority(record, mode, now = Date.now()) {
  if (!record || mode === "random") return 0;

  if (mode === "weak") {
    if (!isWeakTrainingRecord(record)) return 0;
    return 20
      + (record.mistakeStreak || 0) * 12
      + (record.lapses || 0) * 6
      + recentMissCount(record) * 4
      + Math.max(0, 4 - (record.strength || 0)) * 3
      + Math.min(10, daysSince(record.lastPracticedAt, now));
  }

  if (mode === "due") {
    if (!isDueTrainingRecord(record, now)) return 0;
    const overdueDays = daysSince(record.nextReviewAt, now);
    return 30
      + Math.min(30, overdueDays) * 4
      + (isWeakTrainingRecord(record) ? 10 : 0)
      + (record.mistakeStreak || 0) * 6
      + Math.max(0, 4 - (record.strength || 0)) * 2;
  }

  return 0;
}

export function summarizeTrainingMemory(trainingMemory, openingId, { quizSide = null, now = Date.now() } = {}) {
  const records = Object.values(trainingMemory).filter((record) => (
    record.openingId === openingId && (!quizSide || record.side === quizSide)
  ));
  const attempts = records.reduce((sum, record) => sum + (record.attempts || 0), 0);
  const correct = records.reduce((sum, record) => sum + (record.correct || 0), 0);
  const weak = records.filter(isWeakTrainingRecord).length;
  const due = records.filter((record) => isDueTrainingRecord(record, now)).length;
  const mastered = records.filter(isMasteredTrainingRecord).length;
  const futureReviews = records
    .map((record) => record.nextReviewAt)
    .filter((nextReviewAt) => nextReviewAt > now)
    .sort((timeA, timeB) => timeA - timeB);
  const recentOutcomes = records
    .flatMap((record) => record.recentOutcomes || [])
    .filter((entry) => entry?.at)
    .sort((entryA, entryB) => entryB.at - entryA.at)
    .slice(0, 30);
  const recentCorrect = recentOutcomes.filter((entry) => (
    entry.outcome === "correct" || entry.outcome === "correct-after-retry"
  )).length;

  return {
    positions: records.length,
    attempts,
    weak,
    due,
    dueTomorrow: records.filter((record) => record.nextReviewAt > now && record.nextReviewAt <= now + REVIEW_DAY_MS).length,
    mastered,
    masteryPercent: records.length ? Math.round((mastered / records.length) * 100) : 0,
    accuracy: attempts ? Math.round((correct / attempts) * 100) : null,
    recentAccuracy: recentOutcomes.length ? Math.round((recentCorrect / recentOutcomes.length) * 100) : null,
    nextReviewAt: futureReviews[0] || null,
  };
}

export function reviewTimingLabel(nextReviewAt, now = Date.now()) {
  if (!nextReviewAt) return "No review scheduled";
  if (nextReviewAt <= now) return "Review available now";

  const days = Math.ceil((nextReviewAt - now) / REVIEW_DAY_MS);
  if (days <= 1) return "Next review tomorrow";
  return `Next review in ${days} days`;
}

export function updateTrainingMemoryRecord(trainingMemory, attempt, { now = Date.now() } = {}) {
  const previous = trainingMemory[attempt.key] || {};
  const wasCorrect = attempt.outcome === "correct" || attempt.outcome === "correct-after-retry";
  const wasFirstTry = attempt.outcome === "correct";
  const wasWrong = attempt.outcome === "wrong";
  const usedAnswer = attempt.outcome === "answer";
  const wasMiss = wasWrong || usedAnswer;
  const previousStrength = previous.strength || 0;
  const isNewLapse = wasMiss
    && previousStrength > 0
    && previous.lastOutcome !== "wrong"
    && previous.lastOutcome !== "answer";
  const nextStrength = wasFirstTry
    ? Math.min(6, previousStrength + 1)
    : wasCorrect
      ? Math.max(1, previousStrength)
      : Math.max(0, previousStrength - 1);
  const recentOutcomes = [
    ...(previous.recentOutcomes || []),
    { outcome: attempt.outcome, at: now, playedSan: attempt.playedSan || "" },
  ].slice(-RECENT_OUTCOME_LIMIT);

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
      correctStreak: wasCorrect ? (previous.correctStreak || 0) + 1 : 0,
      mistakeStreak: wasMiss ? (previous.mistakeStreak || 0) + 1 : 0,
      lapses: (previous.lapses || 0) + (isNewLapse ? 1 : 0),
      firstSeenAt: previous.firstSeenAt || now,
      lastMistakeAt: wasMiss ? now : previous.lastMistakeAt || null,
      recentOutcomes,
      lastOutcome: attempt.outcome,
      lastPracticedAt: now,
      nextReviewAt: nextReviewAt(now, attempt.outcome, nextStrength),
    },
  };
}

function variationMemoryPriority({ entry, openingId, quizSide, trainingMemory, mode, now }) {
  return entry.moves.reduce((highestPriority, move, index) => {
    if (sideForIndex(index) !== quizSide) return highestPriority;
    const fen = makeGameAtMove(entry.moves, index).fen();
    const record = trainingMemory[trainingPositionKey(openingId, fen, move)];
    return Math.max(highestPriority, trainingRecordPriority(record, mode, now));
  }, 0);
}

export function chooseVariationIndexForPracticeMode({
  mode,
  openingId,
  variations,
  quizSide,
  trainingMemory,
  now = Date.now(),
  random = Math.random,
}) {
  if (!variations.length) return 0;
  if (mode === "random") return randomArrayIndex(variations.length, random);

  const entries = buildVariationEntries(variations);
  const scored = entries
    .map((entry) => ({
      index: entry.index,
      priority: variationMemoryPriority({ entry, openingId, quizSide, trainingMemory, mode, now }),
    }))
    .filter((entry) => entry.priority > 0)
    .sort((entryA, entryB) => entryB.priority - entryA.priority);

  if (!scored.length) return randomArrayIndex(variations.length, random);

  const bestPriority = scored[0].priority;
  const best = scored.filter((entry) => entry.priority === bestPriority);
  return best[randomArrayIndex(best.length, random)].index;
}

export function createSessionTrainingStats() {
  return {
    attemptedKeys: [],
    firstTryCorrectKeys: [],
    correctedKeys: [],
    weakKeys: [],
    improvedKeys: [],
    mistakes: 0,
    answerReveals: 0,
  };
}

function addUnique(array, value) {
  return array.includes(value) ? array : [...array, value];
}

export function updateSessionTrainingStats(stats, { key, outcome, reviewed = false }) {
  const wasAttempted = (stats?.attemptedKeys || []).includes(key);
  const next = {
    ...(stats || createSessionTrainingStats()),
    attemptedKeys: addUnique(stats?.attemptedKeys || [], key),
  };

  if (outcome === "correct" && !wasAttempted) next.firstTryCorrectKeys = addUnique(stats?.firstTryCorrectKeys || [], key);
  if (outcome === "correct-after-retry") next.correctedKeys = addUnique(stats?.correctedKeys || [], key);
  if (outcome === "wrong") {
    next.mistakes = (stats?.mistakes || 0) + 1;
    next.weakKeys = addUnique(stats?.weakKeys || [], key);
  }
  if (outcome === "answer") {
    next.answerReveals = (stats?.answerReveals || 0) + 1;
    next.weakKeys = addUnique(stats?.weakKeys || [], key);
  }
  if (reviewed && (outcome === "correct" || outcome === "correct-after-retry")) {
    next.improvedKeys = addUnique(stats?.improvedKeys || [], key);
  }

  return next;
}

export function summarizeSessionTraining(stats) {
  const positions = stats?.attemptedKeys?.length || 0;
  const firstTryCorrect = stats?.firstTryCorrectKeys?.length || 0;

  return {
    positions,
    firstTryAccuracy: positions ? Math.round((firstTryCorrect / positions) * 100) : null,
    correctedAfterRetry: stats?.correctedKeys?.length || 0,
    mistakes: stats?.mistakes || 0,
    answerReveals: stats?.answerReveals || 0,
    weakSpotsFound: stats?.weakKeys?.length || 0,
    weakSpotsImproved: stats?.improvedKeys?.length || 0,
  };
}

export function enqueueSessionReview(queue, review) {
  if (!review?.key || !Array.isArray(review.moves) || review.moveIndex < 0) return queue || [];
  if ((queue || []).some((entry) => entry.key === review.key)) return queue;
  return [...(queue || []), review];
}

export function completeSessionReview(queue, key) {
  return (queue || []).filter((entry) => entry.key !== key);
}
