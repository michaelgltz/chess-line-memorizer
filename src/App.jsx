import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import DesktopLayout from "./components/DesktopLayout.jsx";
import MobileLayout from "./components/MobileLayout.jsx";
import { OPENINGS } from "./data/openings.js";
import useMediaQuery from "./hooks/useMediaQuery.js";
import {
  buildHistoryItems,
  formatLineWithMoveNumbers,
  legalTargetsForSquare,
  makeGameAtMove,
  makeGameFromFenAndMoves,
  moveNumberForIndex,
  moveToUci,
  normalizeMove,
  parseMoves,
  pieceTypeColor,
  sideForIndex,
  uciToSan,
} from "./lib/chess.js";
import {
  analyzeFenWithTemporaryStockfish,
  analyzeTopMovesWithTemporaryStockfish,
  analyzeWrongMoveDynamically,
  ENGINE_DEPTH,
  filterTopMovesByThreshold,
  formatEval,
  formatThresholdPawns,
  formatTopMoveOption,
  parseBestMove,
  parseStockfishInfo,
  scoreFromWhitePerspective,
  scoreToComparableNumber,
  STOCKFISH_PATH,
  whiteEvalHeight,
} from "./lib/stockfish.js";
import {
  chooseVariationIndexForPracticeMode,
  PRACTICE_MODES,
  summarizeTrainingMemory,
  TRAINING_MEMORY_STORAGE_KEY,
  trainingPositionKey,
  updateTrainingMemoryRecord,
} from "./lib/trainingMemory.js";
import {
  buildMoveTree,
  buildVariationCatalog,
  buildVariationEntries,
  chooseRandomTreeEdge,
  chooseTreeContinuation,
  findMoveTreeNode,
  findTreeEdge,
  SAVED_VARIATIONS_STORAGE_KEY,
  summarizeTreeBranches,
  variationDedupeKey,
} from "./lib/variations.js";
import "./App.css";

const OPPONENT_DELAY_MIN_MS = 250;
const OPPONENT_DELAY_MAX_MS = 500;
const CORRECT_FEEDBACK_DELAY_MS = 850;
const DRAGGING_PIECE_STYLE = {
  transform: "scale(1.1)",
  maxWidth: "min(18vw, 78px)",
  maxHeight: "min(18vw, 78px)",
  filter: "drop-shadow(0 10px 18px rgba(15, 23, 42, 0.35))",
  zIndex: 40,
};
const DRAGGING_PIECE_GHOST_STYLE = {
  opacity: 0.35,
};

export default function App() {
  const isMobileLayout = useMediaQuery("(max-width: 900px)");
  const [savedVariations, setSavedVariations] = useState(() => {
    try {
      const raw = localStorage.getItem(SAVED_VARIATIONS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [trainingMemory, setTrainingMemory] = useState(() => {
    try {
      const raw = localStorage.getItem(TRAINING_MEMORY_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [selectedOpeningId, setSelectedOpeningId] = useState(OPENINGS[0].id);
  const [selectedVariationIndex, setSelectedVariationIndex] = useState(0);
  const [practiceMode, setPracticeMode] = useState("random");
  const [customLineText, setCustomLineText] = useState(OPENINGS[0].variations[0].line);
  const [plannedMoves, setPlannedMoves] = useState(() => parseMoves(OPENINGS[0].variations[0].line));
  const [quizSide, setQuizSide] = useState("White");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewIndex, setViewIndex] = useState(null);
  const [freePlayViewIndex, setFreePlayViewIndex] = useState(null);
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
  const [editingVariationIndex, setEditingVariationIndex] = useState(null);
  const [editingVariationName, setEditingVariationName] = useState("");
  const [editingVariationLine, setEditingVariationLine] = useState("");
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
      localStorage.setItem(SAVED_VARIATIONS_STORAGE_KEY, JSON.stringify(savedVariations));
    } catch {
      // Ignore localStorage write errors.
    }
  }, [savedVariations]);

  useEffect(() => {
    try {
      localStorage.setItem(TRAINING_MEMORY_STORAGE_KEY, JSON.stringify(trainingMemory));
    } catch {
      // Ignore localStorage write errors.
    }
  }, [trainingMemory]);

  const selectedOpening = OPENINGS.find((opening) => opening.id === selectedOpeningId) || OPENINGS[0];
  const savedForOpening = useMemo(
    () => savedVariations[selectedOpeningId] || [],
    [savedVariations, selectedOpeningId],
  );
  const variationCatalog = useMemo(() => (
    selectedOpeningId === "custom"
      ? buildVariationCatalog([], [])
      : buildVariationCatalog(selectedOpening.variations || [], savedForOpening)
  ), [savedForOpening, selectedOpening, selectedOpeningId]);
  const availableVariations = variationCatalog.playableVariations;
  const variationEntries = useMemo(() => buildVariationEntries(availableVariations), [availableVariations]);
  const moveTree = useMemo(() => buildMoveTree(variationEntries), [variationEntries]);
  const selectedVariation = availableVariations[selectedVariationIndex] || availableVariations[0];
  const moves = useMemo(() => (
    selectedOpeningId === "custom" ? parseMoves(customLineText) : plannedMoves
  ), [customLineText, plannedMoves, selectedOpeningId]);

  const game = useMemo(() => makeGameAtMove(moves, currentIndex), [moves, currentIndex]);
  const actualFen = game.fen();
  const reviewGame = useMemo(() => (viewIndex === null ? null : makeGameAtMove(moves, viewIndex)), [moves, viewIndex]);
  const freePlayReviewGame = useMemo(() => {
    if (freePlayViewIndex === null) return null;
    return makeGameAtMove([...moves, ...freePlayMoves], moves.length + freePlayViewIndex);
  }, [freePlayMoves, freePlayViewIndex, moves]);
  const lessonGame = useMemo(() => {
    if (!lesson) return null;
    return makeGameFromFenAndMoves(lesson.startFen, lesson.moves, lessonStep);
  }, [lesson, lessonStep]);

  const shownFen = lessonGame?.fen() || freePlayReviewGame?.fen() || reviewGame?.fen() || previewFen || extensionFen || freePlayFen || actualFen;
  const shownGame = useMemo(() => new Chess(shownFen), [shownFen]);
  const sideToMove = shownGame.turn();
  latestSideToMoveRef.current = sideToMove;

  const currentTreeNode = useMemo(() => (
    selectedOpeningId === "custom" ? null : findMoveTreeNode(moveTree, moves.slice(0, currentIndex))
  ), [currentIndex, moveTree, moves, selectedOpeningId]);
  const currentMove = moves[currentIndex] || currentTreeNode?.children?.[0]?.san;
  const currentSide = sideForIndex(currentIndex);
  const isQuizTurn = currentSide === quizSide;
  const isDone = !currentMove && currentIndex >= moves.length;
  const isReviewing = viewIndex !== null || freePlayViewIndex !== null || lesson !== null;
  const progress = moves.length ? Math.round((Math.min(currentIndex, moves.length) / moves.length) * 100) : 0;
  const evalHeight = whiteEvalHeight(engineEval);
  const historyItems = buildHistoryItems(moves, currentIndex);
  const reviewTreeNode = useMemo(() => (
    selectedOpeningId === "custom" || viewIndex === null ? null : findMoveTreeNode(moveTree, moves.slice(0, viewIndex))
  ), [moveTree, moves, selectedOpeningId, viewIndex]);
  const branchSummary = useMemo(() => {
    const shouldRevealCurrentBranches = !!feedback || showAnswer || isDone;
    const sourceNode = reviewTreeNode || (shouldRevealCurrentBranches ? currentTreeNode : null);
    return summarizeTreeBranches(sourceNode, variationEntries);
  }, [currentTreeNode, feedback, isDone, reviewTreeNode, showAnswer, variationEntries]);
  const trainingSummary = useMemo(() => (
    selectedOpeningId === "custom"
      ? { positions: 0, attempts: 0, weak: 0, due: 0, accuracy: null }
      : summarizeTrainingMemory(trainingMemory, selectedOpeningId)
  ), [selectedOpeningId, trainingMemory]);

  useEffect(() => {
    const worker = new Worker(STOCKFISH_PATH);
    stockfishRef.current = worker;

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
      return;
    }

    setOpponentThinking(true);
    const delay = OPPONENT_DELAY_MIN_MS + Math.floor(Math.random() * (OPPONENT_DELAY_MAX_MS - OPPONENT_DELAY_MIN_MS + 1));
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
    setFreePlayViewIndex(null);
    setLesson(null);
    setLessonStep(0);
  }

  function resetToMainLine() {
    resetQuiz(false, selectedOpeningId, 0);
  }

  function resetQuiz(
    randomizeVariation = true,
    openingId = selectedOpeningId,
    forcedVariationIndex = null,
    quizSideOverride = quizSide,
    practiceModeOverride = practiceMode,
  ) {
    const opening = OPENINGS.find((o) => o.id === openingId) || OPENINGS[0];
    const variations = openingId === "custom"
      ? []
      : buildVariationCatalog(opening.variations || [], savedVariations[openingId] || []).playableVariations;

    if (openingId !== "custom" && variations.length > 0) {
      const nextVariationIndex = forcedVariationIndex !== null
        ? Math.max(0, Math.min(forcedVariationIndex, variations.length - 1))
        : randomizeVariation
          ? chooseVariationIndexForPracticeMode({
              mode: practiceModeOverride,
              openingId,
              variations,
              quizSide: quizSideOverride,
              trainingMemory,
            })
          : Math.max(0, Math.min(selectedVariationIndex, variations.length - 1));

      setSelectedVariationIndex(nextVariationIndex);
      setPlannedMoves(parseMoves(variations[nextVariationIndex].line));
    }

    setCurrentIndex(0);
    setViewIndex(null);
    setFreePlayViewIndex(null);
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
      resetQuiz(false, "custom");
      return;
    }

    const nextOpening = OPENINGS.find((opening) => opening.id === openingId);
    if (!nextOpening) return;

    setSelectedOpeningId(nextOpening.id);
    const nextVariations = buildVariationCatalog(
      nextOpening.variations || [],
      savedVariations[nextOpening.id] || [],
    ).playableVariations;
    const nextVariationIndex = nextVariations.length
      ? chooseVariationIndexForPracticeMode({
          mode: practiceMode,
          openingId: nextOpening.id,
          variations: nextVariations,
          quizSide,
          trainingMemory,
        })
      : 0;
    setSelectedVariationIndex(nextVariationIndex);
    setPlannedMoves(parseMoves(nextVariations[nextVariationIndex]?.line || ""));
    setShowCustomEditor(false);
    setCurrentIndex(0);
    setViewIndex(null);
    setFreePlayViewIndex(null);
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
    setCurrentIndex((i) => i + 1);
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
    if (selectedOpeningId !== "custom" && currentTreeNode?.children?.length) {
      const edge = chooseRandomTreeEdge(currentTreeNode);
      const continuation = chooseTreeContinuation(variationEntries, edge, {
        randomize: true,
        preferredVariationIndex: selectedVariationIndex,
      });

      if (continuation) {
        setSelectedVariationIndex(continuation.index);
        setPlannedMoves(continuation.moves);
      }
    }
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

    const saveResult = saveVariationToStorage({ name, line });
    if (!saveResult.saved) {
      setFeedback({
        type: "wrong",
        text: saveResult.reason === "built-in"
          ? `That line is already included as a built-in line: ${saveResult.duplicateName}.`
          : `That line is already saved as: ${saveResult.duplicateName}.`,
      });
      return;
    }

    setManualVariationName("");
    setManualVariationLine("");
    setFeedback({ type: "correct", text: `Added saved variation: ${name}` });
  }

  function startEditingSavedVariation(variationIndex) {
    const variation = savedForOpening[variationIndex];
    if (!variation) return;

    setEditingVariationIndex(variationIndex);
    setEditingVariationName(variation.name || "");
    setEditingVariationLine(variation.line || "");
  }

  function cancelEditingSavedVariation() {
    setEditingVariationIndex(null);
    setEditingVariationName("");
    setEditingVariationLine("");
  }

  function saveEditedVariation() {
    if (selectedOpeningId === "custom" || editingVariationIndex === null) return;

    const name = editingVariationName.trim() || `Saved variation ${editingVariationIndex + 1}`;
    const line = editingVariationLine.trim();

    if (!line) {
      setFeedback({ type: "wrong", text: "Variation line cannot be empty." });
      return;
    }

    try {
      const testMoves = parseMoves(line);
      makeGameAtMove(testMoves, testMoves.length);
    } catch {
      setFeedback({ type: "wrong", text: "That edited line could not be parsed. Check the move order and notation." });
      return;
    }

    const editingRow = variationCatalog.savedRows.find((row) => row.sourceIndex === editingVariationIndex);
    const editedWasSelected = !editingRow?.duplicateOf && selectedVariationIndex === editingRow?.playableIndex;
    const nextForOpening = savedForOpening.map((variation, index) => (
      index === editingVariationIndex
        ? {
            ...variation,
            name,
            line,
            updatedAt: new Date().toISOString(),
          }
        : variation
    ));

    setSavedVariations((prev) => ({
      ...prev,
      [selectedOpeningId]: nextForOpening,
    }));

    if (editedWasSelected) {
      const nextCatalog = buildVariationCatalog(selectedOpening.variations || [], nextForOpening);
      const nextEditingRow = nextCatalog.savedRows.find((row) => row.sourceIndex === editingVariationIndex);
      const nextVariation = nextCatalog.playableVariations[nextEditingRow?.playableIndex] || nextCatalog.playableVariations[0];
      setSelectedVariationIndex(nextEditingRow?.playableIndex || 0);
      setPlannedMoves(parseMoves(nextVariation?.line || line));
    }

    cancelEditingSavedVariation();
    setFeedback({ type: "correct", text: `Updated saved variation: ${name}` });
  }

  function duplicateSavedVariation(variationIndex) {
    if (selectedOpeningId === "custom") return;
    const variation = savedForOpening[variationIndex];
    if (!variation) return;

    const copy = {
      ...variation,
      name: `${variation.name || "Saved variation"} copy`,
      saved: true,
      createdAt: new Date().toISOString(),
      updatedAt: undefined,
    };

    setSavedVariations((prev) => ({
      ...prev,
      [selectedOpeningId]: [...(prev[selectedOpeningId] || []), copy],
    }));

    setFeedback({ type: "correct", text: `Duplicated saved variation: ${copy.name}` });
  }

  function selectVariation(variationIndex) {
    const variation = availableVariations[variationIndex];
    if (!variation) return;

    setSelectedVariationIndex(variationIndex);
    setPlannedMoves(parseMoves(variation.line || ""));
    resetQuiz(false, selectedOpeningId, variationIndex);
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
    if (selectedOpeningId === "custom") return { saved: false, reason: "custom", duplicateName: "" };

    const lineKey = variationDedupeKey(line);
    const builtInDuplicate = lineKey
      ? (selectedOpening.variations || []).find((variation) => variationDedupeKey(variation.line) === lineKey)
      : null;

    if (builtInDuplicate) {
      return { saved: false, reason: "built-in", duplicateName: builtInDuplicate.name || "built-in line" };
    }

    const existing = savedVariations[selectedOpeningId] || [];
    const savedDuplicate = lineKey
      ? existing.find((variation) => variationDedupeKey(variation.line) === lineKey)
      : existing.find((variation) => variation.line === line);

    if (savedDuplicate) {
      return { saved: false, reason: "saved", duplicateName: savedDuplicate.name || "saved variation" };
    }

    const newVariation = {
      name,
      line,
      explanations: {},
      saved: true,
      createdAt: new Date().toISOString(),
    };

    setSavedVariations((prev) => {
      return {
        ...prev,
        [selectedOpeningId]: [...(prev[selectedOpeningId] || []), newVariation],
      };
    });

    return { saved: true, reason: "", duplicateName: "" };
  }

  function savePlayableAlternative() {
    if (!dynamicAnalysis?.isPlayableAlternative || selectedOpeningId === "custom") return;

    const newMoves = [...moves.slice(0, currentIndex), dynamicAnalysis.playedSan];
    const newLine = formatLineWithMoveNumbers(newMoves);
    const variationName = `Saved alternate: ${dynamicAnalysis.playedSan} on move ${moveNumberForIndex(currentIndex)}`;

    const saveResult = saveVariationToStorage({ name: variationName, line: newLine });

    setFeedback({
      type: saveResult.saved ? "correct" : "wrong",
      text: saveResult.saved
        ? `Saved ${dynamicAnalysis.playedSan} as a new variation under ${selectedOpening.name}.`
        : `That alternate is already covered by ${saveResult.duplicateName}.`,
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
    setFreePlayViewIndex(null);
    setLesson(null);
  }

  function saveExtendedVariation() {
    if (!extensionMode || selectedOpeningId === "custom") return;

    const allMoves = [...extensionBaseMoves, ...extensionMoves];
    const line = formatLineWithMoveNumbers(allMoves);
    const saveResult = saveVariationToStorage({ name: extensionName || "Extended saved variation", line });

    setFeedback({
      type: saveResult.saved ? "correct" : "wrong",
      text: saveResult.saved
        ? `Saved extended variation: ${line}`
        : `That extended line is already covered by ${saveResult.duplicateName}.`,
    });
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
    let move;

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
      if (extensionMoveMode === "top1") {
        setFeedback({
          type: "wrong",
          text: `Extension mode accepts only the top Stockfish move. You played ${move.san}; accepted move: ${allowedSanMoves.join(", ")}.`,
        });
        return false;
      }

      const topScore = scoreToComparableNumber(extensionTopMoves[0]);
      if (topScore === null) {
        setFeedback({ type: "wrong", text: "Stockfish did not return a usable score for this position yet. Try again after the move list refreshes." });
        return false;
      }

      const playedSan = move.san;
      const afterFen = extensionGame.fen();
      setFeedback({ type: "correct", text: `Checking ${playedSan} against the ${formatThresholdPawns(extensionThresholdCp)} pawn range...` });
      setSelectedSquare(null);

      analyzeFenWithTemporaryStockfish(afterFen, ENGINE_DEPTH)
        .then((rawScore) => {
          const replyScore = scoreToComparableNumber(rawScore);
          const playedScore = replyScore === null ? null : -replyScore;

          if (playedScore === null) {
            setFeedback({ type: "wrong", text: `Stockfish could not score ${playedSan}. Try one of the listed moves: ${allowedSanMoves.join(", ")}.` });
            return;
          }

          const gap = topScore - playedScore;
          if (gap <= extensionThresholdCp) {
            setExtensionFen(afterFen);
            setExtensionMoves((prev) => [...prev, playedSan]);
            setFeedback({
              type: "correct",
              text: `Added ${playedSan} to the extension. It is within ${formatThresholdPawns(extensionThresholdCp)} pawns of Stockfish's best move.`,
            });
            return;
          }

          setFeedback({
            type: "wrong",
            text: `${playedSan} is legal, but it is about ${(gap / 100).toFixed(2)} pawns worse than Stockfish's best move. Current range: ${formatThresholdPawns(extensionThresholdCp)} pawns.`,
          });
        })
        .catch(() => {
          setFeedback({ type: "wrong", text: `Could not analyze ${playedSan}. Try one of the listed moves: ${allowedSanMoves.join(", ")}.` });
        });

      return false;
    }

    setExtensionFen(extensionGame.fen());
    setExtensionMoves((prev) => [...prev, move.san]);
    setFeedback({ type: "correct", text: `Added accepted move to extension: ${move.san}` });
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
    setFreePlayViewIndex(null);
    setLesson(null);
  }

  function stopFreePlay() {
    setFreePlayMode(false);
    setFreePlayFen(null);
    setFreePlayMoves([]);
    setFreePlayViewIndex(null);
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
    let move;

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
    setFreePlayViewIndex(null);
    setFeedback({ type: "correct", text: `Free play: ${move.san}` });
    setSelectedSquare(null);
    return true;
  }

  function rememberTrainingAttempt({ outcome, playedSan = "", expectedSan = currentMove }) {
    if (selectedOpeningId === "custom" || !expectedSan || !isQuizTurn) return;

    const positionGame = makeGameAtMove(moves, currentIndex);
    const fen = positionGame.fen();
    const key = trainingPositionKey(selectedOpeningId, fen, expectedSan);

    setTrainingMemory((prev) => updateTrainingMemoryRecord(prev, {
      key,
      openingId: selectedOpeningId,
      openingName: selectedOpening.name,
      variationName: selectedVariation?.name || "Current line",
      variationSaved: !!selectedVariation?.saved,
      fen,
      expectedSan,
      playedSan,
      side: currentSide,
      moveNumber: moveNumberForIndex(currentIndex),
      history: buildHistoryItems(moves, currentIndex).map((item) => item.label).join(" "),
      outcome,
    }));
  }

  function revealAnswer() {
    rememberTrainingAttempt({ outcome: "answer" });
    setShowAnswer(true);
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
    setFreePlayViewIndex(null);
  }

  function tryPlayerMove(sourceSquare, targetSquare) {
    if (extensionMode) return tryExtensionMove(sourceSquare, targetSquare);
    if (freePlayMode) return tryFreePlayMove(sourceSquare, targetSquare);
    if (!currentMove || !isQuizTurn || isDone || showAnswer || previewFen || isReviewing) return false;

    const testGame = makeGameAtMove(moves, currentIndex);
    let move;

    try {
      move = testGame.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
    } catch {
      setFeedback({ type: "wrong", text: "Illegal move. Try again." });
      return false;
    }

    if (!move) {
      setFeedback({ type: "wrong", text: "Illegal move. Try again." });
      return false;
    }

    const guessedSan = move.san;
    const treeEdge = selectedOpeningId === "custom"
      ? null
      : findTreeEdge(currentTreeNode, guessedSan);
    const correct = treeEdge ? true : normalizeMove(guessedSan) === normalizeMove(currentMove);

    if (correct) {
      rememberTrainingAttempt({
        outcome: wrongAttemptsThisMove > 0 ? "correct-after-retry" : "correct",
        playedSan: guessedSan,
        expectedSan: treeEdge ? guessedSan : currentMove,
      });

      if (treeEdge) {
        const continuation = chooseTreeContinuation(variationEntries, treeEdge, {
          randomize: true,
          preferredVariationIndex: selectedVariationIndex,
        });

        if (continuation) {
          setSelectedVariationIndex(continuation.index);
          setPlannedMoves(continuation.moves);
        }
      }

      setPreviewFen(testGame.fen());
      setFeedback({ type: "correct", text: treeEdge && normalizeMove(guessedSan) !== normalizeMove(currentMove) ? `Correct branch: ${guessedSan}` : `Correct: ${guessedSan}` });
      setTimeout(advance, CORRECT_FEEDBACK_DELAY_MS);
      return true;
    }

    const explanation = findExplanation(guessedSan);
    rememberTrainingAttempt({ outcome: "wrong", playedSan: guessedSan, expectedSan: currentMove });
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
      const piece = shownGame.get(square);

      if (!selectedSquare) {
        if (!piece) return;
        if (piece.color !== shownGame.turn()) return;
        setSelectedSquare(square);
        return;
      }

      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }

      const legalTargets = legalTargetsForSquare(shownGame, selectedSquare);
      if (!legalTargets.includes(square)) {
        if (piece?.color === shownGame.turn()) {
          setSelectedSquare(square);
          return;
        }

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

    const piece = game.get(square);

    if (!selectedSquare) {
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

    const legalTargets = legalTargetsForSquare(game, selectedSquare);
    if (!legalTargets.includes(square)) {
      const pieceColor = piece?.color === "w" ? "White" : "Black";
      if (piece && pieceColor === quizSide) {
        setSelectedSquare(square);
        return;
      }

      setSelectedSquare(null);
      return;
    }

    tryPlayerMove(selectedSquare, square);
    setSelectedSquare(null);
  }

  function handlePieceDrop(firstArg, secondArg) {
    const sourceSquare = typeof firstArg === "object" ? firstArg.sourceSquare : firstArg;
    const targetSquare = typeof firstArg === "object" ? firstArg.targetSquare : secondArg;
    if (!sourceSquare || !targetSquare || isReviewing) return false;
    setSelectedSquare(null);

    if (sourceSquare === targetSquare) return true;

    const dropGame = extensionMode || freePlayMode ? shownGame : game;
    const legalTargets = legalTargetsForSquare(dropGame, sourceSquare);
    if (!legalTargets.includes(targetSquare)) return false;

    return tryPlayerMove(sourceSquare, targetSquare);
  }

  function handlePieceDrag(firstArg, secondArg) {
    if (showAnswer || previewFen || isReviewing) return;

    const sourceSquare = typeof firstArg === "object" ? firstArg.square : secondArg;
    if (!sourceSquare) return;

    if (isDraggablePiece(firstArg, secondArg)) {
      setSelectedSquare(sourceSquare);
    }
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
        const pieceColor = pieceTypeColor(piece);
        return pieceColor === (shownGame.turn() === "w" ? "White" : "Black");
      }

      return false;
    }

    if (!isQuizTurn || isDone || showAnswer || previewFen || isReviewing) return false;
    const piece = typeof firstArg === "object" ? firstArg.piece : firstArg;
    const sourceSquare = typeof firstArg === "object" ? firstArg.sourceSquare : secondArg;

    if (piece) {
      const pieceColor = pieceTypeColor(piece);
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

  const legalMoveGame = extensionMode || freePlayMode ? shownGame : game;
  const legalTargetSquares = selectedSquare
    ? legalTargetsForSquare(legalMoveGame, selectedSquare)
    : [];
  const squareStyles = {
    ...(selectedSquare ? { [selectedSquare]: { backgroundColor: "rgba(250, 204, 21, 0.55)" } } : {}),
    ...legalTargetSquares.reduce((styles, square) => {
      const hasPiece = !!legalMoveGame.get(square);
      styles[square] = {
        ...(styles[square] || {}),
        backgroundImage: hasPiece
          ? "radial-gradient(circle, transparent 58%, rgba(15, 23, 42, 0.42) 60%, rgba(15, 23, 42, 0.42) 68%, transparent 70%)"
          : "radial-gradient(circle, rgba(15, 23, 42, 0.38) 18%, transparent 20%)",
      };
      return styles;
    }, {}),
  };

  const chessboardOptions = {
    id: "line-memorizer-board",
    position: shownFen,
    boardOrientation: quizSide === "White" ? "white" : "black",
    onPieceDrop: handlePieceDrop,
    onPieceDrag: handlePieceDrag,
    onSquareClick: handleSquareClick,
    canDragPiece: isDraggablePiece,
    isDraggablePiece,
    squareStyles,
    draggingPieceStyle: DRAGGING_PIECE_STYLE,
    draggingPieceGhostStyle: DRAGGING_PIECE_GHOST_STYLE,
    animationDurationInMs: 320,
    snapToCursor: true,
    showNotation: true,
    showBoardNotation: true,
  };
  const filteredExtensionTopMoves = extensionMoveMode === "top1"
    ? extensionTopMoves.slice(0, 1)
    : filterTopMovesByThreshold(extensionTopMoves, extensionThresholdCp).slice(0, 3);
  const practicePanelProps = {
    customLineText,
    manualVariationLine,
    manualVariationName,
    editingVariationIndex,
    editingVariationLine,
    editingVariationName,
    openings: OPENINGS,
    practiceMode,
    practiceModes: PRACTICE_MODES,
    quizSide,
    savedForOpening,
    selectedOpening,
    selectedOpeningId,
    selectedVariationIndex,
    showCustomEditor,
    showVariationManager,
    onAddManualVariation: addManualVariation,
    onChooseOpening: chooseOpening,
    onClearAllSavedVariations: clearAllSavedVariations,
    onClearSavedVariationsForOpening: clearSavedVariationsForOpening,
    onCustomLineTextChange: setCustomLineText,
    variationCatalog,
    onDeleteSavedVariation: deleteSavedVariation,
    onDuplicateSavedVariation: duplicateSavedVariation,
    onCancelEditingSavedVariation: cancelEditingSavedVariation,
    onExportSavedVariations: exportSavedVariations,
    onImportSavedVariations: importSavedVariations,
    onSaveEditedVariation: saveEditedVariation,
    onEditingVariationLineChange: setEditingVariationLine,
    onEditingVariationNameChange: setEditingVariationName,
    onManualVariationLineChange: setManualVariationLine,
    onManualVariationNameChange: setManualVariationName,
    onResetMainLine: resetToMainLine,
    onResetQuiz: resetQuiz,
    onSelectVariation: selectVariation,
    onSetPracticeMode: setPracticeMode,
    onSetQuizSide: setQuizSide,
    onStartEditingSavedVariation: startEditingSavedVariation,
    onToggleVariationManager: () => setShowVariationManager((value) => !value),
    trainingSummary,
  };
  const currentLineProps = {
    currentIndex,
    currentMove,
    currentSide,
    branchSummary,
    dynamicAnalysis,
    dynamicAnalysisStatus,
    extensionBaseMoves,
    extensionMode,
    extensionMoveMode,
    extensionMoves,
    extensionName,
    extensionThresholdCp,
    extensionTopMoveStatus,
    feedback,
    filteredExtensionTopMoves,
    freePlayMode,
    freePlayMoves,
    freePlayViewIndex,
    historyItems,
    isDone,
    isQuizTurn,
    isReviewing,
    lesson,
    lessonStep,
    moves,
    opponentThinking,
    progress,
    quizSide,
    savedForOpening,
    selectedOpening,
    selectedOpeningId,
    selectedVariation,
    showAnswer,
    shownFen,
    treeBranchCount: currentTreeNode?.children?.length || 0,
    viewIndex,
    wrongAttemptsThisMove,
    formatTopMoveOption,
    moveNumberForIndex,
    onAdvance: advance,
    onCancelExtensionMode: cancelExtensionMode,
    onClearReview: clearReview,
    onOpenLesson: openLesson,
    onResetQuiz: resetQuiz,
    onRevealAnswer: revealAnswer,
    onSaveExtendedVariation: saveExtendedVariation,
    onSavePlayableAlternative: savePlayableAlternative,
    onSetExtensionMoveMode: setExtensionMoveMode,
    onSetExtensionName: setExtensionName,
    onSetExtensionThresholdCp: setExtensionThresholdCp,
    onSetFreePlayViewIndex: setFreePlayViewIndex,
    onSetLesson: setLesson,
    onSetLessonStep: setLessonStep,
    onSetViewIndex: setViewIndex,
    onStartExtensionFromPlayableAlternative: startExtensionFromPlayableAlternative,
    onStartFreePlay: startFreePlay,
    onStopFreePlay: stopFreePlay,
  };
  const boardProps = {
    chessboardOptions,
    engineEval,
    evalHeight,
    evalStatus,
    formatEval,
  };
  const mistakeReviewProps = { mistakes };
  const ActiveLayout = isMobileLayout ? MobileLayout : DesktopLayout;

  return (
    <main className="app">
      <section className="hero">
        <div className="brand-lockup" aria-label="The Opening Lab">
          <img className="brand-mark" src="/favicon.svg" alt="" />
          <h1>The Opening Lab</h1>
        </div>
        <div>
          <p>Practice opening lines, explore variations, and review mistakes on the board.</p>
        </div>
      </section>
      <ActiveLayout
        boardProps={boardProps}
        currentLineProps={currentLineProps}
        mistakeReviewProps={mistakeReviewProps}
        practicePanelProps={practicePanelProps}
      />
    </main>
  );
}
