import fs from "node:fs";
import { chromium } from "playwright-core";
import { positionKey } from "./chess-utils.mjs";

const SPEED_KEYS = {
  UltraBullet: "ultraBullet",
  Bullet: "bullet",
  Blitz: "blitz",
  Rapid: "rapid",
  Classical: "classical",
  Correspondence: "correspondence",
};

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function analysisUrl(fen) {
  return `https://lichess.org/analysis/standard/${fen.replaceAll(" ", "_")}`;
}

function numericDepth(text) {
  return Number(String(text || "").match(/Depth\s+(\d+)/)?.[1] || 0);
}

function retryDelay(response, attempt) {
  if (response?.status === 429) return 60_000;
  return Math.min(attempt * 4_000, 30_000);
}

export class LichessBrowserProvider {
  constructor(config, state, checkpoint, logger = console, fetchImpl = fetch) {
    this.config = config;
    this.state = state;
    this.checkpoint = checkpoint;
    this.logger = logger;
    this.fetch = fetchImpl;
    this.token = "";
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  async open() {
    this.token = process.env[this.config.explorer.tokenEnvironmentVariable] || "";
    if (!this.token) {
      throw new Error(
        `Lichess Opening Explorer requires authentication. Set ${this.config.explorer.tokenEnvironmentVariable} `
        + "to a no-scope personal token: https://lichess.org/account/oauth/token"
      );
    }
  }

  async ensureBrowser() {
    if (this.page) return;
    if (!fs.existsSync(this.config.browser.executablePath)) {
      throw new Error(`Chrome was not found at ${this.config.browser.executablePath}`);
    }
    this.browser = await chromium.launch({
      executablePath: this.config.browser.executablePath,
      headless: this.config.browser.headless,
      args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding"],
    });
    this.context = await this.browser.newContext({ locale: "en-US" });
    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(15_000);
  }

  async close() {
    await this.browser?.close();
  }

  async navigate(fen) {
    await this.ensureBrowser();
    await this.page.goto(analysisUrl(fen), { waitUntil: "domcontentloaded", timeout: 30_000 });
  }

  explorerUrl(fen) {
    const url = new URL("https://explorer.lichess.org/lichess");
    url.searchParams.set("variant", "standard");
    url.searchParams.set("fen", fen);
    url.searchParams.set("speeds", this.config.explorer.speeds.map((speed) => SPEED_KEYS[speed]).join(","));
    url.searchParams.set("ratings", this.config.explorer.ratings.map((rating) => rating === 400 ? 0 : rating).join(","));
    if (this.config.explorer.since) url.searchParams.set("since", this.config.explorer.since);
    if (this.config.explorer.until) url.searchParams.set("until", this.config.explorer.until);
    url.searchParams.set("moves", "12");
    return url;
  }

  async getExplorerMoves(fen) {
    const key = positionKey(fen);
    if (this.state.explorerCache[key]) return this.state.explorerCache[key].moves;
    const url = this.explorerUrl(fen);
    let lastError;
    for (let attempt = 1; attempt <= this.config.explorer.retries; attempt += 1) {
      let response;
      try {
        response = await this.fetch(url, {
          headers: { Authorization: `Bearer ${this.token}`, Accept: "application/json" },
        });
        if (response.status === 401 || response.status === 403) {
          throw new Error(`token in ${this.config.explorer.tokenEnvironmentVariable} was rejected (${response.status})`);
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const total = Number(data.white || 0) + Number(data.draws || 0) + Number(data.black || 0);
        const moves = (data.moves || []).map((move) => {
          const games = Number(move.white || 0) + Number(move.draws || 0) + Number(move.black || 0);
          return {
            uci: move.uci,
            san: move.san,
            games,
            share: total ? games / total : 0,
            white: Number(move.white || 0),
            draws: Number(move.draws || 0),
            black: Number(move.black || 0),
          };
        });
        this.state.explorerCache[key] = {
          fen,
          totalGames: total,
          moves,
          sourceUrl: url.toString(),
          collectedAt: new Date().toISOString(),
        };
        this.state.stats.explorerRequests += 1;
        this.checkpoint();
        await sleep(this.config.explorer.requestSpacingMs);
        return moves;
      } catch (error) {
        lastError = error;
        if (response?.status === 401 || response?.status === 403) break;
        this.logger.warn(`Explorer retry ${attempt}/${this.config.explorer.retries}: ${error.message}`);
        await sleep(retryDelay(response, attempt));
      }
    }
    throw new Error(`Lichess Explorer failed for ${fen}: ${lastError?.message || "unknown error"}`);
  }

  async analyze(fen) {
    const key = positionKey(fen);
    if (this.state.engineCache[key]) return this.state.engineCache[key];

    await this.navigate(fen);
    const toggle = this.page.locator("#cmn-tg-analyse-toggle-ceval");
    await toggle.waitFor({ state: "attached" });
    if (!(await toggle.isChecked())) {
      await this.page.locator('label[for="cmn-tg-analyse-toggle-ceval"]').click();
    }

    const startedAt = Date.now();
    const deadline = startedAt + this.config.engine.maxPositionSeconds * 1000;
    let previousMove = "";
    let stableSinceDepth = 0;
    let requestedDeeper = false;
    let observedCloudDepth = null;
    let latest = null;

    while (Date.now() < deadline) {
      const pv = this.page.locator(".pv[data-uci]").first();
      if (!(await pv.isVisible().catch(() => false))) {
        await sleep(this.config.engine.pollIntervalMs);
        continue;
      }
      const uci = await pv.getAttribute("data-uci");
      const infoText = await this.page.locator(".ceval .info").textContent().catch(() => "");
      const depth = numericDepth(infoText);
      const cloud = await this.page.locator(".ceval .cloud").isVisible().catch(() => false);
      const evaluation = await this.page.locator(".ceval pearl").textContent().catch(() => "");
      const engineLabel = await this.page.locator(".ceval .engine span[title]").first().getAttribute("title").catch(() => "Stockfish");
      latest = { uci, depth, cloud, evaluation, engineLabel, infoText };
      if (cloud) observedCloudDepth = Math.max(observedCloudDepth || 0, depth);

      if (uci !== previousMove) {
        previousMove = uci;
        stableSinceDepth = depth;
      }
      if (cloud && depth >= this.config.engine.minDepth) break;
      if (cloud && depth < this.config.engine.minDepth && !requestedDeeper) {
        const deeper = this.page.locator(".ceval .deeper");
        if (await deeper.isVisible().catch(() => false)) {
          await deeper.click();
          requestedDeeper = true;
          stableSinceDepth = depth;
        }
      }
      if (!cloud && depth >= this.config.engine.minDepth && depth - stableSinceDepth >= this.config.engine.stabilityDepthSpan) break;
      await sleep(this.config.engine.pollIntervalMs);
    }

    if (!latest?.uci || latest.depth < this.config.engine.minDepth) {
      throw new Error(`Lichess Stockfish did not reach depth ${this.config.engine.minDepth} for ${fen}; latest was ${latest?.depth || 0}`);
    }
    const result = {
      ...latest,
      fen,
      cloud: Boolean(latest.cloud),
      sourceUrl: analysisUrl(fen),
      priorCloudDepth: latest.cloud ? null : observedCloudDepth,
      elapsedSeconds: Math.round((Date.now() - startedAt) / 1000),
      collectedAt: new Date().toISOString(),
    };
    this.state.engineCache[key] = result;
    this.state.stats.engineRequests += 1;
    this.checkpoint();
    return result;
  }
}
