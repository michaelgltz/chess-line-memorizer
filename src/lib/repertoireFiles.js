import { BRAND } from "../config/brand.js";

export const REPERTOIRE_EXPORT_VERSION = 1;

export function createRepertoireExport(savedVariations, exportedAt = new Date().toISOString()) {
  return {
    format: BRAND.exportFormat,
    app: BRAND.name,
    version: REPERTOIRE_EXPORT_VERSION,
    exportedAt,
    savedVariations,
  };
}

export function repertoireExportFilename(date = new Date()) {
  return `${BRAND.exportPrefix}-${date.toISOString().slice(0, 10)}.json`;
}

export function extractImportedVariations(parsed) {
  const imported = parsed?.savedVariations || parsed;

  if (!imported || typeof imported !== "object" || Array.isArray(imported)) {
    throw new Error("Invalid repertoire file");
  }

  return imported;
}
