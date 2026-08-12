# Lichess repertoire generator

This is a standalone, resumable generator for creating Opening Lab-compatible
PGN repertoires. It does not modify Recall64.

At every opponent turn it selects practical moves from the Lichess opening
database. At every repertoire turn it opens the same Lichess analysis board a
person would use. It accepts a sufficiently deep cached Cloud Stockfish result,
or runs the browser's local Stockfish until the configured depth and stability
requirements are met.

## Install

From this directory:

```bash
npm install
```

Chrome must be installed. The default path is the normal macOS location; use
`browser.executablePath` in a config file if yours is elsewhere.

Lichess began requiring authentication for Opening Explorer in March 2026.
Create a [personal API token](https://lichess.org/account/oauth/token) with no
scopes selected, then load it into the current terminal without putting it in
shell history:

```zsh
read -s "LICHESS_TOKEN?Paste the no-scope Lichess token: "; export LICHESS_TOKEN; echo
```

The generator reads the token only from the environment. It never writes the
token to a config, checkpoint, log, audit, or output file.

## Generate

```bash
npm run generate -- configs/white-1d4.json
```

Add `--headed` to watch Chrome work:

```bash
npm run generate -- configs/white-1d4.json --headed
```

The command can be stopped and restarted with the exact same command. Every
completed Explorer or Stockfish request is written atomically to `.runs/`, and
the queue resumes from the last checkpoint. Do not run two copies with the same
`runDirectory` at once.

Generated files go to `output/<repertoire>/`:

- `*.pgn` is ready to import as a new Opening Lab repertoire.
- `*-audit.json` records every branch, frequency, engine result, depth, source,
  evaluation, and elapsed time.
- `*-summary.json` gives line counts and min/max engine depths.

## What “deepest” means

There is no finite “highest possible” engine depth. The supplied configs use
this reproducible rule:

1. Use Lichess Cloud Stockfish when its cached result is at least depth 55.
2. Otherwise click **Go deeper** and run Lichess's browser Stockfish to at least
   depth 55.
3. For a local result, require the top move to stay unchanged for another eight
   plies of reported search depth.
4. Fail instead of silently accepting a shallower move after the per-position
   timeout.

Increase `engine.minDepth`, `engine.stabilityDepthSpan`, or
`engine.maxPositionSeconds` if you want a slower standard. Depth is not directly
comparable across engines or positions, so the audit file is the reliable record
of what was actually used.

## Branching controls

The opponent move selector reads the configured Lichess speed/rating pool and
walks moves in popularity order:

- `minMoveShare`: ignore moves below this share at the current position.
- `maxBranches`: hard cap on opponent choices at one position.
- `targetCoverage`: stop after the selected moves cover this share of games.
- `minAbsoluteReach`: prune a branch when the product of its move frequencies is
  too small. The most common move is always retained so a line can continue.

The example configs favor human preparation: 1800+ rated Blitz through
Correspondence games, up to three opponent moves per turn, and roughly 80% local
coverage. Lowering the thresholds can multiply the run size quickly.

## New repertoire

Copy the closest file in `configs/` and change:

- `name`, `slug`, and `repertoireSide`
- one or more legal SAN `seeds`
- `maxFullmove`

A seed is the fixed opening prefix. For example, the Sicilian config begins
after `1. e4 c5`; White choices are then sampled and Black replies come from
Stockfish. The `white-1d4` config begins after only `1. d4`, so Black's realistic
first reply is branched instead of hard-coded.

To merge previously generated/imported games into the final PGN, list their
paths under `includePgnFiles`. Exact move-sequence duplicates are removed.
