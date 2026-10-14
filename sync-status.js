const SYNC_STATUS = {
  "lastSync": "14/10/2026, 11:50:41 am",
  "status": "Partial",
  "source": "group-archive",
  "totalIpos": 307,
  "sources": {
    "miti-portal": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-14T03:50:36.111Z",
      "message": "Sync failed (exit 1)."
    },
    "miti-applicants": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-14T03:50:38.134Z",
      "message": "Sync failed (exit 1)."
    },
    "isaham-api": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-14T03:43:42.174Z",
      "message": "API token is not configured."
    },
    "klse": {
      "status": "success",
      "lastSuccess": "2026-10-14T03:43:43.340Z",
      "lastAttempt": "2026-10-14T03:43:43.340Z",
      "message": "Sync completed."
    },
    "i3investor": {
      "status": "partial",
      "lastSuccess": null,
      "lastAttempt": "2026-10-14T03:50:35.558Z",
      "message": "112 prices refreshed; 1 could not be refreshed."
    },
    "shariah": {
      "status": "success",
      "lastSuccess": "2026-10-14T03:50:41.110Z",
      "lastAttempt": "2026-10-14T03:50:41.110Z",
      "message": "Sync completed."
    },
    "target-calculation": {
      "status": "success",
      "lastSuccess": "2026-10-14T03:50:41.225Z",
      "lastAttempt": "2026-10-14T03:50:41.225Z",
      "message": "Sync completed."
    },
    "group-archive": {
      "status": "success",
      "lastSuccess": "2026-10-14T03:50:41.321Z",
      "lastAttempt": "2026-10-14T03:50:41.321Z",
      "message": "Sync completed."
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SYNC_STATUS;
}
