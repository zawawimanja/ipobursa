const SYNC_STATUS = {
  "lastSync": "22/10/2026, 11:21:44 am",
  "status": "Partial",
  "source": "ipo-pages",
  "totalIpos": 307,
  "sources": {
    "miti-portal": {
      "status": "success",
      "lastSuccess": "2026-10-22T03:21:43.723Z",
      "lastAttempt": "2026-10-22T03:21:43.723Z",
      "message": "2 public MITI offers verified; 0 records updated."
    },
    "miti-applicants": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-20T03:43:40.946Z",
      "message": "MITI login page HTTP 403 (access denied from this runner); existing data retained."
    },
    "isaham-api": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-22T03:03:28.224Z",
      "message": "Not used by choice; IPO data comes from KLSE Screener, i3investor and MITI."
    },
    "klse": {
      "status": "success",
      "lastSuccess": "2026-10-22T03:03:30.541Z",
      "lastAttempt": "2026-10-22T03:03:30.541Z",
      "message": "Sync completed."
    },
    "i3investor": {
      "status": "partial",
      "lastSuccess": null,
      "lastAttempt": "2026-10-22T03:21:41.191Z",
      "message": "92 prices refreshed; 22 could not be refreshed."
    },
    "shariah": {
      "status": "success",
      "lastSuccess": "2026-10-20T03:43:43.598Z",
      "lastAttempt": "2026-10-20T03:43:43.598Z",
      "message": "Sync completed."
    },
    "target-calculation": {
      "status": "success",
      "lastSuccess": "2026-10-22T03:21:44.038Z",
      "lastAttempt": "2026-10-22T03:21:44.038Z",
      "message": "Sync completed."
    },
    "group-archive": {
      "status": "success",
      "lastSuccess": "2026-10-20T03:43:44.137Z",
      "lastAttempt": "2026-10-20T03:43:44.137Z",
      "message": "Sync completed."
    },
    "ipo-pages": {
      "status": "success",
      "lastSuccess": "2026-10-22T03:21:44.500Z",
      "lastAttempt": "2026-10-22T03:21:44.500Z",
      "message": "Sync completed."
    },
    "balloting": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-22T03:21:41.518Z",
      "message": "Overall public OS: 0 updated, 1 unavailable, 0 deferred."
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SYNC_STATUS;
}
