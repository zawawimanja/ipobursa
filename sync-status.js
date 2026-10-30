const SYNC_STATUS = {
  "lastSync": "30/10/2026, 11:08:52 am",
  "status": "Partial",
  "source": "ipo-pages",
  "totalIpos": 307,
  "sources": {
    "miti-portal": {
      "status": "failed",
      "lastSuccess": "2026-10-29T16:00:11.058Z",
      "lastAttempt": "2026-10-30T03:08:52.525Z",
      "message": "MITI public portal HTTP 403 (access denied from this runner); existing data retained."
    },
    "miti-applicants": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-30T03:08:52.589Z",
      "message": "Puppeteer is not installed in CI; run scratch/sync-miti-applicants-login.js locally."
    },
    "isaham-api": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-29T11:18:49.324Z",
      "message": "Not used by choice; IPO data comes from KLSE Screener, i3investor and MITI."
    },
    "klse": {
      "status": "success",
      "lastSuccess": "2026-10-29T11:18:50.467Z",
      "lastAttempt": "2026-10-29T11:18:50.467Z",
      "message": "Sync completed."
    },
    "i3investor": {
      "status": "success",
      "lastSuccess": "2026-10-29T11:25:07.224Z",
      "lastAttempt": "2026-10-29T11:25:07.224Z",
      "message": "111 prices refreshed; 0 could not be refreshed."
    },
    "shariah": {
      "status": "success",
      "lastSuccess": "2026-10-29T11:25:09.502Z",
      "lastAttempt": "2026-10-29T11:25:09.502Z",
      "message": "Sync completed."
    },
    "target-calculation": {
      "status": "success",
      "lastSuccess": "2026-10-29T11:25:09.595Z",
      "lastAttempt": "2026-10-29T11:25:09.595Z",
      "message": "Sync completed."
    },
    "group-archive": {
      "status": "success",
      "lastSuccess": "2026-10-29T11:25:18.168Z",
      "lastAttempt": "2026-10-29T11:25:18.168Z",
      "message": "Sync completed."
    },
    "ipo-pages": {
      "status": "success",
      "lastSuccess": "2026-10-30T03:08:52.752Z",
      "lastAttempt": "2026-10-30T03:08:52.752Z",
      "message": "Sync completed."
    },
    "balloting": {
      "status": "success",
      "lastSuccess": "2026-10-29T11:25:07.324Z",
      "lastAttempt": "2026-10-29T11:25:07.324Z",
      "message": "Overall public OS: 1 updated, 0 unavailable, 0 deferred."
    },
    "ipo-news": {
      "status": "success",
      "lastSuccess": "2026-10-29T11:25:17.808Z",
      "lastAttempt": "2026-10-29T11:25:17.808Z",
      "message": "120 news items from 12 feed(s); 0 feed(s) failed."
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SYNC_STATUS;
}
