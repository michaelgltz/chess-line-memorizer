import { Chess } from "chess.js";
import { playUci, sideToMove, targetPly } from "./chess-utils.mjs";
import { selectOpponentMoves } from "./branching.mjs";

function extendNode(node, move, decision) {
  const chess = new Chess(node.fen);
  const played = playUci(chess, move.uci);
  if (!played) throw new Error(`Illegal move ${move.uci} at ${node.fen}`);
  return {
    seedName: node.seedName,
    fen: chess.fen(),
    san: [...node.san, played.san],
    uci: [...node.uci, move.uci],
    reach: decision.kind === "opponent" ? node.reach * move.share : node.reach,
    decisions: [...node.decisions, { ...decision, san: played.san, uci: move.uci }],
  };
}

export async function generate(config, state, provider, checkpoint, logger = console) {
  const finalPly = targetPly(config);
  while (state.queue.length) {
    const node = state.queue[0];
    if (node.uci.length >= finalPly) {
      state.leaves.push(node);
      state.queue.shift();
      checkpoint();
      continue;
    }

    if (sideToMove(node.fen) === config.repertoireSide) {
      const analysis = await provider.analyze(node.fen);
      state.queue.push(extendNode(node, analysis, { kind: "engine", analysis }));
    } else {
      const moves = await provider.getExplorerMoves(node.fen);
      const selected = selectOpponentMoves(moves, node.reach, config.branching);
      if (!selected.length) throw new Error(`No opponent moves were available for ${node.fen}`);
      for (const move of selected) {
        state.queue.push(extendNode(node, move, { kind: "opponent", move }));
      }
    }
    state.queue.shift();
    state.stats.processedPositions += 1;
    checkpoint();
    logger.log(
      `[${state.stats.processedPositions}] queue=${state.queue.length} leaves=${state.leaves.length} `
      + `${node.san.join(" ")}`
    );
  }
  return state.leaves;
}
