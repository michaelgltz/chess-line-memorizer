# Recall64

## Product

Recall64 is a polished, private chess opening trainer built with Vite and React.
Users practice complete opening lines, explore playable alternate moves with local
Stockfish analysis, save and manage variations, continue into free play, and train
weak or due positions. It is also an installable Progressive Web App (PWA) for
phone home screens.

## Brand

- The display name is `Recall64`. Do not write `The Recall64`, `Recall 64`, or
  append `Chess` to the brand name.
- The category descriptor is `private chess opening trainer`.
- The tagline is `Practice openings. Play beyond them.`
- Shared runtime brand language belongs in `src/config/brand.js`.
- The old names that remain inside legacy storage keys and cache cleanup are
  compatibility identifiers, not public brand language.

The trainer is for learning an opening from either side. Do not describe openings
as inherently "for White" or "for Black"; the selected practice side determines
which moves the user must recall.

## Start Here For New AI Sessions

- Read this file first.
- Then read `AI_CONTEXT.md` for the project map, data flows, common task
  playbooks, gotchas, and current upgrade context.
- Use `README.md` for the short human-facing overview and local commands.

## Product Direction

- Keep the interface clean, stable, and focused on training rather than revealing
  possible answers before the user moves.
- Favor practical human opening preparation over unusual engine-only moves.
- Mobile portrait layout is a first-class experience and must be visually checked.
- Avoid layout jumping and cramped analysis panels.
- Keep maintenance actions such as import/export inside the Variation Manager.
- The main line is the primary practice action, but every built-in and saved line
  should be individually playable from the Variation Manager.
- Use concise, friendly interface text.

## Architecture

- `src/App.jsx` owns most trainer state and behavior.
- `src/data/openings.js` owns the built-in opening catalog.
- `src/lib/chess.js` contains shared chess notation, replay, and board helpers.
- `src/lib/variations.js` contains variation catalog, dedupe, and runtime move-tree
  logic.
- `src/lib/trainingMemory.js` contains practice-mode selection and training-memory
  logic.
- `src/lib/stockfish.js` contains Stockfish parsing, analysis, and evaluation helpers.
- `src/lib/stockfishController.js` owns Stockfish request IDs, channel cancellation,
  worker lifecycle, and completed-analysis caching.
- `src/components/` contains the extracted UI sections.
- `src/components/DesktopLayout.jsx` and `src/components/MobileLayout.jsx` define
  intentionally separate desktop and mobile composition.
- `src/styles/DesktopLayout.css` and `src/styles/MobileLayout.css` own layout-specific
  styling. Shared component styling remains in `src/App.css`.
- The mobile layout breakpoint is `900px`, selected in `App.jsx` with `useMediaQuery`.
- `chess.js` validates and replays moves.
- `react-chessboard@5.10.0` renders the board. It receives configuration through
  `<Chessboard options={chessboardOptions} />`.
- Stockfish runs locally as a Web Worker from
  `/public/stockfish/stockfish-18-lite-single.js`.
- `src/main.jsx` registers the service worker in production builds only.
- `public/manifest.webmanifest` defines the installed app name, colors, and
  Android-compatible icons.
- `public/service-worker.js` pre-caches the app shell and Stockfish files, then
  caches successful same-origin requests for offline fallback.
- `public/icons/` contains the `192px`, `512px`, and iOS `180px` home-screen
  artwork. `index.html` supplies the iOS-specific PWA metadata.

## Important Behavior

- Stockfish evaluations shown in the UI are always from White's perspective.
- All Stockfish requests use controller channels so superseded analysis cannot
  update a newer position.
- Computer repertoire replies wait a random `250-500ms`.
- Dropping a piece back on its starting square or clicking away from its legal moves
  should silently cancel the move, not show an illegal-move warning.
- Board legal moves use familiar destination dots.
- Off-book moves within the configured evaluation threshold can be accepted while
  extending a variation, even when they are outside Stockfish's displayed top three.
- Free-play move history remains clickable for position review.
- Free play shows the top three Stockfish moves for the current position.
- A playable alternate analysis must remain visible in mobile portrait layout.
- Missed positions queue once and can be reviewed together after the current line.
- The PWA requires HTTPS in deployment (localhost is the development exception).
  It opens in standalone mode after the user adds it to their phone home screen.

## Variations And Storage

- Built-in and saved variations are currently stored as complete PGN-style lines,
  not as a persistent move tree.
- Use `buildVariationCatalog` and `variationDedupeKey` in `src/lib/variations.js` when combining
  built-in and saved lines. Exact normalized duplicate lines must not receive extra
  practice weight.
- Preserve the existing saved variation data format.
- Saved variations use the legacy localStorage key
  `chess-line-memorizer-saved-variations`. Do not rename it without a migration.
- Training memory uses the legacy localStorage key `opening-lab-training-memory`.
- Weak-spot memory is position-, expected-move-, opening-, and practice-side-aware.
- Training records include streaks, lapses, recent outcomes, and next-review timing.
- PWA Cache Storage contains only app resources. It must not be used for saved
  variations or training memory, which remain in localStorage.

## Current Major Upgrade Opportunities

- Continue reducing the size and responsibility of `App.jsx` without changing
  behavior.
- Improve training memory and weak-spot review as the trainer gains more usage data.
- Keep expanding practical opening coverage and variations.

## Working Agreements

- Read the relevant existing code before choosing an implementation.
- Preserve established patterns and keep changes narrowly scoped.
- Do not undo unrelated working-tree changes.
- When changing UI, inspect both desktop and mobile portrait layouts visually.
- Keep desktop and mobile composition in their separate layout files; shared
  behavior and shared components should not be duplicated.
- When changing PWA-delivered static assets, keep `public/service-worker.js`
  `APP_SHELL` in sync so a first offline launch still has every required file.
- Treat a deployment URL change as a new browser storage origin: users' saved
  variations and training memory do not move between domains automatically.
- After app changes, provide a short suggested git commit message.
- Do not provide commit-message suggestions for general conversation or planning.

## Verification

Run:

```bash
npm test
npm run lint
npm run build
```

For UI work, also start the local app:

```bash
npm run dev
```

Then use the in-app Browser to inspect and screenshot at least:

- Desktop around `1440x900`
- Mobile portrait around `390x844`
- Mobile landscape when the change affects board or analysis layout

Check that the board remains square, text does not overlap, analysis is visible,
and the desktop layout has not regressed.

For PWA changes, also run a production preview with `npm run preview` after the
build. Verify the manifest, service worker, and icon files are served, then use
an HTTPS deployment to test Add to Home Screen in iPhone Safari.
