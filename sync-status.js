const SYNC_STATUS = {
  "lastSync": "29/10/2026, 12:44:57 pm",
  "status": "Partial",
  "source": "group-archive",
  "totalIpos": 307,
  "sources": {
    "miti-portal": {
      "status": "failed",
      "lastSuccess": "2026-10-28T17:30:05.620Z",
      "lastAttempt": "2026-10-29T04:44:54.663Z",
      "message": "MITI public portal HTTP 403 (access denied from this runner); existing data retained."
    },
    "miti-applicants": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-29T04:44:54.736Z",
      "message": "Puppeteer is not installed in CI; run scratch/sync-miti-applicants-login.js locally."
    },
    "isaham-api": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-29T04:35:44.235Z",
      "message": "Not used by choice; IPO data comes from KLSE Screener, i3investor and MITI."
    },
    "klse": {
      "status": "success",
      "lastSuccess": "2026-10-29T04:35:45.162Z",
      "lastAttempt": "2026-10-29T04:35:45.162Z",
      "message": "Sync completed."
    },
    "i3investor": {
      "status": "partial",
      "lastSuccess": "2026-10-28T11:07:44.314Z",
      "lastAttempt": "2026-10-29T04:44:53.565Z",
      "message": "119 prices refreshed; 3 could not be refreshed."
    },
    "shariah": {
      "status": "success",
      "lastSuccess": "2026-10-29T04:44:57.165Z",
      "lastAttempt": "2026-10-29T04:44:57.165Z",
      "message": "Sync completed."
    },
    "target-calculation": {
      "status": "success",
      "lastSuccess": "2026-10-29T04:44:57.261Z",
      "lastAttempt": "2026-10-29T04:44:57.261Z",
      "message": "Sync completed."
    },
    "group-archive": {
      "status": "success",
      "lastSuccess": "2026-10-29T04:44:57.610Z",
      "lastAttempt": "2026-10-29T04:44:57.610Z",
      "message": "Sync completed."
    },
    "ipo-pages": {
      "status": "success",
      "lastSuccess": "2026-10-29T04:44:57.528Z",
      "lastAttempt": "2026-10-29T04:44:57.528Z",
      "message": "Sync completed."
    },
    "balloting": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-29T04:44:53.661Z",
      "message": "Overall public OS: 0 updated, 1 unavailable, 0 deferred."
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SYNC_STATUS;
}
