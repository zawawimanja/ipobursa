const SYNC_STATUS = {
  "lastSync": "27/10/2026, 5:55:40 pm",
  "status": "Partial",
  "source": "group-archive",
  "totalIpos": 307,
  "sources": {
    "miti-portal": {
      "status": "failed",
      "lastSuccess": "2026-10-22T03:21:43.723Z",
      "lastAttempt": "2026-10-27T09:55:37.638Z",
      "message": "MITI public portal HTTP 403 (access denied from this runner); existing data retained."
    },
    "miti-applicants": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-27T09:55:37.734Z",
      "message": "Puppeteer is not installed in CI; run scratch/sync-miti-applicants-login.js locally."
    },
    "isaham-api": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-27T09:38:13.710Z",
      "message": "Not used by choice; IPO data comes from KLSE Screener, i3investor and MITI."
    },
    "klse": {
      "status": "success",
      "lastSuccess": "2026-10-27T09:38:15.219Z",
      "lastAttempt": "2026-10-27T09:38:15.219Z",
      "message": "Sync completed."
    },
    "i3investor": {
      "status": "partial",
      "lastSuccess": "2026-10-27T04:00:35.171Z",
      "lastAttempt": "2026-10-27T09:55:37.006Z",
      "message": "115 prices refreshed; 5 could not be refreshed."
    },
    "shariah": {
      "status": "success",
      "lastSuccess": "2026-10-27T09:55:39.786Z",
      "lastAttempt": "2026-10-27T09:55:39.786Z",
      "message": "Sync completed."
    },
    "target-calculation": {
      "status": "success",
      "lastSuccess": "2026-10-27T09:55:39.914Z",
      "lastAttempt": "2026-10-27T09:55:39.914Z",
      "message": "Sync completed."
    },
    "group-archive": {
      "status": "success",
      "lastSuccess": "2026-10-27T09:55:40.322Z",
      "lastAttempt": "2026-10-27T09:55:40.322Z",
      "message": "Sync completed."
    },
    "ipo-pages": {
      "status": "success",
      "lastSuccess": "2026-10-27T09:55:40.221Z",
      "lastAttempt": "2026-10-27T09:55:40.221Z",
      "message": "Sync completed."
    },
    "balloting": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-27T09:55:37.112Z",
      "message": "No recent IPOs missing overall public OS."
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SYNC_STATUS;
}
