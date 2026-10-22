const SYNC_STATUS = {
  "lastSync": "22/10/2026, 12:29:25 pm",
  "status": "Partial",
  "source": "group-archive",
  "totalIpos": 307,
  "sources": {
    "miti-portal": {
      "status": "failed",
      "lastSuccess": "2026-10-22T03:21:43.723Z",
      "lastAttempt": "2026-10-22T04:29:22.817Z",
      "message": "MITI public portal HTTP 403 (access denied from this runner); existing data retained."
    },
    "miti-applicants": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-22T04:29:22.881Z",
      "message": "Cannot find package 'puppeteer' imported from /home/runner/work/ipobursa/ipobursa/scratch/sync-miti-applicants-login.js"
    },
    "isaham-api": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-22T04:22:53.777Z",
      "message": "Not used by choice; IPO data comes from KLSE Screener, i3investor and MITI."
    },
    "klse": {
      "status": "success",
      "lastSuccess": "2026-10-22T04:22:54.543Z",
      "lastAttempt": "2026-10-22T04:22:54.543Z",
      "message": "Sync completed."
    },
    "i3investor": {
      "status": "partial",
      "lastSuccess": null,
      "lastAttempt": "2026-10-22T04:29:19.924Z",
      "message": "111 prices refreshed; 1 could not be refreshed."
    },
    "shariah": {
      "status": "success",
      "lastSuccess": "2026-10-22T04:29:25.577Z",
      "lastAttempt": "2026-10-22T04:29:25.577Z",
      "message": "Sync completed."
    },
    "target-calculation": {
      "status": "success",
      "lastSuccess": "2026-10-22T04:29:25.654Z",
      "lastAttempt": "2026-10-22T04:29:25.654Z",
      "message": "Sync completed."
    },
    "group-archive": {
      "status": "success",
      "lastSuccess": "2026-10-22T04:29:25.942Z",
      "lastAttempt": "2026-10-22T04:29:25.942Z",
      "message": "Sync completed."
    },
    "ipo-pages": {
      "status": "success",
      "lastSuccess": "2026-10-22T04:29:25.875Z",
      "lastAttempt": "2026-10-22T04:29:25.875Z",
      "message": "Sync completed."
    },
    "balloting": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-22T04:29:19.998Z",
      "message": "Overall public OS: 0 updated, 1 unavailable, 0 deferred."
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SYNC_STATUS;
}
