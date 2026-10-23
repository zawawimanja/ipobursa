const SYNC_STATUS = {
  "lastSync": "23/10/2026, 5:33:39 pm",
  "status": "Partial",
  "source": "group-archive",
  "totalIpos": 307,
  "sources": {
    "miti-portal": {
      "status": "failed",
      "lastSuccess": "2026-10-22T03:21:43.723Z",
      "lastAttempt": "2026-10-23T09:33:38.410Z",
      "message": "MITI public portal HTTP 403 (access denied from this runner); existing data retained."
    },
    "miti-applicants": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-23T09:33:38.496Z",
      "message": "Puppeteer is not installed in CI; run scratch/sync-miti-applicants-login.js locally."
    },
    "isaham-api": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-23T09:07:48.344Z",
      "message": "Not used by choice; IPO data comes from KLSE Screener, i3investor and MITI."
    },
    "klse": {
      "status": "success",
      "lastSuccess": "2026-10-23T09:07:49.086Z",
      "lastAttempt": "2026-10-23T09:07:49.086Z",
      "message": "Sync completed."
    },
    "i3investor": {
      "status": "partial",
      "lastSuccess": "2026-10-23T03:40:16.171Z",
      "lastAttempt": "2026-10-23T09:33:35.693Z",
      "message": "78 prices refreshed; 34 could not be refreshed."
    },
    "shariah": {
      "status": "success",
      "lastSuccess": "2026-10-23T09:33:39.341Z",
      "lastAttempt": "2026-10-23T09:33:39.341Z",
      "message": "Sync completed."
    },
    "target-calculation": {
      "status": "success",
      "lastSuccess": "2026-10-23T09:33:39.438Z",
      "lastAttempt": "2026-10-23T09:33:39.438Z",
      "message": "Sync completed."
    },
    "group-archive": {
      "status": "success",
      "lastSuccess": "2026-10-23T09:33:39.784Z",
      "lastAttempt": "2026-10-23T09:33:39.784Z",
      "message": "Sync completed."
    },
    "ipo-pages": {
      "status": "success",
      "lastSuccess": "2026-10-23T09:33:39.698Z",
      "lastAttempt": "2026-10-23T09:33:39.698Z",
      "message": "Sync completed."
    },
    "balloting": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-23T09:33:35.782Z",
      "message": "No recent IPOs missing overall public OS."
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SYNC_STATUS;
}
