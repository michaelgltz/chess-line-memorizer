import { Chess } from "chess.js";
import {
  convertUciLineToSan,
  normalizeMove,
  uciToMoveObject,
  uciToSan,
} from "./chess.js";

export const STOCKFISH_PATH = "/stockfish/stockfish-18-lite-single.js";
export const ENGINE_DEPTH = 10;

export function scoreFromWhitePerspective(rawScore, sideToMove) {
  if (!rawScore) return null;
  const multiplier = sideToMove === "w" ? 1 : -1;

  if (rawScore.type === "mate") {
    return { mate: rawScore.value * multiplier, depth: rawScore.depth, bestMove: rawScore.bestMove };
  }

  return { cp: rawScore.value * multiplier, depth: rawScore.depth, bestMove: rawScore.bestMove };
}

export function parseStockfishInfo(line) {
  const depthMatch = line.match(/\bdepth\s+(\d+)/);
  const cpMatch = line.match(/\bscore\s+cp\s+(-?\d+)/);
  const mateMatch = line.match(/\bscore\s+mate\s+(-?\d+)/);
  if (!depthMatch || (!cpMatch && !mateMatch)) return null;
  return {
    type: cpMatch ? "cp" : "mate",
    value: Number(cpMatch ? cpMatch[1] : mateMatch[1]),
    depth: Number(depthMatch[1]),
  };
}

export function parseBestMove(line) {
  const match = line.match(/\bbestmove\s+(\S+)/);
  return match?.[1] || null;
}

export function formatEval(engineEval) {
  if (!engineEval) return "—";
  if (engineEval.mate !== undefined && engineEval.mate !== null) {
    return engineEval.mate > 0 ? `M${engineEval.mate}` : `-M${Math.abs(engineEval.mate)}`;
  }
  if (engineEval.cp === undefined || engineEval.cp === null) return "—";
  const pawns = engineEval.cp / 100;
  return pawns >= 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
}

export function whiteEvalHeight(engineEval) {
  if (!engineEval) return 50;
  if (engineEval.mate !== undefined && engineEval.mate !== null) return engineEval.mate > 0 ? 95 : 5;
  if (engineEval.cp === undefined || engineEval.cp === null) return 50;
  const pawns = engineEval.cp / 100;
  const clamped = Math.max(-6, Math.min(6, pawns));
  return 50 + clamped * 7.5;
}

export function scoreToComparableNumber(score) {
  if (!score) return null;
  if (score.type === "cp") return score.value;
  if (score.type === "mate") {
    const sign = score.value >= 0 ? 1 : -1;
    return sign * (100000 - Math.abs(score.value));
  }
  return null;
}

export function formatThresholdPawns(thresholdCp) {
  return (thresholdCp / 100).toFixed(2);
}

export function filterTopMovesByThreshold(topMoves, thresholdCp) {
  if (!topMoves?.length) return [];
  const topScore = scoreToComparableNumber(topMoves[0]);
  if (topScore === null) return topMoves.slice(0, 1);

  return topMoves.filter((move) => {
    const moveScore = scoreToComparableNumber(move);
    if (moveScore === null) return false;
    return topScore - moveScore <= thresholdCp;
  });
}

export function formatTopMoveOption(fen, entry) {
  if (!entry?.bestMove) return "—";

  const san = uciToSan(fen, entry.bestMove) || entry.bestMove;

  try {
    const game = new Chess(fen);
    const whiteScore = scoreFromWhitePerspective(entry, game.turn());
    return `${san} ${formatPawnEvalFromScore(whiteScore)}`;
  } catch {
    return `${san} —`;
  }
}

function formatPawnEvalFromScore(score) {
  if (!score) return "—";
  if (score.mate !== undefined && score.mate !== null) {
    return score.mate > 0 ? `M${score.mate}` : `-M${Math.abs(score.mate)}`;
  }
  if (score.cp === undefined || score.cp === null) return "—";
  const pawns = score.cp / 100;
  return pawns >= 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
}

function getNumericEval(score) {
  if (!score) return null;
  if (score.cp !== undefined && score.cp !== null) return score.cp / 100;
  if (score.mate !== undefined && score.mate !== null) return score.mate > 0 ? 99 : -99;
  return null;
}

function createRuleBasedExplanation({ playedSan, bestSan, evalBefore, evalAfter, replySan, repertoireMove }) {
  const beforeNumber = getNumericEval(evalBefore);
  const afterNumber = getNumericEval(evalAfter);
  const swing = beforeNumber !== null && afterNumber !== null ? afterNumber - beforeNumber : null;
  const playedIsEngineChoice = normalizeMove(playedSan) === normalizeMove(bestSan);

  if (playedIsEngineChoice) {
    return `This is actually a strong move according to Stockfish. It is not the memorized repertoire move for this drill, but it may be a valid alternate line. The repertoire move here is ${repertoireMove}.`;
  }

  if (swing !== null && swing > -0.5) {
    return `This is probably playable. It is not the repertoire move for this drill, but the eval swing is small. Stockfish prefers ${bestSan}; the repertoire move is ${repertoireMove}.`;
  }

  if (replySan && replySan.includes("x")) {
    return `The concrete issue is that the engine's reply starts with ${replySan}, so your move allows an immediate capture or tactical response. ${bestSan} avoids that problem.`;
  }

  if (swing !== null && swing <= -2) {
    return `This is probably a tactical or material mistake. The eval drops by about ${Math.abs(swing).toFixed(1)} pawns compared with the best move.`;
  }

  if (swing !== null && swing <= -0.8) {
    return `This move gives away a meaningful amount of advantage. The engine prefers ${bestSan}, which keeps the position cleaner.`;
  }

  return `This is not the engine's top choice. ${bestSan} keeps a better version of the position.`;
}

function throwIfCancelled(signal) {
  if (!signal?.aborted) return;
  const error = new Error("Analysis cancelled");
  error.name = "AbortError";
  throw error;
}

export async function analyzeWrongMoveDynamically(
  { originalFen, afterFen, playedSan, correctSan },
  { analyzeFen, signal } = {},
) {
  if (typeof analyzeFen !== "function") {
    throw new Error("analyzeWrongMoveDynamically requires an analyzeFen function");
  }

  const originalGameForBest = new Chess(originalFen);
  const originalGameForEval = new Chess(originalFen);
  const afterGameForEval = new Chess(afterFen);

  throwIfCancelled(signal);
  const beforeRaw = await analyzeFen(originalFen, { signal });
  throwIfCancelled(signal);
  const afterRaw = await analyzeFen(afterFen, { signal });
  throwIfCancelled(signal);

  const evalBefore = scoreFromWhitePerspective(beforeRaw, originalGameForEval.turn());
  const evalAfter = scoreFromWhitePerspective(afterRaw, afterGameForEval.turn());

  let bestSan = correctSan;
  if (beforeRaw?.bestMove) {
    try {
      const move = originalGameForBest.move(uciToMoveObject(beforeRaw.bestMove));
      if (move?.san) bestSan = move.san;
    } catch {
      bestSan = correctSan;
    }
  }

  const engineLineAfterMistake = convertUciLineToSan(afterFen, afterRaw?.pv || afterRaw?.bestMove || "", 8);
  const engineLineBest = convertUciLineToSan(originalFen, beforeRaw?.pv || beforeRaw?.bestMove || "", 8);
  const replySan = engineLineAfterMistake[0] || null;
  const beforeNumber = getNumericEval(evalBefore);
  const afterNumber = getNumericEval(evalAfter);
  const swing = beforeNumber !== null && afterNumber !== null ? afterNumber - beforeNumber : null;
  const playedIsEngineChoice = normalizeMove(playedSan) === normalizeMove(bestSan);
  const isPlayableAlternative = playedIsEngineChoice || (swing !== null && swing > -0.5);
  const explanation = createRuleBasedExplanation({
    playedSan,
    bestSan,
    evalBefore,
    evalAfter,
    replySan,
    repertoireMove: correctSan,
  });

  return {
    playedSan,
    bestSan,
    evalBefore: formatPawnEvalFromScore(evalBefore),
    evalAfter: formatPawnEvalFromScore(evalAfter),
    swing: swing === null ? "—" : `${swing >= 0 ? "+" : ""}${swing.toFixed(1)}`,
    engineLineAfterMistake,
    engineLineBest,
    explanation,
    isPlayableAlternative,
    repertoireMove: correctSan,
  };
}
