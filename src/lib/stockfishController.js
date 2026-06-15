import {
  ENGINE_DEPTH,
  parseBestMove,
  parseStockfishInfo,
  STOCKFISH_PATH,
} from "./stockfish.js";

const DEFAULT_CACHE_LIMIT = 200;
const DEFAULT_FEN_TIMEOUT_MS = 6000;
const DEFAULT_TOP_MOVES_TIMEOUT_MS = 7000;

export class StockfishRequestCancelledError extends Error {
  constructor(message = "Stockfish request cancelled") {
    super(message);
    this.name = "StockfishRequestCancelledError";
  }
}

export function isStockfishRequestCancelled(error) {
  return error instanceof StockfishRequestCancelledError || error?.name === "AbortError";
}

function extractPvFromInfoLine(line) {
  const marker = " pv ";
  const index = line.indexOf(marker);
  return index === -1 ? "" : line.slice(index + marker.length).trim();
}

function multiPvFromInfoLine(line) {
  const tokens = line.split(" ");
  const multiPvIndex = tokens.indexOf("multipv");
  return multiPvIndex === -1 ? 1 : Number(tokens[multiPvIndex + 1] || 1);
}

export function createStockfishController({
  workerFactory = () => new Worker(STOCKFISH_PATH),
  cacheLimit = DEFAULT_CACHE_LIMIT,
} = {}) {
  const activeRequests = new Map();
  const cache = new Map();
  let nextRequestId = 1;
  let disposed = false;

  function cacheResult(key, result) {
    if (!key || result === null || result === undefined) return;
    cache.delete(key);
    cache.set(key, result);

    while (cache.size > cacheLimit) {
      cache.delete(cache.keys().next().value);
    }
  }

  function cancel(channel) {
    activeRequests.get(channel)?.cancel();
  }

  function runRequest({
    cacheKey,
    channel,
    commands,
    consumeLine,
    onUpdate,
    signal,
    timeoutMs,
    timeoutResult,
  }) {
    if (disposed) {
      return Promise.reject(new StockfishRequestCancelledError("Stockfish controller disposed"));
    }

    cancel(channel);

    if (signal?.aborted) {
      return Promise.reject(new StockfishRequestCancelledError());
    }

    if (cache.has(cacheKey)) {
      return Promise.resolve(cache.get(cacheKey));
    }

    const requestId = nextRequestId;
    nextRequestId += 1;

    return new Promise((resolve, reject) => {
      const worker = workerFactory();
      let settled = false;
      let timeout = null;

      function cleanup() {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", cancelRequest);
        if (activeRequests.get(channel)?.requestId === requestId) {
          activeRequests.delete(channel);
        }

        worker.onmessage = null;
        worker.onerror = null;

        try {
          worker.postMessage("quit");
          worker.terminate();
        } catch {
          // Ignore cleanup errors.
        }
      }

      function finish(result, { shouldCache = true } = {}) {
        if (settled) return;
        settled = true;
        if (shouldCache) cacheResult(cacheKey, result);
        cleanup();
        resolve(result);
      }

      function fail(error) {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      }

      function cancelRequest() {
        if (settled) return;
        try {
          worker.postMessage("stop");
        } catch {
          // Ignore stop errors before terminating.
        }
        fail(new StockfishRequestCancelledError());
      }

      activeRequests.set(channel, { requestId, cancel: cancelRequest });

      worker.onmessage = (event) => {
        if (settled || activeRequests.get(channel)?.requestId !== requestId || signal?.aborted) return;
        const line = String(event.data || "").trim();
        if (!line) return;

        const outcome = consumeLine(line);
        if (outcome?.update !== undefined) {
          onUpdate?.({
            channel,
            requestId,
            result: outcome.update,
          });
        }
        if (outcome?.done) {
          finish(outcome.result, { shouldCache: outcome.shouldCache !== false });
        }
      };

      worker.onerror = () => {
        fail(new Error("Stockfish worker unavailable"));
      };

      signal?.addEventListener("abort", cancelRequest, { once: true });
      timeout = setTimeout(() => finish(timeoutResult, { shouldCache: false }), timeoutMs);

      for (const command of commands) {
        worker.postMessage(command);
      }
    });
  }

  function analyzeFen(fen, {
    channel = "fen",
    depth = ENGINE_DEPTH,
    onUpdate,
    signal,
    timeoutMs = DEFAULT_FEN_TIMEOUT_MS,
  } = {}) {
    let latestInfo = null;

    return runRequest({
      cacheKey: `fen|${depth}|${fen}`,
      channel,
      commands: [
        "uci",
        `position fen ${fen}`,
        `go depth ${depth}`,
      ],
      consumeLine(line) {
        const info = parseStockfishInfo(line);
        if (info) {
          latestInfo = { ...info, pv: extractPvFromInfoLine(line) };
          return { update: latestInfo };
        }

        const bestMove = parseBestMove(line);
        if (!bestMove) return null;
        return {
          done: true,
          result: { ...(latestInfo || {}), bestMove },
        };
      },
      onUpdate,
      signal,
      timeoutMs,
      timeoutResult: null,
    });
  }

  function analyzeTopMoves(fen, {
    channel = "top-moves",
    depth = ENGINE_DEPTH,
    multiPv = 3,
    signal,
    timeoutMs = DEFAULT_TOP_MOVES_TIMEOUT_MS,
  } = {}) {
    const linesByPv = {};

    return runRequest({
      cacheKey: `top|${depth}|${multiPv}|${fen}`,
      channel,
      commands: [
        "uci",
        `setoption name MultiPV value ${multiPv}`,
        `position fen ${fen}`,
        `go depth ${depth}`,
      ],
      consumeLine(line) {
        const info = parseStockfishInfo(line);
        if (info) {
          const multiPvNumber = multiPvFromInfoLine(line);
          const pv = extractPvFromInfoLine(line);
          const bestMove = pv.split(" ").filter(Boolean)[0];

          linesByPv[multiPvNumber] = {
            ...info,
            multiPv: multiPvNumber,
            bestMove,
            pv,
          };
          return null;
        }

        if (!parseBestMove(line)) return null;
        return {
          done: true,
          result: Object.values(linesByPv)
            .filter((entry) => entry.bestMove)
            .sort((entryA, entryB) => entryA.multiPv - entryB.multiPv),
        };
      },
      signal,
      timeoutMs,
      timeoutResult: [],
    });
  }

  function clearCache() {
    cache.clear();
  }

  function dispose() {
    disposed = true;
    for (const request of [...activeRequests.values()]) {
      request.cancel();
    }
    activeRequests.clear();
    cache.clear();
  }

  return {
    analyzeFen,
    analyzeTopMoves,
    cancel,
    clearCache,
    dispose,
  };
}
