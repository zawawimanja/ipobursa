const SYNC_STATUS = {
  "lastSync": "20/10/2026, 10:18:33 am",
  "status": "Partial",
  "source": "ipo-pages",
  "totalIpos": 307,
  "sources": {
    "miti-portal": {
      "status": "failed",
      "lastSuccess": "2026-10-14T16:43:55.013Z",
      "lastAttempt": "2026-10-20T02:18:32.392Z",
      "message": "MITI public portal HTTP 403 (access denied from this runner); existing data retained."
    },
    "miti-applicants": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-20T02:18:33.218Z",
      "message": "MITI login page HTTP 403 (access denied from this runner); existing data retained."
    },
    "isaham-api": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-19T09:37:30.907Z",
      "message": "Not used by choice; IPO data comes from KLSE Screener, i3investor and MITI."
    },
    "klse": {
      "status": "success",
      "lastSuccess": "2026-10-19T09:37:31.676Z",
      "lastAttempt": "2026-10-19T09:37:31.676Z",
      "message": "Sync completed."
    },
    "i3investor": {
      "status": "partial",
      "lastSuccess": null,
      "lastAttempt": "2026-10-19T09:53:07.935Z",
      "message": "90 prices refreshed; 18 could not be refreshed."
    },
    "shariah": {
      "status": "success",
      "lastSuccess": "2026-10-19T09:53:11.085Z",
      "lastAttempt": "2026-10-19T09:53:11.085Z",
      "message": "Sync completed."
    },
    "target-calculation": {
      "status": "success",
      "lastSuccess": "2026-10-19T09:53:11.197Z",
      "lastAttempt": "2026-10-19T09:53:11.197Z",
      "message": "Sync completed."
    },
    "group-archive": {
      "status": "success",
      "lastSuccess": "2026-10-19T09:53:11.611Z",
      "lastAttempt": "2026-10-19T09:53:11.611Z",
      "message": "Sync completed."
    },
    "ipo-pages": {
      "status": "success",
      "lastSuccess": "2026-10-20T02:18:33.611Z",
      "lastAttempt": "2026-10-20T02:18:33.611Z",
      "message": "Sync completed."
    },
    "balloting": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-19T09:53:08.035Z",
      "message": "Overall public OS: 0 updated, 1 unavailable, 0 deferred."
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SYNC_STATUS;
}
