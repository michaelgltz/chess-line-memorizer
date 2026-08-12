import fs from "node:fs";
import path from "node:path";
import { Chess } from "chess.js";
import { sanLineToPgn } from "./chess-utils.mjs";

function pgnGame(config, leaf, index) {
  const side = config.repertoireSide === "white" ? "White" : "Black";
  return [
    `[Event "${config.name} — Line ${index + 1}"]`,
    '[Site "https://lichess.org/analysis"]',
    `[Date "${new Date().toISOString().slice(0, 10).replaceAll("-", ".")}"]`,
    '[Round "-"]',
    `[White "${side === "White" ? config.name : "Practical Lichess opponent"}"]`,
    `[Black "${side === "Black" ? config.name : "Practical Lichess opponent"}"]`,
    '[Result "*"]',
    "",
    sanLineToPgn(leaf.san),
  ].join("\n");
}

function splitPgnGames(text) {
  return String(text).trim().split(/\n\s*\n(?=\[Event\s)/).filter(Boolean);
}

function validateGame(game, label) {
  const chess = new Chess();
  try {
    chess.loadPgn(game);
  } catch (error) {
    throw new Error(`Invalid PGN in ${label}: ${error.message}`);
  }
  return chess.history().join(" ");
}

export function writeOutputs(config, state) {
  fs.mkdirSync(config.outputDirectory, { recursive: true });
  const sorted = [...state.leaves].sort((a, b) => b.reach - a.reach || a.san.join(" ").localeCompare(b.san.join(" ")));
  const generatedGames = sorted.map((leaf, index) => pgnGame(config, leaf, index));
  const includedGames = config.includePgnFiles.flatMap((file) => splitPgnGames(fs.readFileSync(file, "utf8")));
  const seen = new Set();
  const games = [];
  for (const [index, game] of [...includedGames, ...generatedGames].entries()) {
    const line = validateGame(game, `game ${index + 1}`);
    if (!seen.has(line)) {
      seen.add(line);
      games.push(game);
    }
  }

  const pgnPath = path.join(config.outputDirectory, `${config.slug}-${config.repertoireSide}.pgn`);
  const auditPath = path.join(config.outputDirectory, `${config.slug}-${config.repertoireSide}-audit.json`);
  const summaryPath = path.join(config.outputDirectory, `${config.slug}-${config.repertoireSide}-summary.json`);
  fs.writeFileSync(pgnPath, `${games.join("\n\n")}\n`);
  fs.writeFileSync(auditPath, `${JSON.stringify({ config, leaves: sorted }, null, 2)}\n`);

  const engineDepths = Object.values(state.engineCache).map((entry) => entry.depth);
  const summary = {
    name: config.name,
    repertoireSide: config.repertoireSide,
    generatedLines: generatedGames.length,
    includedLines: includedGames.length,
    uniqueOutputLines: games.length,
    uniqueExplorerPositions: Object.keys(state.explorerCache).length,
    uniqueEnginePositions: Object.keys(state.engineCache).length,
    minimumEngineDepth: engineDepths.length ? Math.min(...engineDepths) : null,
    maximumEngineDepth: engineDepths.length ? Math.max(...engineDepths) : null,
    cloudEvaluations: Object.values(state.engineCache).filter((entry) => entry.cloud).length,
    pgnPath,
    auditPath,
  };
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  return { pgnPath, auditPath, summaryPath, summary };
}
