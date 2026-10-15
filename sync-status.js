const SYNC_STATUS = {
  "lastSync": "15/10/2026, 4:38:37 pm",
  "status": "Partial",
  "source": "ipo-pages",
  "totalIpos": 307,
  "sources": {
    "miti-portal": {
      "status": "failed",
      "lastSuccess": "2026-10-14T16:43:55.013Z",
      "lastAttempt": "2026-10-15T08:38:34.647Z",
      "message": "MITI public portal HTTP 403 (access denied from this runner); existing data retained."
    },
    "miti-applicants": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-15T08:38:36.999Z",
      "message": "MITI login page HTTP 403 (access denied from this runner); existing data retained."
    },
    "isaham-api": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-15T03:25:04.835Z",
      "message": "Not used by choice; IPO data comes from KLSE Screener, i3investor and MITI."
    },
    "klse": {
      "status": "success",
      "lastSuccess": "2026-10-15T03:25:05.671Z",
      "lastAttempt": "2026-10-15T03:25:05.671Z",
      "message": "Sync completed."
    },
    "i3investor": {
      "status": "partial",
      "lastSuccess": null,
      "lastAttempt": "2026-10-15T03:31:05.498Z",
      "message": "109 prices refreshed; 1 could not be refreshed."
    },
    "shariah": {
      "status": "success",
      "lastSuccess": "2026-10-15T03:31:09.160Z",
      "lastAttempt": "2026-10-15T03:31:09.160Z",
      "message": "Sync completed."
    },
    "target-calculation": {
      "status": "success",
      "lastSuccess": "2026-10-15T03:31:09.273Z",
      "lastAttempt": "2026-10-15T03:31:09.273Z",
      "message": "Sync completed."
    },
    "group-archive": {
      "status": "success",
      "lastSuccess": "2026-10-15T03:31:09.675Z",
      "lastAttempt": "2026-10-15T03:31:09.675Z",
      "message": "Sync completed."
    },
    "ipo-pages": {
      "status": "success",
      "lastSuccess": "2026-10-15T08:38:37.370Z",
      "lastAttempt": "2026-10-15T08:38:37.370Z",
      "message": "Sync completed."
    },
    "balloting": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-15T03:31:05.603Z",
      "message": "Overall public OS: 0 updated, 1 unavailable, 0 deferred."
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SYNC_STATUS;
}
