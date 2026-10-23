const SYNC_STATUS = {
  "lastSync": "23/10/2026, 10:10:44 am",
  "status": "Partial",
  "source": "ipo-pages",
  "totalIpos": 307,
  "sources": {
    "miti-portal": {
      "status": "failed",
      "lastSuccess": "2026-10-22T03:21:43.723Z",
      "lastAttempt": "2026-10-23T02:10:43.959Z",
      "message": "MITI public portal HTTP 403 (access denied from this runner); existing data retained."
    },
    "miti-applicants": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-23T02:10:44.035Z",
      "message": "Puppeteer is not installed in CI; run scratch/sync-miti-applicants-login.js locally."
    },
    "isaham-api": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-22T09:11:04.498Z",
      "message": "Not used by choice; IPO data comes from KLSE Screener, i3investor and MITI."
    },
    "klse": {
      "status": "success",
      "lastSuccess": "2026-10-22T09:11:05.645Z",
      "lastAttempt": "2026-10-22T09:11:05.645Z",
      "message": "Sync completed."
    },
    "i3investor": {
      "status": "partial",
      "lastSuccess": "2026-10-22T05:07:15.327Z",
      "lastAttempt": "2026-10-22T09:34:53.758Z",
      "message": "75 prices refreshed; 34 could not be refreshed."
    },
    "shariah": {
      "status": "success",
      "lastSuccess": "2026-10-22T09:34:58.108Z",
      "lastAttempt": "2026-10-22T09:34:58.108Z",
      "message": "Sync completed."
    },
    "target-calculation": {
      "status": "success",
      "lastSuccess": "2026-10-22T09:34:58.223Z",
      "lastAttempt": "2026-10-22T09:34:58.223Z",
      "message": "Sync completed."
    },
    "group-archive": {
      "status": "success",
      "lastSuccess": "2026-10-22T09:34:58.629Z",
      "lastAttempt": "2026-10-22T09:34:58.629Z",
      "message": "Sync completed."
    },
    "ipo-pages": {
      "status": "success",
      "lastSuccess": "2026-10-23T02:10:44.204Z",
      "lastAttempt": "2026-10-23T02:10:44.204Z",
      "message": "Sync completed."
    },
    "balloting": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-22T09:34:53.858Z",
      "message": "Overall public OS: 0 updated, 1 unavailable, 0 deferred."
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SYNC_STATUS;
}
