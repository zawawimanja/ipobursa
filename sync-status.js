const SYNC_STATUS = {
  "lastSync": "03/10/2026, 10:28:00 pm",
  "status": "Failed",
  "source": "isaham-api",
  "totalIpos": 307,
  "sources": {
    "miti-portal": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-14T02:20:49.659Z",
      "message": "Sync failed (exit 1)."
    },
    "miti-applicants": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-14T02:20:52.080Z",
      "message": "Sync failed (exit 1)."
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SYNC_STATUS;
}
