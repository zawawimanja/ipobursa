const SYNC_STATUS = {
  "lastSync": "19/10/2026, 10:01:16 am",
  "status": "Partial",
  "source": "ipo-pages",
  "totalIpos": 307,
  "sources": {
    "miti-portal": {
      "status": "failed",
      "lastSuccess": "2026-10-14T16:43:55.013Z",
      "lastAttempt": "2026-10-19T02:01:15.729Z",
      "message": "MITI public portal HTTP 403 (access denied from this runner); existing data retained."
    },
    "miti-applicants": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-19T02:01:16.382Z",
      "message": "MITI login page HTTP 403 (access denied from this runner); existing data retained."
    },
    "isaham-api": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-16T13:45:38.292Z",
      "message": "Not used by choice; IPO data comes from KLSE Screener, i3investor and MITI."
    },
    "klse": {
      "status": "success",
      "lastSuccess": "2026-10-16T13:45:39.222Z",
      "lastAttempt": "2026-10-16T13:45:39.222Z",
      "message": "Sync completed."
    },
    "i3investor": {
      "status": "partial",
      "lastSuccess": null,
      "lastAttempt": "2026-10-16T14:10:27.641Z",
      "message": "104 prices refreshed; 13 could not be refreshed."
    },
    "shariah": {
      "status": "success",
      "lastSuccess": "2026-10-16T14:10:32.563Z",
      "lastAttempt": "2026-10-16T14:10:32.563Z",
      "message": "Sync completed."
    },
    "target-calculation": {
      "status": "success",
      "lastSuccess": "2026-10-16T14:10:32.688Z",
      "lastAttempt": "2026-10-16T14:10:32.688Z",
      "message": "Sync completed."
    },
    "group-archive": {
      "status": "success",
      "lastSuccess": "2026-10-16T14:10:33.137Z",
      "lastAttempt": "2026-10-16T14:10:33.137Z",
      "message": "Sync completed."
    },
    "ipo-pages": {
      "status": "success",
      "lastSuccess": "2026-10-19T02:01:16.641Z",
      "lastAttempt": "2026-10-19T02:01:16.641Z",
      "message": "Sync completed."
    },
    "balloting": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-16T14:10:27.756Z",
      "message": "Overall public OS: 0 updated, 1 unavailable, 0 deferred."
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SYNC_STATUS;
}
