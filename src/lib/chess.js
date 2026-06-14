import { Chess } from "chess.js";

function stripMoveNumbers(text) {
  return text
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\d+\.\.\./g, " ")
    .replace(/\d+\./g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeMove(move) {
  return move
    .trim()
    .replace(/[+#?!]+$/g, "")
    .replace(/0/g, "O")
    .toLowerCase();
}

export function parseMoves(text) {
  const clean = stripMoveNumbers(text);
  if (!clean) return [];
  return clean
    .split(" ")
    .map((move) => move.trim())
    .filter(Boolean)
    .filter((move) => !["1-0", "0-1", "1/2-1/2", "*"].includes(move));
}

export function randomIndex(length) {
  return Math.floor(Math.random() * length);
}

export function moveNumberForIndex(index) {
  return Math.floor(index / 2) + 1;
}

export function sideForIndex(index) {
  return index % 2 === 0 ? "White" : "Black";
}

export function makeGameAtMove(moves, currentIndex) {
  const game = new Chess();

  for (let index = 0; index < currentIndex; index += 1) {
    const move = moves[index];
    if (!move) break;

    try {
      game.move(move);
    } catch {
      break;
    }
  }

  return game;
}

export function makeGameFromFenAndMoves(startFen, moves, count) {
  const game = new Chess(startFen);
  for (let index = 0; index < count; index += 1) {
    try {
      game.move(moves[index]);
    } catch {
      break;
    }
  }
  return game;
}

export function buildHistoryItems(moves, currentIndex) {
  const items = [];
  for (let index = 0; index < currentIndex; index += 1) {
    items.push({
      index,
      label: moves[index],
      moveNo: moveNumberForIndex(index),
      side: sideForIndex(index),
    });
  }
  return items;
}

export function legalTargetsForSquare(game, square) {
  if (!game || !square) return [];

  try {
    return game.moves({ square, verbose: true }).map((move) => move.to);
  } catch {
    return [];
  }
}

export function pieceTypeColor(piece) {
  const pieceType = typeof piece === "string" ? piece : piece?.pieceType;
  if (!pieceType) return null;
  return pieceType[0] === "w" ? "White" : "Black";
}

export function formatLineWithMoveNumbers(moves) {
  const parts = [];
  for (let index = 0; index < moves.length; index += 2) {
    const moveNumber = index / 2 + 1;
    const whiteMove = moves[index] || "";
    const blackMove = moves[index + 1] || "";
    parts.push(`${moveNumber}. ${whiteMove}${blackMove ? ` ${blackMove}` : ""}`);
  }
  return parts.join(" ");
}

export function uciToMoveObject(uci) {
  if (!uci || uci.length < 4) return null;
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
  };
}

export function convertUciLineToSan(startFen, pvString, maxMoves = 8) {
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

export function uciToSan(startFen, uci) {
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

export function moveToUci(move) {
  if (!move) return "";
  return `${move.from}${move.to}${move.promotion || ""}`;
}
