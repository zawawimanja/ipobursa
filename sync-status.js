const SYNC_STATUS = {
  "lastSync": "22/10/2026, 1:27:30 pm",
  "status": "Partial",
  "source": "group-archive",
  "totalIpos": 307,
  "sources": {
    "miti-portal": {
      "status": "failed",
      "lastSuccess": "2026-10-22T03:21:43.723Z",
      "lastAttempt": "2026-10-22T05:27:29.626Z",
      "message": "MITI public portal HTTP 403 (access denied from this runner); existing data retained."
    },
    "miti-applicants": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-22T05:27:29.696Z",
      "message": "Puppeteer is not installed in CI; run scratch/sync-miti-applicants-login.js locally."
    },
    "isaham-api": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-22T05:10:47.950Z",
      "message": "Not used by choice; IPO data comes from KLSE Screener, i3investor and MITI."
    },
    "klse": {
      "status": "success",
      "lastSuccess": "2026-10-22T05:10:48.741Z",
      "lastAttempt": "2026-10-22T05:10:48.741Z",
      "message": "Sync completed."
    },
    "i3investor": {
      "status": "partial",
      "lastSuccess": "2026-10-22T05:07:15.327Z",
      "lastAttempt": "2026-10-22T05:27:27.631Z",
      "message": "110 prices refreshed; 4 could not be refreshed."
    },
    "shariah": {
      "status": "success",
      "lastSuccess": "2026-10-22T05:27:30.586Z",
      "lastAttempt": "2026-10-22T05:27:30.586Z",
      "message": "Sync completed."
    },
    "target-calculation": {
      "status": "success",
      "lastSuccess": "2026-10-22T05:27:30.671Z",
      "lastAttempt": "2026-10-22T05:27:30.671Z",
      "message": "Sync completed."
    },
    "group-archive": {
      "status": "success",
      "lastSuccess": "2026-10-22T05:27:30.964Z",
      "lastAttempt": "2026-10-22T05:27:30.964Z",
      "message": "Sync completed."
    },
    "ipo-pages": {
      "status": "success",
      "lastSuccess": "2026-10-22T05:27:30.885Z",
      "lastAttempt": "2026-10-22T05:27:30.885Z",
      "message": "Sync completed."
    },
    "balloting": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-22T05:27:27.718Z",
      "message": "Overall public OS: 0 updated, 1 unavailable, 0 deferred."
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SYNC_STATUS;
}
