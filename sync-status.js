const SYNC_STATUS = {
  "lastSync": "16/10/2026, 4:54:53 pm",
  "status": "Partial",
  "source": "group-archive",
  "totalIpos": 307,
  "sources": {
    "miti-portal": {
      "status": "failed",
      "lastSuccess": "2026-10-14T16:43:55.013Z",
      "lastAttempt": "2026-10-16T08:54:51.031Z",
      "message": "MITI public portal HTTP 403 (access denied from this runner); existing data retained."
    },
    "miti-applicants": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-16T08:54:51.866Z",
      "message": "MITI login page HTTP 403 (access denied from this runner); existing data retained."
    },
    "isaham-api": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-16T08:46:36.653Z",
      "message": "Not used by choice; IPO data comes from KLSE Screener, i3investor and MITI."
    },
    "klse": {
      "status": "success",
      "lastSuccess": "2026-10-16T08:46:37.719Z",
      "lastAttempt": "2026-10-16T08:46:37.719Z",
      "message": "Sync completed."
    },
    "i3investor": {
      "status": "partial",
      "lastSuccess": null,
      "lastAttempt": "2026-10-16T08:54:46.972Z",
      "message": "105 prices refreshed; 2 could not be refreshed."
    },
    "shariah": {
      "status": "success",
      "lastSuccess": "2026-10-16T08:54:53.209Z",
      "lastAttempt": "2026-10-16T08:54:53.209Z",
      "message": "Sync completed."
    },
    "target-calculation": {
      "status": "success",
      "lastSuccess": "2026-10-16T08:54:53.308Z",
      "lastAttempt": "2026-10-16T08:54:53.308Z",
      "message": "Sync completed."
    },
    "group-archive": {
      "status": "success",
      "lastSuccess": "2026-10-16T08:54:53.653Z",
      "lastAttempt": "2026-10-16T08:54:53.653Z",
      "message": "Sync completed."
    },
    "ipo-pages": {
      "status": "success",
      "lastSuccess": "2026-10-16T08:54:53.566Z",
      "lastAttempt": "2026-10-16T08:54:53.566Z",
      "message": "Sync completed."
    },
    "balloting": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-16T08:54:47.060Z",
      "message": "Overall public OS: 0 updated, 1 unavailable, 0 deferred."
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SYNC_STATUS;
}
