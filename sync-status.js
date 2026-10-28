const SYNC_STATUS = {
  "lastSync": "28/10/2026, 6:05:33 pm",
  "status": "Partial",
  "source": "ipo-pages",
  "totalIpos": 307,
  "sources": {
    "miti-portal": {
      "status": "failed",
      "lastSuccess": "2026-10-22T03:21:43.723Z",
      "lastAttempt": "2026-10-28T10:05:32.680Z",
      "message": "MITI public portal HTTP 403 (access denied from this runner); existing data retained."
    },
    "miti-applicants": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-28T10:05:32.778Z",
      "message": "Puppeteer is not installed in CI; run scratch/sync-miti-applicants-login.js locally."
    },
    "isaham-api": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-28T04:14:22.108Z",
      "message": "Not used by choice; IPO data comes from KLSE Screener, i3investor and MITI."
    },
    "klse": {
      "status": "success",
      "lastSuccess": "2026-10-28T04:14:22.867Z",
      "lastAttempt": "2026-10-28T04:14:22.867Z",
      "message": "Sync completed."
    },
    "i3investor": {
      "status": "partial",
      "lastSuccess": "2026-10-27T04:00:35.171Z",
      "lastAttempt": "2026-10-28T04:25:43.545Z",
      "message": "111 prices refreshed; 2 could not be refreshed."
    },
    "shariah": {
      "status": "success",
      "lastSuccess": "2026-10-28T04:25:45.013Z",
      "lastAttempt": "2026-10-28T04:25:45.013Z",
      "message": "Sync completed."
    },
    "target-calculation": {
      "status": "success",
      "lastSuccess": "2026-10-28T04:25:45.105Z",
      "lastAttempt": "2026-10-28T04:25:45.105Z",
      "message": "Sync completed."
    },
    "group-archive": {
      "status": "success",
      "lastSuccess": "2026-10-28T04:25:45.394Z",
      "lastAttempt": "2026-10-28T04:25:45.394Z",
      "message": "Sync completed."
    },
    "ipo-pages": {
      "status": "success",
      "lastSuccess": "2026-10-28T10:05:33.048Z",
      "lastAttempt": "2026-10-28T10:05:33.048Z",
      "message": "Sync completed."
    },
    "balloting": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-28T04:25:43.631Z",
      "message": "No recent IPOs missing overall public OS."
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SYNC_STATUS;
}
