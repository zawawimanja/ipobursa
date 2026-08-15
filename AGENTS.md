# AGENTS.md

## Session learnings

- User communicates in Malay ("ak projek ni" = "apa projek ni" = "what is this project?"); reply in Malay unless they switch.
- `node` and `python`/`python3` are NOT on PATH in the tool shell (Windows Git Bash, home `C:\Users\akaun`). The python/py found in `AppData/Local/Microsoft/WindowsApps` are Store-alias stubs that only print "Python was not found". Scripts like scraper.js/audit-*.js cannot be executed from the shell here; treat their output files as pre-generated.
- `data.js` and `data.json` are parallel sources of truth for the same IPO dataset (browser loads `data.js` via `<script src="data.js?v=...">`; Node scripts read `data.json`). When adding/updating IPOs, both must be kept in sync.
- `overrides.json` holds manual grade overrides applied on top of predicted grades (`apply-overrides.js`); predicted grades come from `predict_grades.js`/`audit-grades.js`.
- Static site deployed on Vercel (`vercel.json`, `@vercel/analytics`, single serverless fn `api/chat.js`). `index.html` cache-busts `data.js?v=2.1` and `sync-status.js?v=2.0` — bump the version query when the data changes.
- IPO records live in a 5-stage lifecycle (1 Draft → 2 MITI/Bumi → 3 Public → 4 Pre-Listing/balloting → 5 Listed); `stage` field is 1–5, graded A/B/C/Pending via OS (oversubscription), PE, sector.
- `scratch/` holds dozens of one-off analysis/backtest scripts operating on `data.json`; `archive/` and `*.csv` exports are historical snapshots.
