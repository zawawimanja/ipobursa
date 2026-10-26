const SYNC_STATUS = {
  "lastSync": "26/10/2026, 3:19:09 pm",
  "status": "Partial",
  "source": "ipo-pages",
  "totalIpos": 307,
  "sources": {
    "miti-portal": {
      "status": "failed",
      "lastSuccess": "2026-10-22T03:21:43.723Z",
      "lastAttempt": "2026-10-26T07:19:09.175Z",
      "message": "MITI public portal HTTP 403 (access denied from this runner); existing data retained."
    },
    "miti-applicants": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-26T07:19:09.265Z",
      "message": "Puppeteer is not installed in CI; run scratch/sync-miti-applicants-login.js locally."
    },
    "isaham-api": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-26T03:26:36.206Z",
      "message": "Not used by choice; IPO data comes from KLSE Screener, i3investor and MITI."
    },
    "klse": {
      "status": "success",
      "lastSuccess": "2026-10-26T03:26:37.266Z",
      "lastAttempt": "2026-10-26T03:26:37.266Z",
      "message": "Sync completed."
    },
    "i3investor": {
      "status": "success",
      "lastSuccess": "2026-10-26T03:34:03.557Z",
      "lastAttempt": "2026-10-26T03:34:03.557Z",
      "message": "119 prices refreshed; 0 could not be refreshed."
    },
    "shariah": {
      "status": "success",
      "lastSuccess": "2026-10-26T03:34:06.137Z",
      "lastAttempt": "2026-10-26T03:34:06.137Z",
      "message": "Sync completed."
    },
    "target-calculation": {
      "status": "success",
      "lastSuccess": "2026-10-26T03:34:06.252Z",
      "lastAttempt": "2026-10-26T03:34:06.252Z",
      "message": "Sync completed."
    },
    "group-archive": {
      "status": "success",
      "lastSuccess": "2026-10-26T03:34:06.645Z",
      "lastAttempt": "2026-10-26T03:34:06.645Z",
      "message": "Sync completed."
    },
    "ipo-pages": {
      "status": "success",
      "lastSuccess": "2026-10-26T07:19:09.516Z",
      "lastAttempt": "2026-10-26T07:19:09.516Z",
      "message": "Sync completed."
    },
    "balloting": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-26T03:34:03.674Z",
      "message": "No recent IPOs missing overall public OS."
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SYNC_STATUS;
}
