import { normalizeMove, parseMoves } from "./chess.js";

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
    terminalVariationIndices: [],
  };
}

function addUnique(array, value) {
  if (!array.includes(value)) array.push(value);
}

function normalizedEntryMoves(entry) {
  if (!Array.isArray(entry?.moves) || entry.moves.length === 0) return null;

  const normalizedMoves = [];
  for (const move of entry.moves) {
    if (typeof move !== "string" || !move.trim()) return null;
    const normalizedMove = normalizeMove(move);
    if (!normalizedMove) return null;
    normalizedMoves.push(normalizedMove);
  }

  return normalizedMoves;
}

function buildEntryMap(variationEntries) {
  const entryMap = new Map();

  for (const entry of variationEntries || []) {
    if (entry?.index === undefined || entry?.index === null || entryMap.has(entry.index)) continue;
    entryMap.set(entry.index, entry);
  }

  return entryMap;
}

function randomArrayIndex(length, random) {
  const randomValue = typeof random === "function" ? Number(random()) || 0 : 0;
  return Math.min(length - 1, Math.max(0, Math.floor(randomValue * length)));
}

export function buildMoveTree(variationEntries) {
  const root = createMoveTreeNode();
  const seenLineKeys = new Set();
  const seenVariationIndices = new Set();

  // Guard practice weighting even when callers bypass buildVariationCatalog.
  for (const entry of variationEntries || []) {
    if (entry?.index === undefined || entry?.index === null || seenVariationIndices.has(entry.index)) continue;

    const normalizedMoves = normalizedEntryMoves(entry);
    if (!normalizedMoves) continue;

    const lineKey = normalizedMoves.join(" ");
    if (seenLineKeys.has(lineKey)) continue;

    seenLineKeys.add(lineKey);
    seenVariationIndices.add(entry.index);
    addUnique(root.variationIndices, entry.index);

    let node = root;
    for (let moveIndex = 0; moveIndex < entry.moves.length; moveIndex += 1) {
      const san = entry.moves[moveIndex];
      const key = normalizedMoves[moveIndex];
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

      addUnique(edge.variationIndices, entry.index);
      edge.count = edge.variationIndices.length;
      addUnique(edge.child.variationIndices, entry.index);

      node = edge.child;
    }

    addUnique(node.terminalVariationIndices, entry.index);
  }

  return root;
}

export function findMoveTreeNode(root, playedMoves = []) {
  if (!root) return null;
  if (!Array.isArray(playedMoves)) return null;
  let node = root;

  for (const move of playedMoves) {
    const edge = node.childMap.get(normalizeMove(move));
    if (!edge) return null;
    node = edge.child;
  }

  return node;
}

export function findTreeEdge(node, san) {
  if (!node?.childMap || typeof san !== "string" || !san.trim()) return null;
  return node.childMap.get(normalizeMove(san)) || null;
}

export function chooseRandomTreeEdge(node, { random = Math.random } = {}) {
  if (!node?.children?.length) return null;
  return node.children[randomArrayIndex(node.children.length, random)] || null;
}

export function chooseTreeContinuation(
  variationEntries,
  edge,
  { randomize = false, preferredVariationIndex = null, random = Math.random } = {},
) {
  if (!edge?.variationIndices?.length) return null;

  const entryMap = buildEntryMap(variationEntries);
  const candidateIndices = edge.variationIndices.filter((index) => entryMap.has(index));
  if (!candidateIndices.length) return null;

  const chosenIndex = preferredVariationIndex !== null && candidateIndices.includes(preferredVariationIndex)
    ? preferredVariationIndex
    : randomize
      ? candidateIndices[randomArrayIndex(candidateIndices.length, random)]
      : candidateIndices[0];
  const entry = entryMap.get(chosenIndex);

  return entry ? { index: chosenIndex, moves: entry.moves } : null;
}

export function summarizeTreeBranches(node, variationEntries) {
  if (!node?.children?.length) return [];

  const entryMap = buildEntryMap(variationEntries);

  return node.children.map((edge) => {
    const sourceLabels = edge.variationIndices
      .map((index) => entryMap.get(index))
      .filter(Boolean)
      .map((entry) => entry.variation?.saved ? "saved" : "built-in");
    const hasSaved = sourceLabels.includes("saved");
    const hasBuiltIn = sourceLabels.includes("built-in");

    return {
      san: edge.san,
      count: sourceLabels.length,
      source: hasSaved && hasBuiltIn ? "built-in + saved" : hasSaved ? "saved" : hasBuiltIn ? "built-in" : "unknown",
    };
  });
}
