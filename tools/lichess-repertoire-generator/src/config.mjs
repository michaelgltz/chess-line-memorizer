import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const SPEEDS = ["UltraBullet", "Bullet", "Blitz", "Rapid", "Classical", "Correspondence"];
const RATINGS = [400, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500];

export function slugify(value) {
  return String(value || "repertoire")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "repertoire";
}

function assert(condition, message) {
  if (!condition) throw new Error(`Invalid configuration: ${message}`);
}

function normalizeSeed(seed, index) {
  const moves = Array.isArray(seed) ? seed : seed?.moves;
  assert(Array.isArray(moves) && moves.length > 0, `seeds[${index}] must contain SAN moves`);
  return {
    name: Array.isArray(seed) ? `Seed ${index + 1}` : String(seed.name || `Seed ${index + 1}`),
    moves: moves.map((move) => String(move).trim()).filter(Boolean),
    reach: Array.isArray(seed) ? 1 : Number(seed.reach ?? 1),
  };
}

export function normalizeConfig(raw, configPath = "config.json") {
  const configDirectory = path.dirname(path.resolve(configPath));
  const name = String(raw.name || "Lichess repertoire").trim();
  const repertoireSide = String(raw.repertoireSide || "").toLowerCase();
  assert(name, "name is required");
  assert(["white", "black"].includes(repertoireSide), "repertoireSide must be white or black");
  assert(Number.isInteger(raw.maxFullmove) && raw.maxFullmove >= 1, "maxFullmove must be a positive integer");

  const seedInputs = raw.seeds || (raw.seedMoves ? [raw.seedMoves] : null);
  assert(Array.isArray(seedInputs) && seedInputs.length > 0, "seeds or seedMoves is required");
  const seeds = seedInputs.map(normalizeSeed);

  const speeds = raw.explorer?.speeds || ["Blitz", "Rapid", "Classical", "Correspondence"];
  const ratings = raw.explorer?.ratings || [1800, 2000, 2200, 2500];
  assert(speeds.every((speed) => SPEEDS.includes(speed)), `explorer.speeds must use: ${SPEEDS.join(", ")}`);
  assert(ratings.every((rating) => RATINGS.includes(Number(rating))), `explorer.ratings must use: ${RATINGS.join(", ")}`);

  const slug = slugify(raw.slug || name);
  const outputDirectory = path.resolve(configDirectory, raw.outputDirectory || "output");
  const runDirectory = path.resolve(configDirectory, raw.runDirectory || path.join(".runs", slug));
  const includePgnFiles = (raw.includePgnFiles || []).map((file) => path.resolve(configDirectory, file));

  const config = {
    schemaVersion: 1,
    name,
    slug,
    repertoireSide,
    maxFullmove: raw.maxFullmove,
    seeds,
    branching: {
      minMoveShare: Number(raw.branching?.minMoveShare ?? 0.08),
      maxBranches: Number(raw.branching?.maxBranches ?? 3),
      targetCoverage: Number(raw.branching?.targetCoverage ?? 0.75),
      minAbsoluteReach: Number(raw.branching?.minAbsoluteReach ?? 0.001),
    },
    explorer: {
      speeds,
      ratings: ratings.map(Number),
      since: raw.explorer?.since ? String(raw.explorer.since) : "",
      until: raw.explorer?.until ? String(raw.explorer.until) : "",
      tokenEnvironmentVariable: String(raw.explorer?.tokenEnvironmentVariable || "LICHESS_TOKEN"),
      tokenKeychainService: String(raw.explorer?.tokenKeychainService || "com.recall64.lichess-explorer"),
      retries: Number(raw.explorer?.retries ?? 6),
      requestSpacingMs: Number(raw.explorer?.requestSpacingMs ?? 1200),
    },
    engine: {
      minDepth: Number(raw.engine?.minDepth ?? 55),
      stabilityDepthSpan: Number(raw.engine?.stabilityDepthSpan ?? 8),
      maxPositionSeconds: Number(raw.engine?.maxPositionSeconds ?? 900),
      pollIntervalMs: Number(raw.engine?.pollIntervalMs ?? 500),
    },
    browser: {
      headless: raw.browser?.headless !== false,
      executablePath: raw.browser?.executablePath || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    },
    includePgnFiles,
    outputDirectory,
    runDirectory,
  };

  assert(config.branching.minMoveShare >= 0 && config.branching.minMoveShare <= 1, "minMoveShare must be between 0 and 1");
  assert(Number.isInteger(config.branching.maxBranches) && config.branching.maxBranches >= 1, "maxBranches must be a positive integer");
  assert(config.branching.targetCoverage > 0 && config.branching.targetCoverage <= 1, "targetCoverage must be between 0 and 1");
  assert(config.branching.minAbsoluteReach >= 0 && config.branching.minAbsoluteReach <= 1, "minAbsoluteReach must be between 0 and 1");
  assert(Number.isInteger(config.engine.minDepth) && config.engine.minDepth >= 1, "engine.minDepth must be a positive integer");
  assert(Number.isInteger(config.engine.stabilityDepthSpan) && config.engine.stabilityDepthSpan >= 0, "engine.stabilityDepthSpan must be non-negative");
  assert(config.engine.maxPositionSeconds > 0, "engine.maxPositionSeconds must be positive");
  assert(Number.isInteger(config.explorer.retries) && config.explorer.retries >= 1, "explorer.retries must be a positive integer");
  assert(config.explorer.requestSpacingMs >= 0, "explorer.requestSpacingMs must be non-negative");
  assert(config.engine.pollIntervalMs >= 100, "engine.pollIntervalMs must be at least 100");

  const finalPly = repertoireSide === "white" ? config.maxFullmove * 2 - 1 : config.maxFullmove * 2;
  for (const seed of seeds) {
    assert(seed.reach > 0 && seed.reach <= 1, `seed reach must be between 0 and 1 for ${seed.name}`);
    assert(seed.moves.length <= finalPly, `${seed.name} is longer than maxFullmove permits`);
  }
  return config;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function configHash(config) {
  // Only settings that affect the generated chess tree belong in the resume key.
  // A headed rerun, output rename, or timeout tweak can safely reuse cached work.
  const generationSettings = {
    repertoireSide: config.repertoireSide,
    maxFullmove: config.maxFullmove,
    seeds: config.seeds,
    branching: config.branching,
    explorer: {
      speeds: config.explorer.speeds,
      ratings: config.explorer.ratings,
      since: config.explorer.since,
      until: config.explorer.until,
    },
    engine: {
      minDepth: config.engine.minDepth,
      stabilityDepthSpan: config.engine.stabilityDepthSpan,
    },
  };
  const stable = stableStringify(generationSettings);
  return createHash("sha256").update(stable).digest("hex");
}

export function loadConfig(configPath) {
  const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
  return normalizeConfig(raw, configPath);
}
