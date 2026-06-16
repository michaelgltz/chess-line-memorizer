# Opening Lab

Opening Lab is a polished chess opening repertoire trainer built with Vite and
React. Users practice complete opening lines, explore practical alternate moves
with local Stockfish analysis, save variations, continue into free play, and
review weak or due positions.

## Start Here

- New AI sessions: read `AGENTS.md`, then `AI_CONTEXT.md`.
- Product and architecture overview: `AI_CONTEXT.md`.
- Built-in openings: `src/data/openings.js`.
- Main trainer behavior: `src/App.jsx`.
- Runtime move tree and variation catalog: `src/lib/variations.js`.
- Training memory: `src/lib/trainingMemory.js`.
- Stockfish request handling: `src/lib/stockfishController.js`.

## Local Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm test
npm run lint
npm run build
```

For UI changes, also run the local app and visually inspect desktop and mobile
portrait. Mobile portrait is a first-class layout for this project.

## Notes

- Saved variations and training memory use browser `localStorage`.
- Stockfish runs locally from `public/stockfish/stockfish-18-lite-single.js`.
- The app stores saved variations as complete PGN-style lines and builds a
  runtime move tree from those lines during practice.
