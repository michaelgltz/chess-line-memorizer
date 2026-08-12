import fs from "node:fs";
import path from "node:path";
import { configHash } from "./config.mjs";
import { createSeedNode } from "./chess-utils.mjs";

export function statePath(config) {
  return path.join(config.runDirectory, "state.json");
}

export function createState(config) {
  return {
    schemaVersion: 1,
    configHash: configHash(config),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    queue: config.seeds.map(createSeedNode),
    leaves: [],
    explorerCache: {},
    engineCache: {},
    stats: { processedPositions: 0, explorerRequests: 0, engineRequests: 0 },
  };
}

export function loadOrCreateState(config) {
  const file = statePath(config);
  if (!fs.existsSync(file)) return createState(config);
  const state = JSON.parse(fs.readFileSync(file, "utf8"));
  if (state.configHash !== configHash(config)) {
    throw new Error(`The saved run at ${file} belongs to a different configuration. Use a different runDirectory.`);
  }
  return state;
}

export function saveState(config, state) {
  fs.mkdirSync(config.runDirectory, { recursive: true });
  state.updatedAt = new Date().toISOString();
  const file = statePath(config);
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`);
  fs.renameSync(temporary, file);
}
