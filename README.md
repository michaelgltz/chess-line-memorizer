# Recall64

**Practice openings. Play beyond them.**

Recall64 is a polished, private chess opening trainer built with Vite and
React. Users practice complete opening lines, explore practical alternate moves
with local Stockfish analysis, save variations, continue into free play, and
review weak or due positions. It can also be installed as a phone home-screen
app.

**Live site:** [recall64.vercel.app](https://recall64.vercel.app/)

## Start Here

- New AI sessions: read `AGENTS.md`, then `AI_CONTEXT.md`.
- Product and architecture overview: `AI_CONTEXT.md`.
- Built-in openings: `src/data/openings.js`.
- Main trainer behavior: `src/App.jsx`.
- Runtime move tree and variation catalog: `src/lib/variations.js`.
- Training memory: `src/lib/trainingMemory.js`.
- Stockfish request handling: `src/lib/stockfishController.js`.
- Brand language: `src/config/brand.js`.
- Repertoire import/export compatibility: `src/lib/repertoireFiles.js`.

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

## Use On Your Phone

Recall64 can be installed as an app from a secure (HTTPS) deployment. On an
iPhone, open the deployed site in Safari, tap Share, then choose **Add to Home
Screen**. Launching it from the new Recall64 icon opens it without Safari's
browser controls and keeps the trainer and local Stockfish files available after
the first visit.

Saved variations and training memory stay on the device and are tied to the
same deployed site address.

## Notes

- Saved variations and training memory use browser `localStorage`.
- Stockfish runs locally from `public/stockfish/stockfish-18-lite-single.js`.
- The app stores saved variations as complete PGN-style lines and builds a
  runtime move tree from those lines during practice.
- The app's offline resources are managed separately from user data; saved
  variations and training memory remain in browser `localStorage`.
