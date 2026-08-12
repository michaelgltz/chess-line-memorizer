import { Chess } from "chess.js";

export function positionKey(fen) {
  return String(fen).split(/\s+/).slice(0, 4).join(" ");
}

export function playUci(chess, uci) {
  const from = uci.slice(0, 2);
  let to = uci.slice(2, 4);
  const piece = chess.get(from);
  if (piece?.type === "k") {
    if (from === "e1" && to === "h1") to = "g1";
    if (from === "e1" && to === "a1") to = "c1";
    if (from === "e8" && to === "h8") to = "g8";
    if (from === "e8" && to === "a8") to = "c8";
  }
  return chess.move({ from, to, promotion: uci.slice(4) || undefined });
}

export function createSeedNode(seed) {
  const chess = new Chess();
  const san = [];
  const uci = [];
  for (const token of seed.moves) {
    const move = chess.move(token);
    if (!move) throw new Error(`Illegal seed move ${token} in ${seed.name}`);
    san.push(move.san);
    uci.push(`${move.from}${move.to}${move.promotion || ""}`);
  }
  return {
    seedName: seed.name,
    fen: chess.fen(),
    san,
    uci,
    reach: seed.reach,
    decisions: [],
  };
}

export function targetPly(config) {
  return config.repertoireSide === "white"
    ? config.maxFullmove * 2 - 1
    : config.maxFullmove * 2;
}

export function sideToMove(fen) {
  return fen.split(/\s+/)[1] === "w" ? "white" : "black";
}

export function sanLineToPgn(moves) {
  const output = [];
  for (let index = 0; index < moves.length; index += 2) {
    output.push(`${index / 2 + 1}. ${moves[index]}`);
    if (moves[index + 1]) output.push(moves[index + 1]);
  }
  return `${output.join(" ")} *`;
}
