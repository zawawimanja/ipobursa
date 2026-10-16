const SYNC_STATUS = {
  "lastSync": "16/10/2026, 9:51:50 am",
  "status": "Partial",
  "source": "ipo-pages",
  "totalIpos": 307,
  "sources": {
    "miti-portal": {
      "status": "failed",
      "lastSuccess": "2026-10-14T16:43:55.013Z",
      "lastAttempt": "2026-10-16T01:51:48.631Z",
      "message": "MITI public portal HTTP 403 (access denied from this runner); existing data retained."
    },
    "miti-applicants": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-16T01:51:49.519Z",
      "message": "MITI login page HTTP 403 (access denied from this runner); existing data retained."
    },
    "isaham-api": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-15T13:59:01.180Z",
      "message": "Not used by choice; IPO data comes from KLSE Screener, i3investor and MITI."
    },
    "klse": {
      "status": "success",
      "lastSuccess": "2026-10-15T13:59:02.115Z",
      "lastAttempt": "2026-10-15T13:59:02.115Z",
      "message": "Sync completed."
    },
    "i3investor": {
      "status": "partial",
      "lastSuccess": null,
      "lastAttempt": "2026-10-15T14:37:03.253Z",
      "message": "64 prices refreshed; 54 could not be refreshed."
    },
    "shariah": {
      "status": "success",
      "lastSuccess": "2026-10-15T14:37:09.350Z",
      "lastAttempt": "2026-10-15T14:37:09.350Z",
      "message": "Sync completed."
    },
    "target-calculation": {
      "status": "success",
      "lastSuccess": "2026-10-15T14:37:09.469Z",
      "lastAttempt": "2026-10-15T14:37:09.469Z",
      "message": "Sync completed."
    },
    "group-archive": {
      "status": "success",
      "lastSuccess": "2026-10-15T14:37:09.887Z",
      "lastAttempt": "2026-10-15T14:37:09.887Z",
      "message": "Sync completed."
    },
    "ipo-pages": {
      "status": "success",
      "lastSuccess": "2026-10-16T01:51:50.667Z",
      "lastAttempt": "2026-10-16T01:51:50.667Z",
      "message": "Sync completed."
    },
    "balloting": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-15T14:37:03.362Z",
      "message": "Overall public OS: 0 updated, 1 unavailable, 0 deferred."
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SYNC_STATUS;
}
