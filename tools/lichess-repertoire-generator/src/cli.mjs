#!/usr/bin/env node
import path from "node:path";
import { loadConfig } from "./config.mjs";
import { loadOrCreateState, saveState, statePath } from "./state.mjs";
import { LichessBrowserProvider } from "./lichess-browser.mjs";
import { generate } from "./generator.mjs";
import { writeOutputs } from "./output.mjs";

const configArgument = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
if (!configArgument) {
  console.error("Usage: npm run generate -- <config.json> [--headed]");
  process.exit(1);
}

const configPath = path.resolve(configArgument);
const config = loadConfig(configPath);
if (process.argv.includes("--headed")) config.browser.headless = false;
const state = loadOrCreateState(config);
const checkpoint = () => saveState(config, state);
const provider = new LichessBrowserProvider(config, state, checkpoint);

console.log(`Generating ${config.name}`);
console.log(`Checkpoint: ${statePath(config)}`);
console.log(`Resuming with queue=${state.queue.length}, leaves=${state.leaves.length}`);

try {
  checkpoint();
  await provider.open();
  await generate(config, state, provider, checkpoint);
  const output = writeOutputs(config, state);
  console.log(JSON.stringify(output.summary, null, 2));
} finally {
  checkpoint();
  await provider.close();
}
