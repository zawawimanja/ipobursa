const SYNC_STATUS = {
  "lastSync": "26/10/2026, 10:37:13 pm",
  "status": "Partial",
  "source": "ipo-pages",
  "totalIpos": 307,
  "sources": {
    "miti-portal": {
      "status": "failed",
      "lastSuccess": "2026-10-22T03:21:43.723Z",
      "lastAttempt": "2026-10-26T14:37:13.457Z",
      "message": "MITI public portal HTTP 403 (access denied from this runner); existing data retained."
    },
    "miti-applicants": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-26T14:37:13.548Z",
      "message": "Puppeteer is not installed in CI; run scratch/sync-miti-applicants-login.js locally."
    },
    "isaham-api": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-26T09:45:48.642Z",
      "message": "Not used by choice; IPO data comes from KLSE Screener, i3investor and MITI."
    },
    "klse": {
      "status": "success",
      "lastSuccess": "2026-10-26T09:45:49.540Z",
      "lastAttempt": "2026-10-26T09:45:49.540Z",
      "message": "Sync completed."
    },
    "i3investor": {
      "status": "success",
      "lastSuccess": "2026-10-26T09:57:32.105Z",
      "lastAttempt": "2026-10-26T09:57:32.105Z",
      "message": "115 prices refreshed; 0 could not be refreshed."
    },
    "shariah": {
      "status": "success",
      "lastSuccess": "2026-10-26T09:57:35.038Z",
      "lastAttempt": "2026-10-26T09:57:35.038Z",
      "message": "Sync completed."
    },
    "target-calculation": {
      "status": "success",
      "lastSuccess": "2026-10-26T09:57:35.135Z",
      "lastAttempt": "2026-10-26T09:57:35.135Z",
      "message": "Sync completed."
    },
    "group-archive": {
      "status": "success",
      "lastSuccess": "2026-10-26T09:57:35.479Z",
      "lastAttempt": "2026-10-26T09:57:35.479Z",
      "message": "Sync completed."
    },
    "ipo-pages": {
      "status": "success",
      "lastSuccess": "2026-10-26T14:37:13.935Z",
      "lastAttempt": "2026-10-26T14:37:13.935Z",
      "message": "Sync completed."
    },
    "balloting": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-26T09:57:32.207Z",
      "message": "No recent IPOs missing overall public OS."
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SYNC_STATUS;
}
