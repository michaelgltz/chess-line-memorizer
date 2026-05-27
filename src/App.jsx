import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import BoardWithEval from "./components/BoardWithEval.jsx";
import CurrentLineCard from "./components/CurrentLineCard.jsx";
import MistakeReview from "./components/MistakeReview.jsx";
import PracticePanel from "./components/PracticePanel.jsx";
import "./App.css";

const STOCKFISH_PATH = "/stockfish/stockfish-18-lite-single.js";
const ENGINE_DEPTH = 10;
const OPPONENT_DELAY_MIN_MS = 500;
const OPPONENT_DELAY_MAX_MS = 1000;
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

const OPENINGS = [
  {
    id: "englund-white",
    name: "Englund Gambit Refutation",
    category: "White repertoire",
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
    category: "White repertoire",
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
    id: "ruy-lopez-white",
    name: "Ruy Lopez",
    category: "White repertoire",
    description: "Train classical Spanish positions from the main line, Berlin, and Exchange structures.",
    variations: [
      {
        name: "Closed Spanish main line",
        line: `1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3`,
        explanations: {
          8: {
            "bxc6": {
              title: "Bxc6 is a different structure.",
              text: "The closed Spanish keeps the bishop and builds pressure with Re1, c3, and h3. Trading on c6 is playable, but it commits to the Exchange variation instead of this main-line plan.",
              seeLine: `4. Ba4 Nf6 5. O-O Be7 6. Re1`,
            },
          },
        },
      },
      {
        name: "Berlin endgame",
        line: `1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 4. O-O Nxe4 5. d4 Nd6 6. Bxc6 dxc6 7. dxe5 Nf5 8. Qxd8+ Kxd8`,
        explanations: {},
      },
      {
        name: "Exchange structure",
        line: `1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Bxc6 dxc6 5. O-O f6 6. d4 exd4 7. Nxd4 c5 8. Nb3 Qxd1 9. Rxd1`,
        explanations: {},
      },
    ],
  },
  {
    id: "italian-white",
    name: "Italian Game",
    category: "White repertoire",
    description: "Practice flexible Italian setups, Two Knights move orders, and the Evans Gambit.",
    variations: [
      {
        name: "Giuoco Pianissimo",
        line: `1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O O-O 7. Re1 a6 8. Bb3`,
        explanations: {
          6: {
            "d4": {
              title: "d4 changes the character immediately.",
              text: "The quiet Italian keeps the center flexible with d3 first. Playing d4 is a sharper main line, but it is not the slow-pressure setup this drill is building.",
              seeLine: `4. c3 Nf6 5. d3 d6 6. O-O`,
            },
          },
        },
      },
      {
        name: "Two Knights with d3",
        line: `1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. d3 Bc5 5. c3 d6 6. O-O O-O 7. Re1 a6`,
        explanations: {},
      },
      {
        name: "Evans Gambit accepted",
        line: `1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. d4 exd4 7. O-O d6 8. cxd4`,
        explanations: {},
      },
    ],
  },
  {
    id: "queens-gambit-white",
    name: "Queen's Gambit",
    category: "White repertoire",
    description: "Practice Queen's Gambit structures against declined, accepted, and Albin setups.",
    variations: [
      {
        name: "QGD Exchange setup",
        line: `1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. cxd5 exd5 5. Bg5 Be7 6. e3 O-O 7. Bd3 c6 8. Qc2`,
        explanations: {
          8: {
            "nf3": {
              title: "Nf3 is natural, but Qc2 fits this plan.",
              text: "In the Exchange Queen's Gambit, Qc2 supports a future kingside plan and keeps the e4 break in view. Nf3 is playable, just a different setup.",
              seeLine: `5. Bg5 Be7 6. e3 O-O 7. Bd3 c6 8. Qc2`,
            },
          },
        },
      },
      {
        name: "Queen's Gambit Accepted",
        line: `1. d4 d5 2. c4 dxc4 3. e3 Nf6 4. Bxc4 e6 5. Nf3 c5 6. O-O a6 7. Qe2 b5 8. Bd3`,
        explanations: {},
      },
      {
        name: "Albin Countergambit",
        line: `1. d4 d5 2. c4 e5 3. dxe5 d4 4. Nf3 Nc6 5. a3 Be6 6. Nbd2 Qd7 7. b4 Nge7`,
        explanations: {},
      },
    ],
  },
  {
    id: "sicilian-black",
    name: "Sicilian Defense",
    category: "Black vs e4",
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
    id: "caro-kann-black",
    name: "Caro-Kann Defense",
    category: "Black vs e4",
    description: "Train reliable Caro-Kann structures against Advance, Classical, and Panov systems.",
    variations: [
      {
        name: "Advance variation",
        line: `1. e4 c6 2. d4 d5 3. e5 Bf5 4. Nf3 e6 5. Be2 c5 6. O-O Nc6 7. c3 Nge7`,
        explanations: {
          5: {
            "bg4": {
              title: "Develop the light-square bishop first.",
              text: "In the Advance Caro-Kann, Bf5 gets the problem bishop outside the pawn chain before ...e6. That is the core setup this line is training.",
              seeLine: `3. e5 Bf5 4. Nf3 e6 5. Be2 c5`,
            },
          },
        },
      },
      {
        name: "Classical variation",
        line: `1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5 5. Ng3 Bg6 6. h4 h6 7. Nf3 Nd7`,
        explanations: {},
      },
      {
        name: "Panov-Botvinnik setup",
        line: `1. e4 c6 2. d4 d5 3. exd5 cxd5 4. c4 Nf6 5. Nc3 e6 6. Nf3 Bb4 7. Bd3 dxc4`,
        explanations: {},
      },
    ],
  },
  {
    id: "scandinavian-defense",
    name: "Scandinavian Defense",
    category: "Black vs e4",
    description: "Practice Scandinavian structures with the main queen line, Modern setup, and Portuguese-style development.",
    variations: [
      {
        name: "Main line with ...Qa5",
        line: `1. e4 d5 2. exd5 Qxd5 3. Nc3 Qa5 4. d4 Nf6 5. Nf3 c6 6. Bc4 Bf5 7. O-O e6`,
        explanations: {
          5: {
            "qd8": {
              title: "Qa5 keeps active pressure.",
              text: "The main Scandinavian queen line uses ...Qa5 to keep an eye on c3 and support quick development. Retreating all the way to d8 is playable, but it is a different, quieter system.",
              seeLine: `2. exd5 Qxd5 3. Nc3 Qa5 4. d4 Nf6`,
            },
          },
        },
      },
      {
        name: "Modern Scandinavian",
        line: `1. e4 d5 2. exd5 Nf6 3. d4 Nxd5 4. c4 Nb6 5. Nc3 g6 6. Be3 Bg7 7. Rc1 O-O`,
        explanations: {},
      },
      {
        name: "Portuguese variation",
        line: `1. e4 d5 2. exd5 Nf6 3. d4 Bg4 4. f3 Bf5 5. c4 e6 6. dxe6 Nc6 7. exf7+ Kxf7`,
        explanations: {},
      },
    ],
  },
  {
    id: "french-black",
    name: "French Defense",
    category: "Black vs e4",
    description: "Practice French Defense pawn-chain play against Advance, Tarrasch, and Winawer lines.",
    variations: [
      {
        name: "Advance variation pressure",
        line: `1. e4 e6 2. d4 d5 3. e5 c5 4. c3 Nc6 5. Nf3 Qb6 6. Be2 cxd4 7. cxd4 Nge7`,
        explanations: {
          6: {
            "nf6": {
              title: "Qb6 attacks the base of the chain.",
              text: "The French Advance plan is to hit d4 and b2 before White finishes development. Qb6 makes that pressure immediate.",
              seeLine: `3. e5 c5 4. c3 Nc6 5. Nf3 Qb6`,
            },
          },
        },
      },
      {
        name: "Tarrasch with ...Qxd5",
        line: `1. e4 e6 2. d4 d5 3. Nd2 c5 4. exd5 Qxd5 5. Ngf3 cxd4 6. Bc4 Qd6 7. O-O Nf6`,
        explanations: {},
      },
      {
        name: "Winawer main structure",
        line: `1. e4 e6 2. d4 d5 3. Nc3 Bb4 4. e5 c5 5. a3 Bxc3+ 6. bxc3 Ne7 7. Qg4 Qc7`,
        explanations: {},
      },
    ],
  },
  {
    id: "kings-indian-black",
    name: "King's Indian Defense",
    category: "Black vs d4",
    description: "Practice King's Indian setups against Classical, Fianchetto, and Saemisch systems.",
    variations: [
      {
        name: "Classical King's Indian",
        line: `1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3 O-O 6. Be2 e5 7. O-O Nc6`,
        explanations: {
          8: {
            "c5": {
              title: "In this line, castle before striking the center.",
              text: "The King's Indian setup usually finishes king safety first, then challenges the center with ...e5. Playing ...c5 immediately is playable in other systems, but not this trained pattern.",
              seeLine: `4. e4 d6 5. Nf3 O-O 6. Be2 e5`,
            },
          },
        },
      },
      {
        name: "Fianchetto system",
        line: `1. d4 Nf6 2. c4 g6 3. g3 Bg7 4. Bg2 O-O 5. Nf3 d6 6. O-O Nbd7 7. Nc3 e5`,
        explanations: {},
      },
      {
        name: "Saemisch setup",
        line: `1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. f3 O-O 6. Be3 e5 7. Nge2 c6`,
        explanations: {},
      },
    ],
  },
  {
    id: "nimzo-indian-black",
    name: "Nimzo-Indian Defense",
    category: "Black vs d4",
    description: "Train Nimzo-Indian development against Rubinstein, Classical, and Leningrad setups.",
    variations: [
      {
        name: "Rubinstein variation",
        line: `1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. e3 O-O 5. Bd3 d5 6. Nf3 c5 7. O-O dxc4 8. Bxc4`,
        explanations: {
          6: {
            "bxc3+": {
              title: "Hold the bishop tension for now.",
              text: "Black can often give up the bishop pair later, but this Rubinstein line first castles and challenges the center with ...d5 and ...c5.",
              seeLine: `3. Nc3 Bb4 4. e3 O-O 5. Bd3 d5`,
            },
          },
        },
      },
      {
        name: "Classical Qc2 line",
        line: `1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. Qc2 O-O 5. a3 Bxc3+ 6. Qxc3 b6 7. Bg5 Bb7`,
        explanations: {},
      },
      {
        name: "Leningrad variation",
        line: `1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. Bg5 h6 5. Bh4 c5 6. d5 d6 7. e3 Bxc3+`,
        explanations: {},
      },
    ],
  },
  {
    id: "english-white",
    name: "English Opening",
    category: "White repertoire",
    description: "Practice English Opening structures with kingside fianchetto and flexible central play.",
    variations: [
      {
        name: "Four Knights English",
        line: `1. c4 e5 2. Nc3 Nf6 3. g3 d5 4. cxd5 Nxd5 5. Bg2 Nb6 6. Nf3 Nc6 7. O-O Be7`,
        explanations: {
          5: {
            "d4": {
              title: "Keep the English move order flexible.",
              text: "The fianchetto setup delays d4 until White knows how Black is arranging the pieces. Bg2 is the natural developing move in this repertoire.",
              seeLine: `3. g3 d5 4. cxd5 Nxd5 5. Bg2`,
            },
          },
        },
      },
      {
        name: "Symmetrical English",
        line: `1. c4 c5 2. Nc3 Nc6 3. g3 g6 4. Bg2 Bg7 5. Nf3 e6 6. O-O Nge7`,
        explanations: {},
      },
      {
        name: "Reversed Sicilian setup",
        line: `1. c4 e5 2. Nc3 Nc6 3. g3 g6 4. Bg2 Bg7 5. e3 d6 6. Nge2 Be6`,
        explanations: {},
      },
    ],
  },
  {
    id: "sicilian-white",
    name: "Sicilian Najdorf Response",
    category: "White repertoire",
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

function buildVariationEntries(variations) {
  return variations.map((variation, index) => ({
    index,
    variation,
    moves: parseMoves(variation.line),
  }));
}

function createMoveTreeNode() {
  return {
    childMap: new Map(),
    children: [],
    variationIndices: [],
  };
}

function buildMoveTree(variationEntries) {
  const root = createMoveTreeNode();

  for (const entry of variationEntries) {
    if (!root.variationIndices.includes(entry.index)) {
      root.variationIndices.push(entry.index);
    }

    let node = root;
    for (const san of entry.moves) {
      const key = normalizeMove(san);
      let edge = node.childMap.get(key);

      if (!edge) {
        edge = {
          san,
          key,
          count: 0,
          firstVariationIndex: entry.index,
          variationIndices: [],
          child: createMoveTreeNode(),
        };
        node.childMap.set(key, edge);
        node.children.push(edge);
      }

      edge.count += 1;
      if (!edge.variationIndices.includes(entry.index)) {
        edge.variationIndices.push(entry.index);
      }
      if (!edge.child.variationIndices.includes(entry.index)) {
        edge.child.variationIndices.push(entry.index);
      }

      node = edge.child;
    }
  }

  return root;
}

function findMoveTreeNode(root, playedMoves) {
  if (!root) return null;
  let node = root;

  for (const move of playedMoves) {
    const edge = node.childMap.get(normalizeMove(move));
    if (!edge) return null;
    node = edge.child;
  }

  return node;
}

function chooseTreeContinuation(variationEntries, edge, { randomize = false, preferredVariationIndex = null } = {}) {
  if (!edge?.variationIndices?.length) return null;

  const candidateIndices = edge.variationIndices;
  const chosenIndex = preferredVariationIndex !== null && candidateIndices.includes(preferredVariationIndex)
    ? preferredVariationIndex
    : randomize
      ? candidateIndices[randomIndex(candidateIndices.length)]
      : candidateIndices[0];
  const entry = variationEntries[chosenIndex];

  return entry ? { index: chosenIndex, moves: entry.moves } : null;
}

function summarizeTreeBranches(node, variationEntries) {
  if (!node?.children?.length) return [];

  return node.children.map((edge) => {
    const sourceLabels = edge.variationIndices
      .map((index) => variationEntries[index]?.variation?.saved ? "saved" : "built-in");
    const hasSaved = sourceLabels.includes("saved");
    const hasBuiltIn = sourceLabels.includes("built-in");

    return {
      san: edge.san,
      count: edge.variationIndices.length,
      source: hasSaved && hasBuiltIn ? "built-in + saved" : hasSaved ? "saved" : "built-in",
    };
  });
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

function legalTargetsForSquare(game, square) {
  if (!game || !square) return [];

  try {
    return game.moves({ square, verbose: true }).map((move) => move.to);
  } catch {
    return [];
  }
}

function pieceTypeColor(piece) {
  const pieceType = typeof piece === "string" ? piece : piece?.pieceType;
  if (!pieceType) return null;
  return pieceType[0] === "w" ? "White" : "Black";
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

function formatThresholdPawns(thresholdCp) {
  return (thresholdCp / 100).toFixed(2);
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
  const [plannedMoves, setPlannedMoves] = useState(() => parseMoves(OPENINGS[0].variations[0].line));
  const [quizSide, setQuizSide] = useState("White");
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
  const variationEntries = useMemo(() => buildVariationEntries(availableVariations), [availableVariations]);
  const moveTree = useMemo(() => buildMoveTree(variationEntries), [variationEntries]);
  const selectedVariation = availableVariations[selectedVariationIndex] || availableVariations[0];
  const moves = useMemo(() => (
    selectedOpeningId === "custom" ? parseMoves(customLineText) : plannedMoves
  ), [customLineText, plannedMoves, selectedOpeningId]);

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

  const currentTreeNode = useMemo(() => (
    selectedOpeningId === "custom" ? null : findMoveTreeNode(moveTree, moves.slice(0, currentIndex))
  ), [currentIndex, moveTree, moves, selectedOpeningId]);
  const currentMove = moves[currentIndex] || currentTreeNode?.children?.[0]?.san;
  const currentSide = sideForIndex(currentIndex);
  const isQuizTurn = currentSide === quizSide;
  const isDone = !currentMove && currentIndex >= moves.length;
  const isReviewing = viewIndex !== null || lesson !== null;
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
    setLesson(null);
    setLessonStep(0);
  }

  function resetToMainLine() {
    resetQuiz(false, selectedOpeningId, 0);
  }

  function resetQuiz(randomizeVariation = true, openingId = selectedOpeningId, forcedVariationIndex = null) {
    const opening = OPENINGS.find((o) => o.id === openingId) || OPENINGS[0];
    const variations = openingId === "custom"
      ? []
      : [...(opening.variations || []), ...(savedVariations[openingId] || [])];

    if (openingId !== "custom" && variations.length > 0) {
      const nextVariationIndex = forcedVariationIndex !== null
        ? Math.max(0, Math.min(forcedVariationIndex, variations.length - 1))
        : randomizeVariation
          ? randomIndex(variations.length)
          : Math.max(0, Math.min(selectedVariationIndex, variations.length - 1));

      setSelectedVariationIndex(nextVariationIndex);
      setPlannedMoves(parseMoves(variations[nextVariationIndex].line));
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
      resetQuiz(false, "custom");
      return;
    }

    const nextOpening = OPENINGS.find((opening) => opening.id === openingId);
    if (!nextOpening) return;

    setSelectedOpeningId(nextOpening.id);
    const nextVariations = [...(nextOpening.variations || []), ...(savedVariations[nextOpening.id] || [])];
    const nextVariationIndex = nextVariations.length ? randomIndex(nextVariations.length) : 0;
    setSelectedVariationIndex(nextVariationIndex);
    setPlannedMoves(parseMoves(nextVariations[nextVariationIndex]?.line || ""));
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
      const edge = currentTreeNode.children[randomIndex(currentTreeNode.children.length)];
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

    saveVariationToStorage({ name, line });
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

    setSavedVariations((prev) => {
      const existing = prev[selectedOpeningId] || [];
      const nextForOpening = existing.map((variation, index) => (
        index === editingVariationIndex
          ? {
              ...variation,
              name,
              line,
              updatedAt: new Date().toISOString(),
            }
          : variation
      ));

      return {
        ...prev,
        [selectedOpeningId]: nextForOpening,
      };
    });

    const builtInCount = selectedOpening.variations?.length || 0;
    if (selectedVariationIndex === builtInCount + editingVariationIndex) {
      setPlannedMoves(parseMoves(line));
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

  function selectSavedVariation(variationIndex) {
    const builtInCount = selectedOpening.variations?.length || 0;
    const nextVariationIndex = builtInCount + variationIndex;
    setSelectedVariationIndex(nextVariationIndex);
    setPlannedMoves(parseMoves(savedForOpening[variationIndex]?.line || ""));
    resetQuiz(false, selectedOpeningId, nextVariationIndex);
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
    const treeEdge = selectedOpeningId === "custom"
      ? null
      : currentTreeNode?.childMap.get(normalizeMove(guessedSan));
    const correct = treeEdge ? true : normalizeMove(guessedSan) === normalizeMove(currentMove);

    if (correct) {
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
    if (!sourceSquare || !targetSquare) return false;
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

  return (
    <main className="app">
      <section className="hero">
        <div>
          <h1>Opening Lab</h1>
          <p>Practice opening lines, explore variations, and review mistakes on the board.</p>
        </div>
      </section>

      <PracticePanel
        customLineText={customLineText}
        manualVariationLine={manualVariationLine}
        manualVariationName={manualVariationName}
        editingVariationIndex={editingVariationIndex}
        editingVariationLine={editingVariationLine}
        editingVariationName={editingVariationName}
        openings={OPENINGS}
        quizSide={quizSide}
        savedForOpening={savedForOpening}
        selectedOpening={selectedOpening}
        selectedOpeningId={selectedOpeningId}
        showCustomEditor={showCustomEditor}
        showVariationManager={showVariationManager}
        onAddManualVariation={addManualVariation}
        onChooseOpening={chooseOpening}
        onClearAllSavedVariations={clearAllSavedVariations}
        onClearSavedVariationsForOpening={clearSavedVariationsForOpening}
        onCustomLineTextChange={setCustomLineText}
        onDeleteSavedVariation={deleteSavedVariation}
        onDuplicateSavedVariation={duplicateSavedVariation}
        onCancelEditingSavedVariation={cancelEditingSavedVariation}
        onExportSavedVariations={exportSavedVariations}
        onImportSavedVariations={importSavedVariations}
        onSaveEditedVariation={saveEditedVariation}
        onEditingVariationLineChange={setEditingVariationLine}
        onEditingVariationNameChange={setEditingVariationName}
        onManualVariationLineChange={setManualVariationLine}
        onManualVariationNameChange={setManualVariationName}
        onResetMainLine={resetToMainLine}
        onResetQuiz={resetQuiz}
        onSelectSavedVariation={selectSavedVariation}
        onSetQuizSide={setQuizSide}
        onStartEditingSavedVariation={startEditingSavedVariation}
        onToggleVariationManager={() => setShowVariationManager((value) => !value)}
      />

      <section className="layout">
        <div className="left-column">
          <CurrentLineCard
            currentIndex={currentIndex}
            currentMove={currentMove}
            currentSide={currentSide}
            branchSummary={branchSummary}
            dynamicAnalysis={dynamicAnalysis}
            dynamicAnalysisStatus={dynamicAnalysisStatus}
            extensionBaseMoves={extensionBaseMoves}
            extensionMode={extensionMode}
            extensionMoveMode={extensionMoveMode}
            extensionMoves={extensionMoves}
            extensionName={extensionName}
            extensionThresholdCp={extensionThresholdCp}
            extensionTopMoveStatus={extensionTopMoveStatus}
            feedback={feedback}
            filteredExtensionTopMoves={filteredExtensionTopMoves}
            freePlayMode={freePlayMode}
            freePlayMoves={freePlayMoves}
            historyItems={historyItems}
            isDone={isDone}
            isQuizTurn={isQuizTurn}
            isReviewing={isReviewing}
            lesson={lesson}
            lessonStep={lessonStep}
            moves={moves}
            opponentThinking={opponentThinking}
            progress={progress}
            quizSide={quizSide}
            savedForOpening={savedForOpening}
            selectedOpening={selectedOpening}
            selectedOpeningId={selectedOpeningId}
            selectedVariation={selectedVariation}
            showAnswer={showAnswer}
            shownFen={shownFen}
            treeBranchCount={currentTreeNode?.children?.length || 0}
            viewIndex={viewIndex}
            wrongAttemptsThisMove={wrongAttemptsThisMove}
            formatTopMoveOption={formatTopMoveOption}
            moveNumberForIndex={moveNumberForIndex}
            onAdvance={advance}
            onCancelExtensionMode={cancelExtensionMode}
            onClearReview={clearReview}
            onOpenLesson={openLesson}
            onResetQuiz={resetQuiz}
            onSaveExtendedVariation={saveExtendedVariation}
            onSavePlayableAlternative={savePlayableAlternative}
            onSetExtensionMoveMode={setExtensionMoveMode}
            onSetExtensionName={setExtensionName}
            onSetExtensionThresholdCp={setExtensionThresholdCp}
            onSetLesson={setLesson}
            onSetLessonStep={setLessonStep}
            onSetShowAnswer={setShowAnswer}
            onSetViewIndex={setViewIndex}
            onStartExtensionFromPlayableAlternative={startExtensionFromPlayableAlternative}
            onStartFreePlay={startFreePlay}
            onStopFreePlay={stopFreePlay}
          />

          <MistakeReview mistakes={mistakes} />
        </div>

        <BoardWithEval
          chessboardOptions={chessboardOptions}
          engineEval={engineEval}
          evalHeight={evalHeight}
          evalStatus={evalStatus}
          formatEval={formatEval}
        />
      </section>
    </main>
  );
}
