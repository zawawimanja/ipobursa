const SYNC_STATUS = {
  "lastSync": "14/10/2026, 5:28:43 pm",
  "status": "Partial",
  "source": "group-archive",
  "totalIpos": 307,
  "sources": {
    "miti-portal": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-14T09:28:38.002Z",
      "message": "Sync failed (exit 1)."
    },
    "miti-applicants": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-14T09:28:40.034Z",
      "message": "Sync failed (exit 1)."
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
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SYNC_STATUS;
}
