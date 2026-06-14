import { normalizeMove, parseMoves, randomIndex } from "./chess.js";

export const SAVED_VARIATIONS_STORAGE_KEY = "chess-line-memorizer-saved-variations";

export function buildVariationEntries(variations) {
  return variations.map((variation, index) => ({
    index,
    variation,
    moves: parseMoves(variation.line),
  }));
}

export function variationDedupeKey(line) {
  return parseMoves(line).map(normalizeMove).join(" ");
}

export function buildVariationCatalog(builtInVariations = [], savedVariations = []) {
  const playableVariations = [];
  const keyToPlayableIndex = new Map();

  function addPlayableVariation(variation, source, sourceIndex) {
    const key = variationDedupeKey(variation.line);
    const fallbackKey = `${source}:${sourceIndex}:${variation.line || ""}`;
    const dedupeKey = key || fallbackKey;
    const existingPlayableIndex = keyToPlayableIndex.get(dedupeKey);

    if (existingPlayableIndex !== undefined) {
      return {
        variation,
        sourceIndex,
        playableIndex: existingPlayableIndex,
        duplicateOf: playableVariations[existingPlayableIndex],
      };
    }

    const playableIndex = playableVariations.length;
    const playableVariation = source === "saved" ? { ...variation, saved: true } : variation;
    keyToPlayableIndex.set(dedupeKey, playableIndex);
    playableVariations.push(playableVariation);

    return {
      variation,
      sourceIndex,
      playableIndex,
      duplicateOf: null,
    };
  }

  const builtInRows = builtInVariations.map((variation, index) => addPlayableVariation(variation, "built-in", index));
  const savedRows = savedVariations.map((variation, index) => addPlayableVariation(variation, "saved", index));

  return {
    playableVariations,
    builtInRows,
    savedRows,
  };
}

function createMoveTreeNode() {
  return {
    childMap: new Map(),
    children: [],
    variationIndices: [],
  };
}

export function buildMoveTree(variationEntries) {
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

export function findMoveTreeNode(root, playedMoves) {
  if (!root) return null;
  let node = root;

  for (const move of playedMoves) {
    const edge = node.childMap.get(normalizeMove(move));
    if (!edge) return null;
    node = edge.child;
  }

  return node;
}

export function chooseTreeContinuation(
  variationEntries,
  edge,
  { randomize = false, preferredVariationIndex = null } = {},
) {
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

export function summarizeTreeBranches(node, variationEntries) {
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
