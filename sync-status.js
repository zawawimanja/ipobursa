const SYNC_STATUS = {
  "lastSync": "15/10/2026, 10:01:51 am",
  "status": "Partial",
  "source": "ipo-pages",
  "totalIpos": 307,
  "sources": {
    "miti-portal": {
      "status": "failed",
      "lastSuccess": "2026-10-14T16:43:55.013Z",
      "lastAttempt": "2026-10-15T02:01:49.525Z",
      "message": "MITI public portal HTTP 403 (access denied from this runner); existing data retained."
    },
    "miti-applicants": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-15T02:01:51.090Z",
      "message": "MITI login page HTTP 403 (access denied from this runner); existing data retained."
    },
    "isaham-api": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-14T09:19:00.002Z",
      "message": "API token is not configured."
    },
    "klse": {
      "status": "success",
      "lastSuccess": "2026-10-14T09:19:01.585Z",
      "lastAttempt": "2026-10-14T09:19:01.585Z",
      "message": "Sync completed."
    },
    "i3investor": {
      "status": "partial",
      "lastSuccess": null,
      "lastAttempt": "2026-10-14T09:28:37.456Z",
      "message": "110 prices refreshed; 3 could not be refreshed."
    },
    "shariah": {
      "status": "success",
      "lastSuccess": "2026-10-14T09:28:42.940Z",
      "lastAttempt": "2026-10-14T09:28:42.940Z",
      "message": "Sync completed."
    },
    "target-calculation": {
      "status": "success",
      "lastSuccess": "2026-10-14T09:28:43.055Z",
      "lastAttempt": "2026-10-14T09:28:43.055Z",
      "message": "Sync completed."
    },
    "group-archive": {
      "status": "success",
      "lastSuccess": "2026-10-14T09:28:43.159Z",
      "lastAttempt": "2026-10-14T09:28:43.159Z",
      "message": "Sync completed."
    },
    "ipo-pages": {
      "status": "success",
      "lastSuccess": "2026-10-15T02:01:51.365Z",
      "lastAttempt": "2026-10-15T02:01:51.365Z",
      "message": "Sync completed."
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SYNC_STATUS;
}
