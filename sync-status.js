const SYNC_STATUS = {
  "lastSync": "30/10/2026, 12:42:11 pm",
  "status": "Partial",
  "source": "group-archive",
  "totalIpos": 307,
  "sources": {
    "miti-portal": {
      "status": "failed",
      "lastSuccess": "2026-10-29T16:00:11.058Z",
      "lastAttempt": "2026-10-30T04:42:01.111Z",
      "message": "MITI public portal HTTP 403 (access denied from this runner); existing data retained."
    },
    "miti-applicants": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-30T04:42:01.176Z",
      "message": "Puppeteer is not installed in CI; run scratch/sync-miti-applicants-login.js locally."
    },
    "isaham-api": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-30T04:35:20.525Z",
      "message": "Not used by choice; IPO data comes from KLSE Screener, i3investor and MITI."
    },
    "klse": {
      "status": "success",
      "lastSuccess": "2026-10-30T04:35:21.586Z",
      "lastAttempt": "2026-10-30T04:35:21.586Z",
      "message": "Sync completed."
    },
    "i3investor": {
      "status": "success",
      "lastSuccess": "2026-10-30T04:42:00.615Z",
      "lastAttempt": "2026-10-30T04:42:00.615Z",
      "message": "118 prices refreshed; 0 could not be refreshed."
    },
    "shariah": {
      "status": "success",
      "lastSuccess": "2026-10-30T04:42:03.434Z",
      "lastAttempt": "2026-10-30T04:42:03.434Z",
      "message": "Sync completed."
    },
    "target-calculation": {
      "status": "success",
      "lastSuccess": "2026-10-30T04:42:03.514Z",
      "lastAttempt": "2026-10-30T04:42:03.514Z",
      "message": "Sync completed."
    },
    "group-archive": {
      "status": "success",
      "lastSuccess": "2026-10-30T04:42:11.966Z",
      "lastAttempt": "2026-10-30T04:42:11.966Z",
      "message": "Sync completed."
    },
    "ipo-pages": {
      "status": "success",
      "lastSuccess": "2026-10-30T04:42:11.895Z",
      "lastAttempt": "2026-10-30T04:42:11.895Z",
      "message": "Sync completed."
    },
    "balloting": {
      "status": "skipped",
      "lastSuccess": "2026-10-29T11:25:07.324Z",
      "lastAttempt": "2026-10-30T04:42:00.699Z",
      "message": "No recent IPOs missing overall public OS."
    },
    "ipo-news": {
      "status": "partial",
      "lastSuccess": "2026-10-29T11:25:17.808Z",
      "lastAttempt": "2026-10-30T04:42:11.637Z",
      "message": "120 news items from 10 feed(s); 2 feed(s) failed."
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SYNC_STATUS;
}
