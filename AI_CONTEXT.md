# AI Context: Recall64

This file is the fastest way for a new AI session to understand the project.
Read this after `AGENTS.md` and before making changes.

## One-Screen Summary

Recall64 is a Vite + React chess opening trainer. It lets users practice
complete opening lines from either side, explore alternate moves with local
Stockfish analysis, save variations, continue into free play, and review weak or
due positions. Its tagline is "Practice openings. Play beyond them."
The canonical production URL is `https://recall64.vercel.app/`.

The app is still intentionally simple: no backend, no database, and no account
system. Built-in opening lines live in source, saved variations and training
memory live in `localStorage`, and Stockfish runs locally as a browser worker.
The production build is an installable PWA: a manifest, home-screen icons, and
service worker let it launch standalone on a phone and work offline after its
first successful visit.

The most important maintenance reality: `src/App.jsx` still coordinates much of
the trainer state and behavior. Prefer extracting focused logic over adding more
large behavior directly to `App.jsx`.

## Read These First

1. `AGENTS.md` for product direction, working agreements, and verification rules.
2. `src/App.jsx` for the main trainer state machine and event handlers.
3. `src/lib/variations.js` for saved/built-in variation cataloging and runtime
   move-tree behavior.
4. `src/lib/trainingMemory.js` for weak-spot and due-review scheduling.
5. `src/lib/stockfishController.js` and `src/lib/stockfish.js` for engine
   request ownership, parsing, scoring, and mistake explanations.
6. `src/components/DesktopLayout.jsx` and `src/components/MobileLayout.jsx` for
   layout composition. Keep desktop and mobile composition separate.
7. `public/service-worker.js` and `public/manifest.webmanifest` for installed
   app and offline behavior.

## Product Rules That Matter

- This is a trainer, not an answer-revealer. Do not show playable branches before
  the user has moved unless the mode explicitly calls for analysis or review.
- The selected practice side determines which moves the user must recall. Avoid
  describing openings as inherently for one color.
- Mobile portrait is first-class. Any UI change needs visual verification around
  `390x844`.
- The board must remain square. Analysis panels must stay visible and should not
  cause layout jumps.
- Maintenance actions such as import/export belong in the Variation Manager.
- The main line is the primary practice action, but every built-in and saved line
  should remain individually playable from the Variation Manager.
- Interface text should stay short and friendly.

## Architecture Map

- `src/App.jsx`
  - Owns selected opening, selected variation, current move index, review state,
    free play, extension mode, mistake analysis, training session state, and most
    event handlers.
  - Builds the runtime move tree and chooses branches during practice.
  - Wires shared props into desktop or mobile layout.
- `src/data/openings.js`
  - Built-in opening catalog. Lines are stored as PGN-style strings.
- `src/lib/chess.js`
  - Shared move parsing, replay, SAN/UCI conversion, legal target lookup, and
    board helper functions.
- `src/lib/variations.js`
  - Combines built-in and saved lines, dedupes normalized duplicate lines, builds
    runtime move trees, and chooses branches.
- `src/config/brand.js`
  - Owns the Recall64 runtime name, canonical production URL, descriptor,
    tagline, and export identifiers.
- `src/lib/repertoireFiles.js`
  - Creates brand-independent repertoire exports and keeps legacy export files
    importable after the rebrand.
- `src/lib/trainingMemory.js`
  - Tracks attempts, streaks, lapses, recent outcomes, due review timing, weak
    positions, and session review queues.
- `src/lib/stockfishController.js`
  - Central Stockfish request owner. Uses named channels, request cancellation,
    worker cleanup, and a bounded completed-result cache so stale engine results
    cannot update newer positions.
- `src/lib/stockfish.js`
  - Stockfish parsing and formatting helpers plus dynamic wrong-move analysis.
- `src/components/`
  - UI sections. Keep shared behavior in `App.jsx` or `src/lib/*`; avoid copying
    behavior between desktop and mobile layouts.
- `src/styles/DesktopLayout.css` and `src/styles/MobileLayout.css`
  - Layout-specific CSS. Shared component CSS remains in `src/App.css`.
- `src/main.jsx`
  - Registers `/service-worker.js` only in a production build.
- `index.html`
  - Links the web manifest and provides Apple touch-icon and standalone app
    metadata.
- `public/manifest.webmanifest`
  - Defines Recall64's installed name, theme colors, standalone display mode,
    and Android-compatible icons.
- `public/service-worker.js`
  - Pre-caches the app shell, PWA icons, and local Stockfish worker/WASM files.
  - Uses the network when available, caches successful same-origin requests, and
    falls back to cache when offline.
- `public/icons/`
  - Contains `icon-192.png`, `icon-512.png`, and the iOS
    `apple-touch-icon.png`.
- `tests/`
  - Node test suite for variation trees, training memory, and Stockfish request
    cancellation.

## Core Data Flows

### Practice Line Selection

1. Built-in lines come from `OPENINGS`.
2. Saved browser variations come from localStorage key
   `chess-line-memorizer-saved-variations`.
3. `buildVariationCatalog` combines them and skips exact normalized duplicate
   lines for practice weight.
4. `buildVariationEntries` and `buildMoveTree` create a runtime tree from full
   lines.
5. During practice, `findTreeEdge` accepts any valid branch from the current
   position, and `chooseTreeContinuation` selects the rest of the line.

### Training Attempt

1. User tries a move in `tryPlayerMove`.
2. Correct attempts update training memory and may switch to the matching branch.
3. Wrong attempts call `rememberTrainingAttempt`, `recordMistake`, and
   `analyzeWrongMoveDynamically`.
4. Session review queues missed positions once, then lets the user review them
   after the current line.

### Engine Analysis

1. All Stockfish work goes through `createStockfishController`.
2. Use separate channels for independent UI surfaces:
   - `board-eval`
   - `free-play-top`
   - `extension-top`
   - `extension-check`
   - `wrong-move`
3. A newer request on the same channel cancels the old worker.
4. UI state should only display analysis for the exact position it belongs to.
   `App.jsx` uses `engineEvalFen` for this.
5. Scores shown in the UI are always from White's perspective.

### Installed App And Offline Use

1. A production build registers `service-worker.js` after the page load event.
   Development mode deliberately does not register it.
2. On install, the worker caches the entry page, manifest, PWA icons, and local
   Stockfish JavaScript/WASM so engine analysis remains available offline.
3. Successful same-origin GET requests refresh the cache while online; cached
   responses are used when a network request fails.
4. The PWA must be deployed over HTTPS (except localhost). On iPhone, users add
   it through Safari's Share menu, then launch it from the home-screen icon.

### Free Play

1. Free play starts from the final trained position.
2. Users can keep making legal moves for either side.
3. Move history remains clickable for position review.
4. The current free-play position shows the top three Stockfish moves.

### Variation Extension

1. Playable alternate wrong moves can be saved or extended.
2. Extension mode can accept top move only or moves within the configured eval
   threshold.
3. Off-list legal moves can still be accepted if Stockfish scores them within
   the threshold.

## Storage Keys

- Saved variations:
  - Legacy-compatible key: `chess-line-memorizer-saved-variations`
  - Do not rename without a migration.
  - Shape: object keyed by opening id, each value an array of saved variation
    records.
- Training memory:
  - Legacy-compatible key: `opening-lab-training-memory`
  - Position records are opening-, side-, FEN-, and expected-move-aware.
- PWA resources:
  - Current Cache Storage key: `recall64-v3`
  - The service worker still recognizes the legacy `opening-lab-` prefix for cleanup.
  - Contains application resources only; saved variations and training records
    must remain in localStorage.

## Common Task Playbooks

### UI Change

1. Identify whether the change belongs in a shared component or in a layout file.
2. Keep desktop and mobile layout composition separate.
3. Run `npm run lint` and `npm run build`.
4. Start `npm run dev`.
5. Visually inspect desktop around `1440x900` and mobile portrait around
   `390x844`. Add mobile landscape when board or analysis layout is affected.

### Engine Change

1. Route requests through `stockfishController.js`; do not create ad hoc workers
   in components.
2. Use a named channel so superseded requests cancel cleanly.
3. Add or update tests in `tests/stockfishController.test.js` when cancellation,
   caching, or concurrent analysis behavior changes.
4. Live-test at least board eval, free-play top moves, and wrong-move analysis.

### Training Memory Change

1. Start in `src/lib/trainingMemory.js`.
2. Preserve position-aware keys so weak spots do not mix openings, sides, FENs, or
   expected moves.
3. Update `tests/trainingMemory.test.js`.
4. Check the Training Memory panel text on desktop and mobile.

### Variation Or Move-Tree Change

1. Start in `src/lib/variations.js`.
2. Preserve saved variation storage as full PGN-style lines.
3. Build runtime tree behavior from complete built-in and saved lines.
4. Update `tests/variations.test.js`.
5. Verify random practice, direct saved-line practice, and duplicate saved lines.

### Opening Content Change

1. Edit `src/data/openings.js`.
2. Favor practical human repertoire lines over engine-only curiosities.
3. Keep line names clear and short.
4. Verify the lines parse by running tests and trying at least one changed line in
   the UI.

### PWA Change

1. Keep install metadata in `index.html` and `public/manifest.webmanifest`
   aligned with the Recall64 name, colors, and icon paths.
2. When an asset is essential to a first offline launch, include its relative URL
   in `APP_SHELL` in `public/service-worker.js`.
3. Keep `src/main.jsx` registration production-only so development remains free
   of stale cached bundles.
4. Run `npm run build`, then `npm run preview`, and confirm the manifest,
   worker, icons, and Stockfish files are served from the production output.
5. For a real install test, use an HTTPS deployment and Safari on an iPhone.

## Current Strengths

- Runtime move tree exists and supports branching practice from full lines.
- Saved duplicate lines are deduped for practice weight.
- Training memory tracks streaks, lapses, recent outcomes, weak positions, due
  review timing, and session review.
- Stockfish request ownership is centralized and tested against stale results.
- Free play shows top three engine moves for the current position.
- Desktop and mobile layout composition are intentionally separate.
- The trainer is installable from a phone home screen and keeps its app shell and
  local Stockfish files available offline after the first visit.

## Likely Next Improvements

- Continue extracting focused logic out of `App.jsx`.
- Expand the opening catalog now that the runtime move tree can make branches
  useful naturally.
- Add more focused UI and browser-level regression tests once major workflows
  stabilize.
- Improve long-term training reports after more user behavior is represented in
  memory.

## Gotchas

- Do not rename localStorage keys casually.
- Do not use direct `new Worker(...)` outside `stockfishController.js`.
- Do not reveal branch choices before the user moves during normal training.
- Do not let saved duplicate lines add extra random-practice weight.
- Do not merge desktop and mobile layout files to reduce apparent duplication;
  their separate composition is intentional.
- Do not treat Stockfish scores as side-to-move scores in the UI. Convert to
  White perspective before display.
- Do not skip visual checks for mobile portrait after UI changes.
- Do not expect PWA install or service worker behavior over plain HTTP in a real
  deployment; it needs HTTPS.
- Do not accidentally migrate user data by changing the deployed origin. Browser
  localStorage and service-worker caches are origin-specific.
- Do not register the service worker during `npm run dev`; stale development
  assets make debugging unreliable.

## Verification Commands

```bash
npm test
npm run lint
npm run build
```

For UI work:

```bash
npm run dev
```

Then inspect the running app in desktop and mobile portrait. If board or analysis
layout changed, inspect mobile landscape too.

For PWA work, build first and use `npm run preview` to exercise the production
worker. Verify manifest and icon responses as well as the normal trainer flow.
