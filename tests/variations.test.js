import assert from "node:assert/strict";
import test from "node:test";
import { OPENINGS } from "../src/data/openings.js";
import {
  buildMoveTree,
  buildVariationCatalog,
  buildVariationEntries,
  chooseRandomTreeEdge,
  chooseTreeContinuation,
  findMoveTreeNode,
  findTreeEdge,
  summarizeTreeBranches,
  variationDedupeKey,
} from "../src/lib/variations.js";

test("variation catalog gives normalized duplicate lines one playable entry", () => {
  const builtIn = [{ name: "Built in", line: "1. e4 e5 2. Nf3 Nc6" }];
  const saved = [{ name: "Saved duplicate", line: "1. e4 e5 2. Nf3+ Nc6?!" }];

  const catalog = buildVariationCatalog(builtIn, saved);

  assert.equal(variationDedupeKey(builtIn[0].line), variationDedupeKey(saved[0].line));
  assert.equal(catalog.playableVariations.length, 1);
  assert.equal(catalog.savedRows[0].duplicateOf, catalog.playableVariations[0]);
});

test("move tree merges shared prefixes, counts unique lines, and marks line endings", () => {
  const entries = buildVariationEntries([
    { name: "Open game", line: "1. e4 e5 2. Nf3 Nc6" },
    { name: "Sicilian", line: "1. e4 c5 2. Nf3 d6" },
    { name: "Petrov", line: "1. e4 e5 2. Nf3 Nf6" },
  ]);

  const tree = buildMoveTree(entries);
  const afterE4 = findMoveTreeNode(tree, ["e4"]);
  const afterOpenGame = findMoveTreeNode(tree, ["e4", "e5", "Nf3", "Nc6"]);

  assert.deepEqual(tree.children.map((edge) => edge.san), ["e4"]);
  assert.deepEqual(afterE4.children.map((edge) => edge.san), ["e5", "c5"]);
  assert.equal(afterE4.childMap.get("e5").count, 2);
  assert.equal(afterE4.childMap.get("c5").count, 1);
  assert.deepEqual(afterOpenGame.terminalVariationIndices, [0]);
});

test("a line ending can coexist with a longer continuation at the same node", () => {
  const entries = buildVariationEntries([
    { name: "Short line", line: "1. e4 e5" },
    { name: "Long line", line: "1. e4 e5 2. Nf3 Nc6" },
  ]);

  const afterE5 = findMoveTreeNode(buildMoveTree(entries), ["e4", "e5"]);

  assert.deepEqual(afterE5.terminalVariationIndices, [0]);
  assert.deepEqual(afterE5.children.map((edge) => edge.san), ["Nf3"]);
});

test("move tree defensively ignores duplicate, empty, malformed, and reused-id entries", () => {
  const tree = buildMoveTree([
    { index: 10, variation: { name: "Canonical" }, moves: ["e4", "e5"] },
    { index: 20, variation: { name: "Duplicate" }, moves: ["e4+", "e5?!"] },
    { index: 30, variation: { name: "Empty" }, moves: [] },
    { index: 40, variation: { name: "Malformed" }, moves: ["e4", null] },
    { index: 50, variation: { name: "Annotation only" }, moves: ["??"] },
    { index: 10, variation: { name: "Reused id" }, moves: ["d4", "d5"] },
  ]);

  assert.deepEqual(tree.variationIndices, [10]);
  assert.deepEqual(tree.children.map((edge) => edge.san), ["e4"]);
  assert.equal(tree.children[0].count, 1);
  assert.deepEqual(findMoveTreeNode(tree, ["e4", "e5"]).terminalVariationIndices, [10]);
});

test("findMoveTreeNode returns the root for no moves and null for an unknown branch", () => {
  const tree = buildMoveTree(buildVariationEntries([
    { name: "Line", line: "1. d4 d5 2. c4" },
  ]));

  assert.equal(findMoveTreeNode(tree), tree);
  assert.equal(findMoveTreeNode(tree, []), tree);
  assert.equal(findMoveTreeNode(tree, ["e4"]), null);
});

test("tree edge helpers safely recognize trained moves and choose opponent branches", () => {
  const tree = buildMoveTree(buildVariationEntries([
    { name: "Open game", line: "1. e4 e5" },
    { name: "Sicilian", line: "1. e4 c5" },
  ]));
  const afterE4 = findMoveTreeNode(tree, ["e4"]);

  assert.equal(findTreeEdge(afterE4, "e5?!")?.san, "e5");
  assert.equal(findTreeEdge(afterE4, "d5"), null);
  assert.equal(findTreeEdge(afterE4, null), null);
  assert.equal(chooseRandomTreeEdge(afterE4, { random: () => 0.999 })?.san, "c5");
  assert.equal(chooseRandomTreeEdge(afterE4, { random: null })?.san, "e5");
  assert.equal(chooseRandomTreeEdge(findMoveTreeNode(tree, ["e4", "e5"])), null);
});

test("continuation selection uses stable sparse ids and honors a valid preferred line", () => {
  const entries = [
    { index: 7, variation: { name: "First" }, moves: ["e4", "e5"] },
    { index: 42, variation: { name: "Second" }, moves: ["e4", "c5"] },
  ];
  const edge = buildMoveTree(entries).childMap.get("e4");

  const continuation = chooseTreeContinuation(entries, edge, {
    randomize: true,
    preferredVariationIndex: 42,
  });

  assert.deepEqual(continuation, { index: 42, moves: ["e4", "c5"] });
});

test("random continuation selection accepts an injectable random source", () => {
  const entries = [
    { index: 7, variation: { name: "First" }, moves: ["e4", "e5"] },
    { index: 42, variation: { name: "Second" }, moves: ["e4", "c5"] },
  ];
  const edge = buildMoveTree(entries).childMap.get("e4");
  const originalRandom = Math.random;

  try {
    Math.random = () => 0;
    const continuation = chooseTreeContinuation(entries, edge, {
      randomize: true,
      random: () => 0.999,
    });

    assert.equal(continuation.index, 42);
  } finally {
    Math.random = originalRandom;
  }
});

test("branch summaries resolve sparse ids and report mixed built-in and saved sources", () => {
  const entries = [
    { index: 7, variation: { name: "Built in" }, moves: ["e4", "e5"] },
    { index: 42, variation: { name: "Saved", saved: true }, moves: ["e4", "c5"] },
  ];

  const summary = summarizeTreeBranches(buildMoveTree(entries), entries);

  assert.deepEqual(summary, [{
    san: "e4",
    count: 2,
    source: "built-in + saved",
  }]);
});

test("real opening data exposes known Englund branches", () => {
  const opening = OPENINGS.find((entry) => entry.id === "englund-white");
  const catalog = buildVariationCatalog(opening.variations, []);
  const tree = buildMoveTree(buildVariationEntries(catalog.playableVariations));
  const branch = findMoveTreeNode(tree, ["d4", "e5", "dxe5"]);

  assert.deepEqual(branch.children.map((edge) => edge.san), ["Nc6", "d6"]);
});
