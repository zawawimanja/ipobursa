const SYNC_STATUS = {
  "lastSync": "30/10/2026, 7:17:31 pm",
  "status": "Partial",
  "source": "group-archive",
  "totalIpos": 307,
  "sources": {
    "miti-portal": {
      "status": "failed",
      "lastSuccess": "2026-10-29T16:00:11.058Z",
      "lastAttempt": "2026-10-30T11:17:20.769Z",
      "message": "MITI public portal HTTP 403 (access denied from this runner); existing data retained."
    },
    "miti-applicants": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-30T11:17:20.850Z",
      "message": "Puppeteer is not installed in CI; run scratch/sync-miti-applicants-login.js locally."
    },
    "isaham-api": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-30T11:11:19.870Z",
      "message": "Not used by choice; IPO data comes from KLSE Screener, i3investor and MITI."
    },
    "klse": {
      "status": "failed",
      "lastSuccess": "2026-10-30T04:35:21.586Z",
      "lastAttempt": "2026-10-30T11:11:20.909Z",
      "message": "Sync failed (exit 1)."
    },
    "i3investor": {
      "status": "success",
      "lastSuccess": "2026-10-30T11:17:18.412Z",
      "lastAttempt": "2026-10-30T11:17:18.412Z",
      "message": "114 prices refreshed; 0 could not be refreshed."
    },
    "shariah": {
      "status": "success",
      "lastSuccess": "2026-10-30T11:17:23.247Z",
      "lastAttempt": "2026-10-30T11:17:23.247Z",
      "message": "Sync completed."
    },
    "target-calculation": {
      "status": "success",
      "lastSuccess": "2026-10-30T11:17:23.356Z",
      "lastAttempt": "2026-10-30T11:17:23.356Z",
      "message": "Sync completed."
    },
    "group-archive": {
      "status": "success",
      "lastSuccess": "2026-10-30T11:17:31.582Z",
      "lastAttempt": "2026-10-30T11:17:31.582Z",
      "message": "Sync completed."
    },
    "ipo-pages": {
      "status": "success",
      "lastSuccess": "2026-10-30T11:17:31.489Z",
      "lastAttempt": "2026-10-30T11:17:31.489Z",
      "message": "Sync completed."
    },
    "balloting": {
      "status": "skipped",
      "lastSuccess": "2026-10-29T11:25:07.324Z",
      "lastAttempt": "2026-10-30T11:17:18.523Z",
      "message": "No recent IPOs missing overall public OS."
    },
    "ipo-news": {
      "status": "partial",
      "lastSuccess": "2026-10-29T11:25:17.808Z",
      "lastAttempt": "2026-10-30T11:17:31.188Z",
      "message": "120 news items from 10 feed(s); 2 feed(s) failed."
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SYNC_STATUS;
}
