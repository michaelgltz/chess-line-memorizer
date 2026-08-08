import assert from "node:assert/strict";
import test from "node:test";
import { BRAND } from "../src/config/brand.js";
import {
  createRepertoireExport,
  extractImportedVariations,
  repertoireExportFilename,
} from "../src/lib/repertoireFiles.js";

test("new repertoire exports use the brand-independent format and Recall64 identity", () => {
  const savedVariations = { "london-white": [{ name: "Saved", line: "1. d4 d5" }] };
  const exportedAt = "2026-08-08T12:00:00.000Z";

  assert.deepEqual(createRepertoireExport(savedVariations, exportedAt), {
    format: "chess-opening-repertoire",
    app: "Recall64",
    version: 1,
    exportedAt,
    savedVariations,
  });
  assert.equal(BRAND.exportFormat, "chess-opening-repertoire");
  assert.equal(repertoireExportFilename(new Date(exportedAt)), "recall64-repertoire-2026-08-08.json");
});

test("legacy branded and raw repertoire exports remain importable", () => {
  const savedVariations = { "london-white": [{ name: "Legacy", line: "1. d4 d5" }] };

  assert.equal(extractImportedVariations({
    app: "Opening Lab",
    version: 1,
    savedVariations,
  }), savedVariations);
  assert.equal(extractImportedVariations(savedVariations), savedVariations);
});

test("invalid repertoire exports are rejected", () => {
  assert.throws(() => extractImportedVariations(null), /Invalid repertoire file/);
  assert.throws(() => extractImportedVariations([]), /Invalid repertoire file/);
  assert.throws(() => extractImportedVariations("not-json-data"), /Invalid repertoire file/);
});
