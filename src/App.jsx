import React, { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import "./App.css";

const STOCKFISH_PATH = "/stockfish/stockfish-18-lite-single.js";
const ENGINE_DEPTH = 10;
const OPPONENT_DELAY_MIN_MS = 1000;
const OPPONENT_DELAY_MAX_MS = 3000;
const CORRECT_FEEDBACK_DELAY_MS = 850;

const OPENINGS = [
  {
    id: "englund-white",
    name: "Englund Gambit Refutation",
    side: "White",
    description: "Train White's main responses against common Englund ideas.",
    variations: [
      {
        name: "Main queen raid line",
        line: `1. d4 e5 2. dxe5 Nc6 3. Nf3 Qe7 4. Bf4 Qb4+ 5. Bd2 Qxb2 6. Nc3 Bb4 7. Rb1 Qa3 8. Rb3 Qa5 9. a3 Bxc3 10. Bxc3 Qc5 11. e3`,
        explanations: {
          10: {
            "rb1": {
              title: "Rb1 is close, but Nc3 is more precise first.",
              text: "After the queen takes b2, White wants to develop with tempo and make sure the queen has no easy escape. Nc3 develops a piece and attacks the queen's neighborhood before committing the rook.",
              seeLine: `6. Rb1 Qa3 7. Nc3 Bb4`,
            },
          },
        },
      },
      {
        name: "Englund with early ...d6",
        line: `1. d4 e5 2. dxe5 d6 3. exd6 Bxd6 4. Nf3 Nf6 5. Bg5 O-O 6. e3 h6 7. Bh4`,
        explanations: {
          4: {
            "nxd6": {
              title: "Nxd6 is not available here.",
              text: "White's knight has not developed yet. The clean refutation is to accept the pawn with exd6 and let Black spend time recapturing.",
              seeLine: `3. exd6 Bxd6 4. Nf3`,
            },
          },
        },
      },
      {
        name: "Englund simple development line",
        line: `1. d4 e5 2. dxe5 Nc6 3. Nf3 f6 4. exf6 Nxf6 5. Bg5 d5 6. e3 Be7 7. Nc3 O-O`,
        explanations: {},
      },
    ],
  },
  {
    id: "london-white",
    name: "London System",
    side: "White",
    description: "Practice common London structures and move orders.",
    variations: [
      {
        name: "Basic London setup",
        line: `1. d4 d5 2. Nf3 Nf6 3. Bf4 e6 4. e3 Bd6 5. Bg3 O-O 6. Bd3 c5 7. c3 Nc6 8. Nbd2`,
        explanations: {
          8: {
            "bxd6": {
              title: "Trading on d6 too early is harmless for Black.",
              text: "The bishop trade gives up one of White's active pieces without forcing a concession. Bg3 keeps the bishop and asks Black how they want to resolve the tension.",
              seeLine: `5. Bxd6 Qxd6 6. Bd3 O-O`,
            },
          },
        },
      },
      {
        name: "London against ...c5",
        line: `1. d4 d5 2. Nf3 Nf6 3. Bf4 c5 4. e3 Nc6 5. c3 e6 6. Nbd2 Bd6 7. Bg3 O-O`,
        explanations: {},
      },
      {
        name: "London with early ...Bf5",
        line: `1. d4 d5 2. Nf3 Nf6 3. Bf4 Bf5 4. e3 e6 5. c4 c6 6. Nc3 Nbd7 7. Bd3`,
        explanations: {},
      },
    ],
  },
  {
    id: "sicilian-black",
    name: "Sicilian Defense as Black",
    side: "Black",
    description: "Practice a few common Black replies in open Sicilian structures.",
    variations: [
      {
        name: "Najdorf-style setup",
        line: `1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be2 e5 7. Nb3 Be7 8. O-O O-O`,
        explanations: {},
      },
      {
        name: "Classical development",
        line: `1. e4 c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 d6 6. Be2 e6 7. O-O Be7`,
        explanations: {},
      },
      {
        name: "Dragon-style setup",
        line: `1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6 6. Be3 Bg7 7. f3 O-O`,
        explanations: {},
      },
    ],
  },
  {
    id: "sicilian-white",
    name: "Sicilian Najdorf Response as White",
    side: "White",
    description: "Practice White's response after Black plays ...a6 in the Sicilian.",
    variations: [
      {
        name: "Quiet Be2 line",
        line: `1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be2 e5 7. Nb3 Be7 8. O-O O-O`,
        explanations: {
          10: {
            "bxa6": {
              title: "Bxa6 wins a pawn but loses the bishop.",
              text: "The bishop can take on a6, but Black can simply recapture with the b8-knight. White gives up a bishop for a pawn and helps Black develop.",
              seeLine: `6. Bxa6 Nxa6 7. O-O e5 8. Nb3 Be7`,
            },
          },
        },
      },
    ],
  },
];

function stripMoveNumbers(text) {
  return text
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\d+\.\.\./g, " ")
    .replace(/\d+\./g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMove(move) {
  return move
    .trim()
    .replace(/[+#?!]+$/g, "")
    .replace(/0/g, "O")
    .toLowerCase();
}

function parseMoves(text) {
  const clean = stripMoveNumbers(text);
  if (!clean) return [];
  return clean
    .split(" ")
    .map((m) => m.trim())
    .filter(Boolean)
    .filter((m) => !["1-0", "0-1", "1/2-1/2", "*"].includes(m));
}

function randomIndex(length) {
  return Math.floor(Math.random() * length);
}

function moveNumberForIndex(index) {
  return Math.floor(index / 2) + 1;
}

function sideForIndex(index) {
  return index % 2 === 0 ? "White" : "Black";
}

function makeGameAtMove(moves, currentIndex) {
  const game = new Chess();

  for (let i = 0; i < currentIndex; i++) {
    const move = moves[i];
    if (!move) break;

    try {
      game.move(move);
    } catch {
      break;
    }
  }

  return game;
}

function makeGameFromFenAndMoves(startFen, moves, count) {
  const game = new Chess(startFen);
  for (let i = 0; i < count; i++) {
    try {
      game.move(moves[i]);
    } catch {
      break;
    }
  }
  return game;
}

function scoreFromWhitePerspective(rawScore, sideToMove) {
  if (!rawScore) return null;
  const multiplier = sideToMove === "w" ? 1 : -1;

  if (rawScore.type === "mate") {
    return { mate: rawScore.value * multiplier, depth: rawScore.depth, bestMove: rawScore.bestMove };
  }

  return { cp: rawScore.value * multiplier, depth: rawScore.depth, bestMove: rawScore.bestMove };
}

function parseStockfishInfo(line) {
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

function parseBestMove(line) {
  const match = line.match(/\bbestmove\s+(\S+)/);
  return match?.[1] || null;
}

function formatEval(engineEval) {
  if (!engineEval) return "—";
  if (engineEval.mate !== undefined && engineEval.mate !== null) {
    return engineEval.mate > 0 ? `M${engineEval.mate}` : `-M${Math.abs(engineEval.mate)}`;
  }
  if (engineEval.cp === undefined || engineEval.cp === null) return "—";
  const pawns = engineEval.cp / 100;
  return pawns >= 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
}

function whiteEvalHeight(engineEval) {
  if (!engineEval) return 50;
  if (engineEval.mate !== undefined && engineEval.mate !== null) return engineEval.mate > 0 ? 95 : 5;
  if (engineEval.cp === undefined || engineEval.cp === null) return 50;
  const pawns = engineEval.cp / 100;
  const clamped = Math.max(-6, Math.min(6, pawns));
  return 50 + clamped * 7.5;
}

function buildHistoryItems(moves, currentIndex) {
  const items = [];
  for (let i = 0; i < currentIndex; i++) {
    items.push({ index: i, label: moves[i], moveNo: moveNumberForIndex(i), side: sideForIndex(i) });
  }
  return items;
}

function formatLineWithMoveNumbers(moves) {
  const parts = [];
  for (let i = 0; i < moves.length; i += 2) {
    const moveNumber = i / 2 + 1;
    const whiteMove = moves[i] || "";
    const blackMove = moves[i + 1] || "";
    parts.push(`${moveNumber}. ${whiteMove}${blackMove ? " " + blackMove : ""}`);
  }
  return parts.join(" ");
}

function uciToMoveObject(uci) {
  if (!uci || uci.length < 4) return null;
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
  };
}

function convertUciLineToSan(startFen, pvString, maxMoves = 8) {
  if (!pvString) return [];
  const game = new Chess(startFen);
  const uciMoves = pvString.trim().split(" ").filter(Boolean).slice(0, maxMoves);
  const sanMoves = [];

  for (const uci of uciMoves) {
    const moveObject = uciToMoveObject(uci);
    if (!moveObject) break;

    try {
      const move = game.move(moveObject);
      if (!move) break;
      sanMoves.push(move.san);
    } catch {
      break;
    }
  }

  return sanMoves;
}

function uciToSan(startFen, uci) {
  const moveObject = uciToMoveObject(uci);
  if (!moveObject) return null;

  try {
    const game = new Chess(startFen);
    const move = game.move(moveObject);
    return move?.san || null;
  } catch {
    return null;
  }
}

function moveToUci(move) {
  if (!move) return "";
  return `${move.from}${move.to}${move.promotion || ""}`;
}

function scoreToComparableNumber(score) {
  if (!score) return null;
  if (score.type === "cp") return score.value;
  if (score.type === "mate") {
    const sign = score.value >= 0 ? 1 : -1;
    return sign * (100000 - Math.abs(score.value));
  }
  return null;
}

function filterTopMovesByThreshold(topMoves, thresholdCp) {
  if (!topMoves?.length) return [];
  const topScore = scoreToComparableNumber(topMoves[0]);
  if (topScore === null) return topMoves.slice(0, 1);

  return topMoves.filter((move) => {
    const moveScore = scoreToComparableNumber(move);
    if (moveScore === null) return false;
    return topScore - moveScore <= thresholdCp;
  });
}

function formatTopMoveOption(fen, entry) {
  if (!entry?.bestMove) return "—";

  const san = uciToSan(fen, entry.bestMove) || entry.bestMove;
  let evalText = "—";

  try {
    const game = new Chess(fen);
    const whiteScore = scoreFromWhitePerspective(entry, game.turn());
    evalText = formatPawnEvalFromScore(whiteScore);
  } catch {
    evalText = "—";
  }

  return `${san} ${evalText}`;
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

function extractPvFromInfoLine(line) {
  const marker = " pv ";
  const index = line.indexOf(marker);
  return index === -1 ? "" : line.slice(index + marker.length).trim();
}

function analyzeTopMovesWithTemporaryStockfish(fen, depth = ENGINE_DEPTH, multiPv = 3) {
  return new Promise((resolve) => {
    const worker = new Worker(STOCKFISH_PATH);
    const linesByPv = {};
    let resolved = false;

    const finish = () => {
      if (resolved) return;
      resolved = true;
      try {
        worker.postMessage("quit");
        worker.terminate();
      } catch {
        // Ignore cleanup errors.
      }

      const results = Object.values(linesByPv)
        .filter((entry) => entry.bestMove)
        .sort((a, b) => a.multiPv - b.multiPv);
      resolve(results);
    };

    const timeout = setTimeout(finish, 7000);

    worker.onmessage = (event) => {
      const line = String(event.data || "").trim();
      if (!line) return;

      const info = parseStockfishInfo(line);
      if (info) {
        const tokens = line.split(" ");
        const multiPvIndex = tokens.indexOf("multipv");
        const multiPvNumber = multiPvIndex === -1 ? 1 : Number(tokens[multiPvIndex + 1] || 1);
        const pv = extractPvFromInfoLine(line);
        const bestMove = pv.split(" ").filter(Boolean)[0];

        linesByPv[multiPvNumber] = {
          ...info,
          multiPv: multiPvNumber,
          bestMove,
          pv,
        };
        return;
      }

      if (parseBestMove(line)) {
        clearTimeout(timeout);
        finish();
      }
    };

    worker.onerror = () => {
      clearTimeout(timeout);
      finish();
    };

    worker.postMessage("uci");
    worker.postMessage(`setoption name MultiPV value ${multiPv}`);
    worker.postMessage(`position fen ${fen}`);
    worker.postMessage(`go depth ${depth}`);
  });
}

function analyzeFenWithTemporaryStockfish(fen, depth = ENGINE_DEPTH) {
  return new Promise((resolve) => {
    const worker = new Worker(STOCKFISH_PATH);
    let latestInfo = null;
    let resolved = false;

    const finish = (result) => {
      if (resolved) return;
      resolved = true;
      try {
        worker.postMessage("quit");
        worker.terminate();
      } catch {
        // Ignore cleanup errors.
      }
      resolve(result);
    };

    const timeout = setTimeout(() => finish(null), 6000);

    worker.onmessage = (event) => {
      const line = String(event.data || "").trim();
      if (!line) return;

      const info = parseStockfishInfo(line);
      if (info) {
        latestInfo = { ...info, pv: extractPvFromInfoLine(line) };
        return;
      }

      const bestMove = parseBestMove(line);
      if (bestMove) {
        clearTimeout(timeout);
        finish({ ...(latestInfo || {}), bestMove });
      }
    };

    worker.onerror = () => {
      clearTimeout(timeout);
      finish(null);
    };

    worker.postMessage("uci");
    worker.postMessage(`position fen ${fen}`);
    worker.postMessage(`go depth ${depth}`);
  });
}

async function analyzeWrongMoveDynamically({ originalFen, afterFen, playedSan, correctSan }) {
  const originalGameForBest = new Chess(originalFen);
  const originalGameForEval = new Chess(originalFen);
  const afterGameForEval = new Chess(afterFen);

  const beforeRaw = await analyzeFenWithTemporaryStockfish(originalFen, ENGINE_DEPTH);
  const afterRaw = await analyzeFenWithTemporaryStockfish(afterFen, ENGINE_DEPTH);

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

export default function App() {
  const [savedVariations, setSavedVariations] = useState(() => {
    try {
      const raw = localStorage.getItem("chess-line-memorizer-saved-variations");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [selectedOpeningId, setSelectedOpeningId] = useState(OPENINGS[0].id);
  const [selectedVariationIndex, setSelectedVariationIndex] = useState(0);
  const [customLineText, setCustomLineText] = useState(OPENINGS[0].variations[0].line);
  const [quizSide, setQuizSide] = useState(OPENINGS[0].side);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewIndex, setViewIndex] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [dynamicAnalysis, setDynamicAnalysis] = useState(null);
  const [dynamicAnalysisStatus, setDynamicAnalysisStatus] = useState("idle");
  const [mistakes, setMistakes] = useState([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [wrongAttemptsThisMove, setWrongAttemptsThisMove] = useState(0);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [previewFen, setPreviewFen] = useState(null);
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [opponentThinking, setOpponentThinking] = useState(false);
  const [lesson, setLesson] = useState(null);
  const [lessonStep, setLessonStep] = useState(0);
  const [freePlayMode, setFreePlayMode] = useState(false);
  const [freePlayFen, setFreePlayFen] = useState(null);
  const [freePlayMoves, setFreePlayMoves] = useState([]);
  const [extensionMode, setExtensionMode] = useState(false);
  const [extensionFen, setExtensionFen] = useState(null);
  const [extensionBaseMoves, setExtensionBaseMoves] = useState([]);
  const [extensionMoves, setExtensionMoves] = useState([]);
  const [extensionName, setExtensionName] = useState("");
  const [showVariationManager, setShowVariationManager] = useState(false);
  const [manualVariationName, setManualVariationName] = useState("");
  const [manualVariationLine, setManualVariationLine] = useState("");
  const [extensionMoveMode, setExtensionMoveMode] = useState("top3");
  const [extensionThresholdCp, setExtensionThresholdCp] = useState(75);
  const [extensionTopMoves, setExtensionTopMoves] = useState([]);
  const [extensionTopMoveStatus, setExtensionTopMoveStatus] = useState("idle");
  const [engineEval, setEngineEval] = useState(null);
  const [evalStatus, setEvalStatus] = useState("loading");
  const [evalCache, setEvalCache] = useState({});

  const stockfishRef = useRef(null);
  const latestRawScoreRef = useRef(null);
  const latestFenRef = useRef(null);
  const latestSideToMoveRef = useRef("w");

  useEffect(() => {
    try {
      localStorage.setItem("chess-line-memorizer-saved-variations", JSON.stringify(savedVariations));
    } catch {
      // Ignore localStorage write errors.
    }
  }, [savedVariations]);

  const selectedOpening = OPENINGS.find((opening) => opening.id === selectedOpeningId) || OPENINGS[0];
  const savedForOpening = savedVariations[selectedOpeningId] || [];
  const availableVariations = selectedOpeningId === "custom"
    ? []
    : [...(selectedOpening.variations || []), ...savedForOpening];
  const selectedVariation = availableVariations[selectedVariationIndex] || availableVariations[0];
  const lineText = selectedOpeningId === "custom" ? customLineText : selectedVariation.line;
  const moves = useMemo(() => parseMoves(lineText), [lineText]);

  const game = useMemo(() => makeGameAtMove(moves, currentIndex), [moves, currentIndex]);
  const actualFen = game.fen();
  const reviewGame = useMemo(() => (viewIndex === null ? null : makeGameAtMove(moves, viewIndex)), [moves, viewIndex]);
  const lessonGame = useMemo(() => {
    if (!lesson) return null;
    return makeGameFromFenAndMoves(lesson.startFen, lesson.moves, lessonStep);
  }, [lesson, lessonStep]);

  const shownFen = lessonGame?.fen() || reviewGame?.fen() || previewFen || extensionFen || freePlayFen || actualFen;
  const shownGame = useMemo(() => new Chess(shownFen), [shownFen]);
  const sideToMove = shownGame.turn();
  latestSideToMoveRef.current = sideToMove;

  const currentMove = moves[currentIndex];
  const currentSide = sideForIndex(currentIndex);
  const isQuizTurn = currentSide === quizSide;
  const isDone = currentIndex >= moves.length;
  const isReviewing = viewIndex !== null || lesson !== null;
  const progress = moves.length ? Math.round((currentIndex / moves.length) * 100) : 0;
  const evalHeight = whiteEvalHeight(engineEval);
  const historyItems = buildHistoryItems(moves, currentIndex);

  useEffect(() => {
    const worker = new Worker(STOCKFISH_PATH);
    stockfishRef.current = worker;
    setEvalStatus("loading");

    worker.onmessage = (event) => {
      const line = String(event.data || "").trim();
      if (!line) return;

      const info = parseStockfishInfo(line);
      if (info) {
        latestRawScoreRef.current = info;
        const whiteScore = scoreFromWhitePerspective(info, latestSideToMoveRef.current);
        setEngineEval(whiteScore);
        setEvalStatus("analyzing");
        return;
      }

      const bestMove = parseBestMove(line);
      if (bestMove && latestRawScoreRef.current) {
        const completeRawScore = { ...latestRawScoreRef.current, bestMove };
        const whiteScore = scoreFromWhitePerspective(completeRawScore, latestSideToMoveRef.current);
        setEngineEval(whiteScore);
        setEvalCache((prev) => ({ ...prev, [latestFenRef.current]: whiteScore }));
        setEvalStatus("ready");
      }
    };

    worker.onerror = () => {
      setEngineEval(null);
      setEvalStatus("unavailable");
    };

    worker.postMessage("uci");
    worker.postMessage("isready");

    return () => {
      worker.postMessage("quit");
      worker.terminate();
      stockfishRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (isDone || isQuizTurn || showAnswer || isReviewing || previewFen) {
      setOpponentThinking(false);
      return;
    }

    setOpponentThinking(true);
    const delay = OPPONENT_DELAY_MIN_MS + Math.floor(Math.random() * (OPPONENT_DELAY_MAX_MS - OPPONENT_DELAY_MIN_MS));
    const timer = setTimeout(() => {
      setOpponentThinking(false);
      playOpponentMove();
    }, delay);

    return () => {
      clearTimeout(timer);
      setOpponentThinking(false);
    };
  }, [currentIndex, isDone, isQuizTurn, showAnswer, isReviewing, previewFen]);

  useEffect(() => {
    if (!extensionMode || !extensionFen) {
      setExtensionTopMoves([]);
      setExtensionTopMoveStatus("idle");
      return;
    }

    let cancelled = false;
    setExtensionTopMoveStatus("loading");
    setExtensionTopMoves([]);

    analyzeTopMovesWithTemporaryStockfish(extensionFen, ENGINE_DEPTH, 3)
      .then((moves) => {
        if (cancelled) return;
        setExtensionTopMoves(moves || []);
        setExtensionTopMoveStatus(moves?.length ? "ready" : "unavailable");
      })
      .catch(() => {
        if (cancelled) return;
        setExtensionTopMoves([]);
        setExtensionTopMoveStatus("unavailable");
      });

    return () => {
      cancelled = true;
    };
  }, [extensionMode, extensionFen]);

  useEffect(() => {
    if (!shownFen || !stockfishRef.current) return;

    if (evalCache[shownFen]) {
      setEngineEval(evalCache[shownFen]);
      setEvalStatus("ready");
      return;
    }

    latestFenRef.current = shownFen;
    latestSideToMoveRef.current = sideToMove;
    latestRawScoreRef.current = null;
    setEngineEval(null);
    setEvalStatus("analyzing");

    const worker = stockfishRef.current;
    worker.postMessage("stop");
    worker.postMessage(`position fen ${shownFen}`);
    worker.postMessage(`go depth ${ENGINE_DEPTH}`);
  }, [shownFen, sideToMove, evalCache]);

  function clearReview() {
    setViewIndex(null);
    setLesson(null);
    setLessonStep(0);
  }

  function resetToMainLine() {
    setSelectedVariationIndex(0);
    setCurrentIndex(0);
    setViewIndex(null);
    setFeedback(null);
    setDynamicAnalysis(null);
    setDynamicAnalysisStatus("idle");
    setMistakes([]);
    setShowAnswer(false);
    setWrongAttemptsThisMove(0);
    setSelectedSquare(null);
    setPreviewFen(null);
    setOpponentThinking(false);
    setLesson(null);
    setLessonStep(0);
    setFreePlayMode(false);
    setFreePlayFen(null);
    setFreePlayMoves([]);
    setExtensionMode(false);
    setExtensionFen(null);
    setExtensionBaseMoves([]);
    setExtensionMoves([]);
    setExtensionName("");
    setExtensionTopMoves([]);
    setExtensionTopMoveStatus("idle");
  }

  function resetQuiz(randomizeVariation = true) {
    const opening = OPENINGS.find((o) => o.id === selectedOpeningId) || OPENINGS[0];
    const variations = selectedOpeningId === "custom"
      ? []
      : [...(opening.variations || []), ...(savedVariations[selectedOpeningId] || [])];
    if (randomizeVariation && selectedOpeningId !== "custom" && variations.length > 0) {
      setSelectedVariationIndex(randomIndex(variations.length));
    }
    setCurrentIndex(0);
    setViewIndex(null);
    setFeedback(null);
    setDynamicAnalysis(null);
    setDynamicAnalysisStatus("idle");
    setMistakes([]);
    setShowAnswer(false);
    setWrongAttemptsThisMove(0);
    setSelectedSquare(null);
    setPreviewFen(null);
    setOpponentThinking(false);
    setLesson(null);
    setLessonStep(0);
    setFreePlayMode(false);
    setFreePlayFen(null);
    setFreePlayMoves([]);
    setExtensionMode(false);
    setExtensionFen(null);
    setExtensionBaseMoves([]);
    setExtensionMoves([]);
    setExtensionName("");
    setExtensionTopMoves([]);
    setExtensionTopMoveStatus("idle");
  }

  function chooseOpening(openingId) {
    if (openingId === "custom") {
      setSelectedOpeningId("custom");
      setShowCustomEditor(true);
      resetQuiz(false);
      return;
    }

    const nextOpening = OPENINGS.find((opening) => opening.id === openingId);
    if (!nextOpening) return;

    setSelectedOpeningId(nextOpening.id);
    const nextVariations = [...(nextOpening.variations || []), ...(savedVariations[nextOpening.id] || [])];
    setSelectedVariationIndex(randomIndex(nextVariations.length));
    setQuizSide(nextOpening.side);
    setShowCustomEditor(false);
    setCurrentIndex(0);
    setViewIndex(null);
    setFeedback(null);
    setDynamicAnalysis(null);
    setDynamicAnalysisStatus("idle");
    setMistakes([]);
    setShowAnswer(false);
    setWrongAttemptsThisMove(0);
    setSelectedSquare(null);
    setPreviewFen(null);
    setOpponentThinking(false);
    setLesson(null);
    setLessonStep(0);
    setFreePlayMode(false);
    setFreePlayFen(null);
    setFreePlayMoves([]);
    setExtensionMode(false);
    setExtensionFen(null);
    setExtensionBaseMoves([]);
    setExtensionMoves([]);
    setExtensionName("");
    setExtensionTopMoves([]);
    setExtensionTopMoveStatus("idle");
  }

  function advance() {
    setCurrentIndex((i) => Math.min(i + 1, moves.length));
    setFeedback(null);
    setDynamicAnalysis(null);
    setDynamicAnalysisStatus("idle");
    setShowAnswer(false);
    setWrongAttemptsThisMove(0);
    setSelectedSquare(null);
    setPreviewFen(null);
    setLesson(null);
    setLessonStep(0);
    setFreePlayMode(false);
    setFreePlayFen(null);
    setFreePlayMoves([]);
    setExtensionMode(false);
    setExtensionFen(null);
    setExtensionBaseMoves([]);
    setExtensionMoves([]);
    setExtensionName("");
    setExtensionTopMoves([]);
    setExtensionTopMoveStatus("idle");
  }

  function playOpponentMove() {
    if (isDone || isQuizTurn) return;
    advance();
  }

  function deleteSavedVariation(openingId, variationIndex) {
    setSavedVariations((prev) => {
      const existing = prev[openingId] || [];
      const nextForOpening = existing.filter((_, index) => index !== variationIndex);
      const next = { ...prev };

      if (nextForOpening.length) {
        next[openingId] = nextForOpening;
      } else {
        delete next[openingId];
      }

      return next;
    });

    setFeedback({ type: "correct", text: "Deleted saved variation." });
    resetToMainLine();
  }

  function addManualVariation() {
    if (selectedOpeningId === "custom") {
      setFeedback({ type: "wrong", text: "Choose a built-in opening before adding a saved variation." });
      return;
    }

    const name = manualVariationName.trim() || `Manual variation ${new Date().toLocaleDateString()}`;
    const line = manualVariationLine.trim();

    if (!line) {
      setFeedback({ type: "wrong", text: "Paste a PGN-style line before saving." });
      return;
    }

    try {
      const testMoves = parseMoves(line);
      makeGameAtMove(testMoves, testMoves.length);
    } catch {
      setFeedback({ type: "wrong", text: "That line could not be parsed. Check the move order and notation." });
      return;
    }

    saveVariationToStorage({ name, line });
    setManualVariationName("");
    setManualVariationLine("");
    setFeedback({ type: "correct", text: `Added saved variation: ${name}` });
  }

  function selectSavedVariation(variationIndex) {
    const builtInCount = selectedOpening.variations?.length || 0;
    setSelectedVariationIndex(builtInCount + variationIndex);
    resetQuiz(false);
    setShowVariationManager(false);
  }

  function clearSavedVariationsForOpening() {
    if (selectedOpeningId === "custom") return;
    const savedCount = savedVariations[selectedOpeningId]?.length || 0;
    if (!savedCount) {
      setFeedback({ type: "wrong", text: "No saved variations to clear for this opening." });
      return;
    }

    const confirmed = window.confirm(`Clear ${savedCount} saved variation${savedCount === 1 ? "" : "s"} for ${selectedOpening.name}?`);
    if (!confirmed) return;

    setSavedVariations((prev) => {
      const next = { ...prev };
      delete next[selectedOpeningId];
      return next;
    });
    resetToMainLine();
    setFeedback({ type: "correct", text: `Cleared saved variations for ${selectedOpening.name}.` });
  }

  function clearAllSavedVariations() {
    const totalCount = Object.values(savedVariations).reduce((sum, variations) => sum + (Array.isArray(variations) ? variations.length : 0), 0);
    if (!totalCount) {
      setFeedback({ type: "wrong", text: "No saved variations to clear." });
      return;
    }

    const confirmed = window.confirm(`Clear all ${totalCount} saved/imported variation${totalCount === 1 ? "" : "s"}? This cannot be undone unless you exported a backup.`);
    if (!confirmed) return;

    setSavedVariations({});
    resetToMainLine();
    setFeedback({ type: "correct", text: "Cleared all saved variations." });
  }

  function exportSavedVariations() {
    const payload = {
      app: "Opening Lab",
      version: 1,
      exportedAt: new Date().toISOString(),
      savedVariations,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `opening-lab-repertoire-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function importSavedVariations(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "{}"));
        const imported = parsed.savedVariations || parsed;

        if (!imported || typeof imported !== "object" || Array.isArray(imported)) {
          throw new Error("Invalid repertoire file");
        }

        setSavedVariations((prev) => {
          const merged = { ...prev };

          for (const [openingId, variations] of Object.entries(imported)) {
            if (!Array.isArray(variations)) continue;
            const existing = merged[openingId] || [];
            const existingLines = new Set(existing.map((variation) => variation.line));
            const newOnes = variations.filter((variation) => variation?.line && !existingLines.has(variation.line));
            merged[openingId] = [...existing, ...newOnes];
          }

          return merged;
        });

        setFeedback({ type: "correct", text: "Imported saved variations successfully." });
      } catch {
        setFeedback({ type: "wrong", text: "Could not import that file. Make sure it is a Chess Line Memorizer JSON export." });
      } finally {
        event.target.value = "";
      }
    };

    reader.readAsText(file);
  }

  function saveVariationToStorage({ name, line }) {
    if (selectedOpeningId === "custom") return false;

    const newVariation = {
      name,
      line,
      explanations: {},
      saved: true,
      createdAt: new Date().toISOString(),
    };

    let saved = false;
    setSavedVariations((prev) => {
      const existing = prev[selectedOpeningId] || [];
      const alreadyExists = existing.some((variation) => variation.line === line);
      if (alreadyExists) return prev;
      saved = true;
      return {
        ...prev,
        [selectedOpeningId]: [...existing, newVariation],
      };
    });

    return saved;
  }

  function savePlayableAlternative() {
    if (!dynamicAnalysis?.isPlayableAlternative || selectedOpeningId === "custom") return;

    const newMoves = [...moves.slice(0, currentIndex), dynamicAnalysis.playedSan];
    const newLine = formatLineWithMoveNumbers(newMoves);
    const variationName = `Saved alternate: ${dynamicAnalysis.playedSan} on move ${moveNumberForIndex(currentIndex)}`;

    saveVariationToStorage({ name: variationName, line: newLine });

    setFeedback({
      type: "correct",
      text: `Saved ${dynamicAnalysis.playedSan} as a new variation under ${selectedOpening.name}.`,
    });
  }

  function startExtensionFromPlayableAlternative() {
    if (!dynamicAnalysis?.isPlayableAlternative || selectedOpeningId === "custom") return;

    const baseMoves = [...moves.slice(0, currentIndex), dynamicAnalysis.playedSan];
    const baseLine = formatLineWithMoveNumbers(baseMoves);
    const baseGame = makeGameAtMove(baseMoves, baseMoves.length);

    setExtensionMode(true);
    setExtensionFen(baseGame.fen());
    setExtensionBaseMoves(baseMoves);
    setExtensionMoves([]);
    setExtensionName(`Extended alternate: ${dynamicAnalysis.playedSan} on move ${moveNumberForIndex(currentIndex)}`);
    setFeedback({ type: "correct", text: `Extension mode started from: ${baseLine}` });
    setDynamicAnalysis(null);
    setDynamicAnalysisStatus("idle");
    setShowAnswer(false);
    setSelectedSquare(null);
    setPreviewFen(null);
    setViewIndex(null);
    setLesson(null);
  }

  function saveExtendedVariation() {
    if (!extensionMode || selectedOpeningId === "custom") return;

    const allMoves = [...extensionBaseMoves, ...extensionMoves];
    const line = formatLineWithMoveNumbers(allMoves);
    saveVariationToStorage({ name: extensionName || "Extended saved variation", line });

    setFeedback({ type: "correct", text: `Saved extended variation: ${line}` });
    setExtensionMode(false);
    setExtensionFen(null);
    setExtensionBaseMoves([]);
    setExtensionMoves([]);
    setExtensionName("");
    setExtensionTopMoves([]);
    setExtensionTopMoveStatus("idle");
  }

  function cancelExtensionMode() {
    setExtensionMode(false);
    setExtensionFen(null);
    setExtensionBaseMoves([]);
    setExtensionMoves([]);
    setExtensionName("");
    setExtensionTopMoves([]);
    setExtensionTopMoveStatus("idle");
    setFeedback(null);
    setSelectedSquare(null);
  }

  function tryExtensionMove(sourceSquare, targetSquare) {
    const currentFen = extensionFen || actualFen;
    const thresholdMoves = filterTopMovesByThreshold(extensionTopMoves, extensionThresholdCp);
    const allowedMoves = extensionMoveMode === "top1"
      ? extensionTopMoves.slice(0, 1)
      : thresholdMoves.slice(0, 3);

    if (extensionTopMoveStatus !== "ready" || allowedMoves.length === 0) {
      setFeedback({ type: "wrong", text: "Stockfish is still analyzing this position. Wait for the extension move list to load, then play one of the accepted moves." });
      return false;
    }

    const extensionGame = new Chess(currentFen);
    let move = null;

    try {
      move = extensionGame.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
    } catch {
      move = null;
    }

    if (!move) {
      setFeedback({ type: "wrong", text: "Illegal move. Try again." });
      return false;
    }

    const playedUci = moveToUci(move);
    const allowedUciMoves = allowedMoves.map((entry) => entry.bestMove);
    const allowedSanMoves = allowedMoves.map((entry) => uciToSan(currentFen, entry.bestMove) || entry.bestMove);

    if (!allowedUciMoves.includes(playedUci)) {
      setFeedback({
        type: "wrong",
        text: `Extension mode accepts ${extensionMoveMode === "top1" ? "only the top Stockfish move" : "one of Stockfish's top 3 moves"}. You played ${move.san}; accepted moves: ${allowedSanMoves.join(", ")}.`,
      });
      return false;
    }

    setExtensionFen(extensionGame.fen());
    setExtensionMoves((prev) => [...prev, move.san]);
    setFeedback({ type: "correct", text: `Added top move to extension: ${move.san}` });
    setSelectedSquare(null);
    return true;
  }

  function startFreePlay() {
    const finalGame = makeGameAtMove(moves, currentIndex);
    setFreePlayMode(true);
    setFreePlayFen(finalGame.fen());
    setFreePlayMoves([]);
    setFeedback({ type: "correct", text: "Free play started. Continue from the final position." });
    setShowAnswer(false);
    setSelectedSquare(null);
    setPreviewFen(null);
    setViewIndex(null);
    setLesson(null);
  }

  function stopFreePlay() {
    setFreePlayMode(false);
    setFreePlayFen(null);
    setFreePlayMoves([]);
    setExtensionMode(false);
    setExtensionFen(null);
    setExtensionBaseMoves([]);
    setExtensionMoves([]);
    setExtensionName("");
    setExtensionTopMoves([]);
    setExtensionTopMoveStatus("idle");
    setFeedback(null);
    setSelectedSquare(null);
  }

  function tryFreePlayMove(sourceSquare, targetSquare) {
    const freeGame = new Chess(freePlayFen || actualFen);
    let move = null;

    try {
      move = freeGame.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
    } catch {
      move = null;
    }

    if (!move) {
      setFeedback({ type: "wrong", text: "Illegal move. Try again." });
      return false;
    }

    setFreePlayFen(freeGame.fen());
    setFreePlayMoves((prev) => [...prev, move.san]);
    setFeedback({ type: "correct", text: `Free play: ${move.san}` });
    setSelectedSquare(null);
    return true;
  }

  function findExplanation(guessedSan) {
    if (!selectedVariation?.explanations) return null;
    const moveExplanations = selectedVariation.explanations[currentIndex];
    if (!moveExplanations) return null;
    return moveExplanations[normalizeMove(guessedSan)] || null;
  }

  function recordMistake(guessedMove, explanation) {
    setMistakes((prev) => [
      {
        moveNumber: moveNumberForIndex(currentIndex),
        side: currentSide,
        guessed: guessedMove || "illegal move",
        correct: currentMove,
        position: buildHistoryItems(moves, currentIndex).map((item) => item.label).join(" "),
        explanationTitle: explanation?.title,
      },
      ...prev,
    ]);
  }

  function openLesson(explanation) {
    if (!explanation?.seeLine) return;
    setLesson({
      title: explanation.title,
      text: explanation.text,
      line: explanation.seeLine,
      moves: parseMoves(explanation.seeLine),
      startFen: makeGameAtMove(moves, currentIndex).fen(),
    });
    setLessonStep(0);
    setViewIndex(null);
  }

  function tryPlayerMove(sourceSquare, targetSquare) {
    if (extensionMode) return tryExtensionMove(sourceSquare, targetSquare);
    if (freePlayMode) return tryFreePlayMove(sourceSquare, targetSquare);
    if (!currentMove || !isQuizTurn || isDone || showAnswer || previewFen || isReviewing) return false;

    const testGame = makeGameAtMove(moves, currentIndex);
    let move = null;

    try {
      move = testGame.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
    } catch {
      move = null;
    }

    if (!move) {
      setFeedback({ type: "wrong", text: "Illegal move. Try again." });
      return false;
    }

    const guessedSan = move.san;
    const correct = normalizeMove(guessedSan) === normalizeMove(currentMove);

    if (correct) {
      setPreviewFen(testGame.fen());
      setFeedback({ type: "correct", text: `Correct: ${guessedSan}` });
      setTimeout(advance, CORRECT_FEEDBACK_DELAY_MS);
      return true;
    }

    const explanation = findExplanation(guessedSan);
    recordMistake(guessedSan, explanation);
    setWrongAttemptsThisMove((count) => count + 1);
    setFeedback({
      type: "wrong",
      text: explanation ? `Not quite. ${explanation.title}` : `Not quite. You played ${guessedSan}. Try again.`,
      explanation,
    });

    setDynamicAnalysis(null);
    setDynamicAnalysisStatus("loading");
    const originalFen = makeGameAtMove(moves, currentIndex).fen();
    const afterFen = testGame.fen();

    analyzeWrongMoveDynamically({
      originalFen,
      afterFen,
      playedSan: guessedSan,
      correctSan: currentMove,
    })
      .then((analysis) => {
        setDynamicAnalysis(analysis);
        setDynamicAnalysisStatus(analysis ? "ready" : "unavailable");
      })
      .catch(() => {
        setDynamicAnalysis(null);
        setDynamicAnalysisStatus("unavailable");
      });

    return false;
  }

  function handleSquareClick(firstArg) {
    const square = typeof firstArg === "object" ? firstArg.square : firstArg;
    if (!square || showAnswer || previewFen || isReviewing) return;

    if (extensionMode || freePlayMode) {
      if (!selectedSquare) {
        const piece = shownGame.get(square);
        if (!piece) return;
        if (piece.color !== shownGame.turn()) return;
        setSelectedSquare(square);
        return;
      }

      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }

      if (extensionMode) {
        tryExtensionMove(selectedSquare, square);
      } else {
        tryFreePlayMove(selectedSquare, square);
      }
      setSelectedSquare(null);
      return;
    }

    if (!isQuizTurn || isDone) return;

    if (!selectedSquare) {
      const piece = game.get(square);
      if (!piece) return;
      const pieceColor = piece.color === "w" ? "White" : "Black";
      if (pieceColor !== quizSide) return;
      setSelectedSquare(square);
      return;
    }

    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }

    tryPlayerMove(selectedSquare, square);
    setSelectedSquare(null);
  }

  function handlePieceDrop(firstArg, secondArg) {
    const sourceSquare = typeof firstArg === "object" ? firstArg.sourceSquare : firstArg;
    const targetSquare = typeof firstArg === "object" ? firstArg.targetSquare : secondArg;
    if (!sourceSquare || !targetSquare) return false;
    return tryPlayerMove(sourceSquare, targetSquare);
  }

  function isDraggablePiece(firstArg, secondArg) {
    if (extensionMode || freePlayMode) {
      if (showAnswer || previewFen || isReviewing) return false;
      const piece = typeof firstArg === "object" ? firstArg.piece : firstArg;
      const sourceSquare = typeof firstArg === "object" ? firstArg.sourceSquare : secondArg;

      if (sourceSquare) {
        const boardPiece = shownGame.get(sourceSquare);
        return !!boardPiece && boardPiece.color === shownGame.turn();
      }

      if (piece) {
        const pieceColor = piece[0] === "w" ? "w" : "b";
        return pieceColor === shownGame.turn();
      }

      return false;
    }

    if (!isQuizTurn || isDone || showAnswer || previewFen || isReviewing) return false;
    const piece = typeof firstArg === "object" ? firstArg.piece : firstArg;
    const sourceSquare = typeof firstArg === "object" ? firstArg.sourceSquare : secondArg;

    if (piece) {
      const pieceColor = piece[0] === "w" ? "White" : "Black";
      return pieceColor === quizSide;
    }

    if (sourceSquare) {
      const boardPiece = game.get(sourceSquare);
      if (!boardPiece) return false;
      const pieceColor = boardPiece.color === "w" ? "White" : "Black";
      return pieceColor === quizSide;
    }

    return false;
  }

  const squareStyles = selectedSquare
    ? { [selectedSquare]: { background: "rgba(250, 204, 21, 0.55)" } }
    : {};

  const chessboardOptions = {
    id: "line-memorizer-board",
    position: shownFen,
    boardOrientation: quizSide === "White" ? "white" : "black",
    onPieceDrop: handlePieceDrop,
    onSquareClick: handleSquareClick,
    isDraggablePiece,
    squareStyles,
    animationDurationInMs: 320,
    snapToCursor: true,
    showNotation: true,
    showBoardNotation: true,
  };

  return (
    <main className="app">
      <section className="hero">
        <div>
          <h1>Opening Lab</h1>
          <p>Practice opening lines, explore variations, and review mistakes on the board.</p>
        </div>
      </section>

      <section className="practice-panel card">
        <div className="practice-header clean-practice-header">
          <div className="practice-title-block">
            <h2>Practice...</h2>
            <p className="muted">Choose an opening, then drill a main line or a random saved variation.</p>
          </div>
        </div>

        <div className="practice-actions refined-actions">
          <button className="primary-action" onClick={resetToMainLine}>Restart main line</button>
          <button onClick={() => resetQuiz(true)}>Restart random variation</button>
          <div className="utility-actions">
            <button className="utility-button" onClick={() => setShowVariationManager((value) => !value)}>
              {showVariationManager ? "Hide manager" : "Variation manager"}
            </button>
          </div>
        </div>

        <div className="opening-select-row">
          <label htmlFor="opening-select">Opening</label>
          <select
            id="opening-select"
            value={selectedOpeningId}
            onChange={(e) => chooseOpening(e.target.value)}
          >
            {OPENINGS.map((opening) => (
              <option key={opening.id} value={opening.id}>
                {opening.name}
              </option>
            ))}
            <option value="custom">Custom Line</option>
          </select>
          <p className="opening-select-description">
            {selectedOpeningId === "custom" ? "Paste any PGN-style move sequence and train either side." : selectedOpening.description}
          </p>
        </div>

        {selectedOpeningId !== "custom" && (
          <div className="opening-side-selector">
            <span>Play as</span>
            <button
              className={quizSide === "White" ? "active" : ""}
              onClick={() => {
                setQuizSide("White");
                resetQuiz(true);
              }}
            >
              White
            </button>
            <button
              className={quizSide === "Black" ? "active" : ""}
              onClick={() => {
                setQuizSide("Black");
                resetQuiz(true);
              }}
            >
              Black
            </button>
          </div>
        )}

        {showVariationManager && selectedOpeningId !== "custom" && (
          <div className="variation-manager">
            <div className="manager-header">
              <div>
                <h3>Variation Manager</h3>
                <p className="muted">View, add, select, or delete saved browser variations for {selectedOpening.name}.</p>
              </div>
            </div>

            <div className="manager-tools">
              <button className="utility-button" onClick={exportSavedVariations}>Export saved variations</button>
              <label className="import-button utility-button">
                Import variations
                <input type="file" accept="application/json,.json" onChange={importSavedVariations} />
              </label>
              <button className="utility-button danger-utility" onClick={clearSavedVariationsForOpening}>Clear this opening</button>
              <button className="utility-button danger-utility" onClick={clearAllSavedVariations}>Clear all saved variations</button>
            </div>

            <div className="manager-grid">
              <div className="manager-section">
                <h4>Saved variations</h4>
                {savedForOpening.length === 0 ? (
                  <p className="muted">No saved variations for this opening yet.</p>
                ) : (
                  <div className="saved-variation-list">
                    {savedForOpening.map((variation, index) => (
                      <div key={`${variation.line}-${index}`} className="saved-variation-item">
                        <div>
                          <strong>{variation.name}</strong>
                          <code>{variation.line}</code>
                        </div>
                        <div className="saved-variation-actions">
                          <button type="button" onClick={() => selectSavedVariation(index)}>Practice</button>
                          <button type="button" className="danger-utility" onClick={() => deleteSavedVariation(selectedOpeningId, index)}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="manager-section">
                <h4>Add variation from scratch</h4>
                <label>Variation name</label>
                <input
                  value={manualVariationName}
                  onChange={(e) => setManualVariationName(e.target.value)}
                  placeholder="e.g. Englund Bf4 alternate"
                />
                <label>PGN-style line</label>
                <textarea
                  value={manualVariationLine}
                  onChange={(e) => setManualVariationLine(e.target.value)}
                  rows={4}
                  placeholder="1. d4 e5 2. dxe5 Nc6 3. Bf4"
                />
                <button type="button" onClick={addManualVariation}>Add variation</button>
              </div>
            </div>
          </div>
        )}

        {selectedOpeningId === "custom" && showCustomEditor && (
          <div className="custom-editor">
            <label>Custom repertoire line</label>
            <textarea
              value={customLineText}
              onChange={(e) => {
                setCustomLineText(e.target.value);
                resetQuiz(false);
              }}
              rows={5}
            />
            <div className="button-row">
              <button className={quizSide === "White" ? "active" : ""} onClick={() => setQuizSide("White")}>
                Train White
              </button>
              <button className={quizSide === "Black" ? "active" : ""} onClick={() => setQuizSide("Black")}>
                Train Black
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="layout">
        <div className="left-column">
          <div className="card">
            <div className="quiz-header">
              <div>
                <p className="eyebrow">Current line</p>
                <h2>{selectedOpeningId === "custom" ? "Custom Line" : selectedOpening.name}</h2>
                {selectedOpeningId !== "custom" && <p className="variation-name">Variation: {selectedVariation.name}{selectedVariation.saved ? " · saved" : ""}</p>}
                {selectedOpeningId !== "custom" && savedForOpening.length > 0 && (
                  <p className="variation-name">Saved variations: {savedForOpening.length}</p>
                )}
              </div>
              <span>{progress}% complete</span>
            </div>

            <div className="side-row">
              <span className="pill">Training {quizSide}</span>
              <span className="pill muted-pill">Move {Math.min(currentIndex + 1, moves.length || 1)} of {moves.length}</span>
              {isReviewing && <button className="small-button" onClick={clearReview}>Return to current position</button>}
            </div>

            <div className="progress-bar"><div style={{ width: `${progress}%` }} /></div>

            <div className="moves-box">
              <div className="label">Moves played — click any move to review that position</div>
              <div className="move-history">
                {historyItems.length === 0 ? (
                  <span className="moves-text">Start position</span>
                ) : (
                  historyItems.map((item) => (
                    <button
                      key={item.index}
                      className={`move-chip ${viewIndex === item.index + 1 ? "selected" : ""}`}
                      onClick={() => {
                        setViewIndex(item.index + 1);
                        setLesson(null);
                      }}
                    >
                      {item.side === "White" && `${item.moveNo}. `}{item.label}
                    </button>
                  ))
                )}
              </div>
              {extensionMode && (
                <div className="freeplay-history">
                  <div className="label">Extension line</div>
                  <div className="move-history">
                    {[...extensionBaseMoves, ...extensionMoves].map((move, index) => (
                      <span key={`${move}-${index}`} className="freeplay-chip">
                        {index % 2 === 0 && `${Math.floor(index / 2) + 1}. `}{move}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {freePlayMoves.length > 0 && (
                <div className="freeplay-history">
                  <div className="label">Free play continuation</div>
                  <div className="move-history">
                    {freePlayMoves.map((move, index) => (
                      <span key={`${move}-${index}`} className="freeplay-chip">
                        {index % 2 === 0 && `${Math.floor(index / 2) + 1}. `}{move}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="status-area">
              {lesson ? (
                <div className="lesson-box">
                  <strong>{lesson.title}</strong>
                  <p>{lesson.text}</p>
                  <code>{lesson.line}</code>
                  <div className="button-row">
                    <button onClick={() => setLessonStep((s) => Math.max(0, s - 1))}>Previous</button>
                    <button onClick={() => setLessonStep((s) => Math.min(lesson.moves.length, s + 1))}>Next</button>
                    <button onClick={clearReview}>Back to drill</button>
                  </div>
                  <p className="muted">Lesson move {lessonStep} of {lesson.moves.length}</p>
                </div>
              ) : extensionMode ? (
                <div className="success-box">
                  <strong>Extending saved variation.</strong>
                  <p>Play both sides from the alternate move. Save when the position feels stable enough to train later.</p>
                  <div className="extension-mode-controls">
                    <span>Accepted moves</span>
                    <button
                      className={extensionMoveMode === "top1" ? "active" : ""}
                      onClick={() => setExtensionMoveMode("top1")}
                    >
                      Top move only
                    </button>
                    <button
                      className={extensionMoveMode === "top3" ? "active" : ""}
                      onClick={() => setExtensionMoveMode("top3")}
                    >
                      Top 3 moves
                    </button>
                    <label className="threshold-control">
                      Within
                      <select
                        value={extensionThresholdCp}
                        onChange={(e) => setExtensionThresholdCp(Number(e.target.value))}
                        disabled={extensionMoveMode === "top1"}
                      >
                        <option value={25}>0.25</option>
                        <option value={50}>0.50</option>
                        <option value={75}>0.75</option>
                        <option value={100}>1.00</option>
                        <option value={150}>1.50</option>
                      </select>
                      pawns of best
                    </label>
                  </div>
                  <div className="extension-top-moves">
                    <strong>Current Stockfish options</strong>
                    {extensionTopMoveStatus === "loading" && <p>Analyzing accepted moves...</p>}
                    {extensionTopMoveStatus === "unavailable" && <p>No engine move list available yet.</p>}
                    {extensionTopMoveStatus === "ready" && (
                      <ol>
                        {(extensionMoveMode === "top1"
                          ? extensionTopMoves.slice(0, 1)
                          : filterTopMovesByThreshold(extensionTopMoves, extensionThresholdCp).slice(0, 3)
                        ).map((entry) => (
                          <li key={`${entry.multiPv}-${entry.bestMove}`}>
                            <span>{formatTopMoveOption(shownFen, entry)}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                  <div className="ending-guidelines">
                    <strong>When to end the variation</strong>
                    <ul>
                      <li>The tactical sequence is resolved.</li>
                      <li>The queen or piece chase is over.</li>
                      <li>Both sides have developed normally.</li>
                      <li>The king is safe, castled, or clearly about to castle.</li>
                      <li>There is no obvious forcing move left.</li>
                      <li>The eval has stabilized and you understand the plan.</li>
                    </ul>
                  </div>
                  <div className="extension-name-row">
                    <label>Variation name</label>
                    <input
                      value={extensionName}
                      onChange={(e) => setExtensionName(e.target.value)}
                      placeholder="Name this variation"
                    />
                  </div>
                  <div className="button-row">
                    <button onClick={saveExtendedVariation}>Save extended variation</button>
                    <button onClick={cancelExtensionMode}>Cancel</button>
                  </div>
                </div>
              ) : freePlayMode ? (
                <div className="success-box">
                  <strong>Free play mode.</strong>
                  <p>Keep playing legal moves from the final position. The eval bar will keep updating.</p>
                  <div className="button-row">
                    <button onClick={stopFreePlay}>Exit free play</button>
                  </div>
                </div>
              ) : isDone ? (
                <div className="success-box">
                  <strong>Line complete.</strong>
                  <p>Start free play to see how the position can continue.</p>
                  <div className="button-row">
                    <button onClick={startFreePlay}>Continue from here</button>
                    <button onClick={() => resetQuiz(true)}>New random variation</button>
                  </div>
                </div>
              ) : !isQuizTurn ? (
                <div className="opponent-box"><p>Opponent to move. {opponentThinking ? "Thinking..." : "Playing move..."}</p></div>
              ) : isReviewing ? (
                <div className="answer-box"><p>You are reviewing a past position.</p><button onClick={clearReview}>Return to current position</button></div>
              ) : (
                <div className="answer-box">
                  <p>Your move: <strong>Move {moveNumberForIndex(currentIndex)} for {currentSide}</strong></p>
                  <p className="muted">Drag and drop the piece where it belongs. Click-to-move still works too.</p>
                  <div className="hint-row">
                    {wrongAttemptsThisMove > 0 && <button type="button" onClick={() => setShowAnswer(true)}>Show answer</button>}
                    {feedback?.explanation?.seeLine && <button type="button" onClick={() => openLesson(feedback.explanation)}>See line</button>}
                    {showAnswer && <button type="button" onClick={advance}>Skip to next move</button>}
                  </div>
                  {showAnswer && <p className="answer-reveal">Correct move: <strong>{currentMove}</strong></p>}
                </div>
              )}
            </div>

            <div className="feedback-area">
              {feedback && (
                <div className={`feedback ${feedback.type}`}>
                  {feedback.text}
                  {feedback.explanation?.text && <p>{feedback.explanation.text}</p>}
                  {dynamicAnalysisStatus === "loading" && <p>Analyzing with Stockfish...</p>}
                  {dynamicAnalysisStatus === "unavailable" && <p>Dynamic analysis unavailable for this move.</p>}
                  {dynamicAnalysisStatus === "ready" && dynamicAnalysis && (
                    <div className={`dynamic-analysis ${dynamicAnalysis.isPlayableAlternative ? "playable" : ""}`}>
                      <p><strong>{dynamicAnalysis.isPlayableAlternative ? "Playable alternate line" : "Engine comparison"}</strong></p>
                      <p>You played: <strong>{dynamicAnalysis.playedSan}</strong></p>
                      <p>Repertoire move: <strong>{dynamicAnalysis.repertoireMove}</strong></p>
                      <p>Engine prefers: <strong>{dynamicAnalysis.bestSan}</strong></p>
                      <p>Eval before: <strong>{dynamicAnalysis.evalBefore}</strong> → after your move: <strong>{dynamicAnalysis.evalAfter}</strong> ({dynamicAnalysis.swing})</p>
                      <p>{dynamicAnalysis.explanation}</p>
                      {dynamicAnalysis.isPlayableAlternative && selectedOpeningId !== "custom" && (
                        <button type="button" onClick={savePlayableAlternative}>
                          Add this as a saved variation
                        </button>
                      )}
                      {dynamicAnalysis.isPlayableAlternative && selectedOpeningId !== "custom" && (
                        <button type="button" onClick={startExtensionFromPlayableAlternative}>
                          Extend this variation
                        </button>
                      )}
                      {dynamicAnalysis.engineLineAfterMistake.length > 0 && (
                        <p>Line after your move: <code>{dynamicAnalysis.engineLineAfterMistake.join(" ")}</code></p>
                      )}
                      {dynamicAnalysis.engineLineBest.length > 0 && (
                        <p>Engine line with best move: <code>{dynamicAnalysis.engineLineBest.join(" ")}</code></p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h2>Mistake review</h2>
            {mistakes.length === 0 ? (
              <p className="muted">No mistakes yet.</p>
            ) : (
              <div className="mistakes">
                {mistakes.slice(0, 8).map((m, i) => (
                  <div key={i} className="mistake">
                    <strong>Move {m.moveNumber}, {m.side}: {m.correct}</strong>
                    <div>You played: {m.guessed}</div>
                    {m.explanationTitle && <small>{m.explanationTitle}</small>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="board-card">
          <div className="board-with-eval">
            <div className="eval-wrap">
              <div className="eval-number">{evalStatus === "loading" ? "…" : formatEval(engineEval)}</div>
              <div className="eval-bar" title="Local Stockfish evaluation">
                <div className="eval-black" style={{ height: `${100 - evalHeight}%` }} />
                <div className="eval-white" style={{ height: `${evalHeight}%` }} />
              </div>
              <div className="eval-source">
                {evalStatus === "ready" && engineEval?.depth ? `SF d${engineEval.depth}` : evalStatus === "analyzing" ? "SF..." : evalStatus === "unavailable" ? "no SF" : "SF"}
              </div>
            </div>
            <div className="board-shell"><Chessboard options={chessboardOptions} /></div>
          </div>
        </div>
      </section>
    </main>
  );
}
