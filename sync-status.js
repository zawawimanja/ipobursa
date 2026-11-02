const SYNC_STATUS = {
  "lastSync": "02/11/2026, 7:44:15 pm",
  "status": "Partial",
  "source": "ipo-pages",
  "totalIpos": 314,
  "sources": {
    "miti-portal": {
      "status": "failed",
      "lastSuccess": "2026-10-31T16:00:07.794Z",
      "lastAttempt": "2026-11-02T11:44:15.164Z",
      "message": "MITI public portal HTTP 403 (access denied from this runner); existing data retained."
    },
    "miti-applicants": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-11-02T11:44:15.241Z",
      "message": "Puppeteer is not installed in CI; run scratch/sync-miti-applicants-login.js locally."
    },
    "isaham-api": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-11-02T04:40:24.380Z",
      "message": "Not used by choice; IPO data comes from KLSE Screener, i3investor and MITI."
    },
    "klse": {
      "status": "failed",
      "lastSuccess": "2026-10-30T00:45:07.442Z",
      "lastAttempt": "2026-11-02T04:40:25.066Z",
      "message": "Sync failed (exit 1)."
    },
    "i3investor": {
      "status": "success",
      "lastSuccess": "2026-11-02T04:46:38.862Z",
      "lastAttempt": "2026-11-02T04:46:38.862Z",
      "message": "114 prices refreshed; 0 could not be refreshed."
    },
    "shariah": {
      "status": "success",
      "lastSuccess": "2026-11-02T04:46:41.700Z",
      "lastAttempt": "2026-11-02T04:46:41.700Z",
      "message": "Sync completed."
    },
    "target-calculation": {
      "status": "success",
      "lastSuccess": "2026-11-02T04:46:41.798Z",
      "lastAttempt": "2026-11-02T04:46:41.798Z",
      "message": "Sync completed."
    },
    "group-archive": {
      "status": "success",
      "lastSuccess": "2026-11-02T04:46:49.921Z",
      "lastAttempt": "2026-11-02T04:46:49.921Z",
      "message": "Sync completed."
    },
    "ipo-pages": {
      "status": "success",
      "lastSuccess": "2026-11-02T11:44:15.463Z",
      "lastAttempt": "2026-11-02T11:44:15.463Z",
      "message": "Sync completed."
    },
    "balloting": {
      "status": "skipped",
      "lastSuccess": "2026-10-29T11:25:07.324Z",
      "lastAttempt": "2026-11-02T04:46:38.959Z",
      "message": "No recent IPOs missing overall public OS."
    },
    "ipo-news": {
      "status": "success",
      "lastSuccess": "2026-11-02T04:46:49.566Z",
      "lastAttempt": "2026-11-02T04:46:49.566Z",
      "message": "120 news items from 12 feed(s); 0 feed(s) failed."
    },
    "isaham-scrape": {
      "status": "failed",
      "lastSuccess": null,
      "lastAttempt": "2026-10-30T01:00:42.231Z",
      "message": "Data disimpan dengan cache lama atau sumber iSaham tidak lengkap."
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SYNC_STATUS;
}
