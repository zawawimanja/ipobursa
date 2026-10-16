const SYNC_STATUS = {
  "lastSync": "16/10/2026, 2:29:46 pm",
  "status": "Partial",
  "source": "ipo-pages",
  "totalIpos": 307,
  "sources": {
    "miti-portal": {
      "status": "failed",
      "lastSuccess": "2026-10-14T16:43:55.013Z",
      "lastAttempt": "2026-10-16T06:29:44.776Z",
      "message": "MITI public portal HTTP 403 (access denied from this runner); existing data retained."
    },
    "miti-applicants": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-16T06:29:45.776Z",
      "message": "MITI login page HTTP 403 (access denied from this runner); existing data retained."
    },
    "isaham-api": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-16T03:20:35.536Z",
      "message": "Not used by choice; IPO data comes from KLSE Screener, i3investor and MITI."
    },
    "klse": {
      "status": "success",
      "lastSuccess": "2026-10-16T03:20:36.470Z",
      "lastAttempt": "2026-10-16T03:20:36.470Z",
      "message": "Sync completed."
    },
    "i3investor": {
      "status": "partial",
      "lastSuccess": null,
      "lastAttempt": "2026-10-16T03:27:50.946Z",
      "message": "108 prices refreshed; 2 could not be refreshed."
    },
    "shariah": {
      "status": "success",
      "lastSuccess": "2026-10-16T03:27:58.157Z",
      "lastAttempt": "2026-10-16T03:27:58.157Z",
      "message": "Sync completed."
    },
    "target-calculation": {
      "status": "success",
      "lastSuccess": "2026-10-16T03:27:58.269Z",
      "lastAttempt": "2026-10-16T03:27:58.269Z",
      "message": "Sync completed."
    },
    "group-archive": {
      "status": "success",
      "lastSuccess": "2026-10-16T03:27:58.682Z",
      "lastAttempt": "2026-10-16T03:27:58.682Z",
      "message": "Sync completed."
    },
    "ipo-pages": {
      "status": "success",
      "lastSuccess": "2026-10-16T06:29:46.199Z",
      "lastAttempt": "2026-10-16T06:29:46.199Z",
      "message": "Sync completed."
    },
    "balloting": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-16T03:27:51.054Z",
      "message": "Overall public OS: 0 updated, 1 unavailable, 0 deferred."
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SYNC_STATUS;
}
