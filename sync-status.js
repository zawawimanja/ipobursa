const SYNC_STATUS = {
  "lastSync": "15/10/2026, 5:01:37 pm",
  "status": "Partial",
  "source": "group-archive",
  "totalIpos": 307,
  "sources": {
    "miti-portal": {
      "status": "failed",
      "lastSuccess": "2026-10-14T16:43:55.013Z",
      "lastAttempt": "2026-10-15T09:01:33.311Z",
      "message": "MITI public portal HTTP 403 (access denied from this runner); existing data retained."
    },
    "miti-applicants": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-15T09:01:34.217Z",
      "message": "MITI login page HTTP 403 (access denied from this runner); existing data retained."
    },
    "isaham-api": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-15T08:54:26.224Z",
      "message": "Not used by choice; IPO data comes from KLSE Screener, i3investor and MITI."
    },
    "klse": {
      "status": "success",
      "lastSuccess": "2026-10-15T08:54:27.088Z",
      "lastAttempt": "2026-10-15T08:54:27.088Z",
      "message": "Sync completed."
    },
    "i3investor": {
      "status": "partial",
      "lastSuccess": null,
      "lastAttempt": "2026-10-15T09:01:29.631Z",
      "message": "106 prices refreshed; 1 could not be refreshed."
    },
    "shariah": {
      "status": "success",
      "lastSuccess": "2026-10-15T09:01:37.270Z",
      "lastAttempt": "2026-10-15T09:01:37.270Z",
      "message": "Sync completed."
    },
    "target-calculation": {
      "status": "success",
      "lastSuccess": "2026-10-15T09:01:37.388Z",
      "lastAttempt": "2026-10-15T09:01:37.388Z",
      "message": "Sync completed."
    },
    "group-archive": {
      "status": "success",
      "lastSuccess": "2026-10-15T09:01:37.796Z",
      "lastAttempt": "2026-10-15T09:01:37.796Z",
      "message": "Sync completed."
    },
    "ipo-pages": {
      "status": "success",
      "lastSuccess": "2026-10-15T09:01:37.683Z",
      "lastAttempt": "2026-10-15T09:01:37.683Z",
      "message": "Sync completed."
    },
    "balloting": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-15T09:01:29.748Z",
      "message": "Overall public OS: 0 updated, 1 unavailable, 0 deferred."
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SYNC_STATUS;
}
