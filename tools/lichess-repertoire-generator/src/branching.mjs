export function selectOpponentMoves(moves, reach, policy) {
  const selected = [];
  let coverage = 0;
  for (const move of moves) {
    if (selected.length >= policy.maxBranches) break;
    if (move.share < policy.minMoveShare) break;
    if (reach * move.share < policy.minAbsoluteReach) continue;
    selected.push(move);
    coverage += move.share;
    if (coverage >= policy.targetCoverage) break;
  }
  if (!selected.length && moves[0]) selected.push(moves[0]);
  return selected;
}
