const SYNC_STATUS = {
  "lastSync": "22/10/2026, 10:51:07 am",
  "status": "Partial",
  "source": "miti-portal",
  "totalIpos": 307,
  "sources": {
    "miti-portal": {
      "status": "success",
      "lastSuccess": "2026-10-22T02:51:07.872Z",
      "lastAttempt": "2026-10-22T02:51:07.872Z",
      "message": "2 public MITI offers verified; 2 records updated."
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
      "lastAttempt": "2026-10-20T03:36:52.243Z",
      "message": "Not used by choice; IPO data comes from KLSE Screener, i3investor and MITI."
    },
    "klse": {
      "status": "success",
      "lastSuccess": "2026-10-20T03:36:53.315Z",
      "lastAttempt": "2026-10-20T03:36:53.315Z",
      "message": "Sync completed."
    },
    "i3investor": {
      "status": "partial",
      "lastSuccess": null,
      "lastAttempt": "2026-10-20T03:43:36.576Z",
      "message": "110 prices refreshed; 2 could not be refreshed."
    },
    "shariah": {
      "status": "success",
      "lastSuccess": "2026-10-20T03:43:43.598Z",
      "lastAttempt": "2026-10-20T03:43:43.598Z",
      "message": "Sync completed."
    },
    "target-calculation": {
      "status": "success",
      "lastSuccess": "2026-10-20T03:43:43.718Z",
      "lastAttempt": "2026-10-20T03:43:43.718Z",
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
      "lastSuccess": "2026-10-20T03:43:44.027Z",
      "lastAttempt": "2026-10-20T03:43:44.027Z",
      "message": "Sync completed."
    },
    "balloting": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-20T03:43:36.690Z",
      "message": "Overall public OS: 0 updated, 1 unavailable, 0 deferred."
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SYNC_STATUS;
}
