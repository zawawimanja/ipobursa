const SYNC_STATUS = {
  "lastSync": "03/11/2026, 11:00:23 am",
  "status": "Partial",
  "source": "ipo-news",
  "totalIpos": 314,
  "sources": {
    "miti-portal": {
      "status": "success",
      "lastSuccess": "2026-11-03T02:06:16.109Z",
      "lastAttempt": "2026-11-03T02:06:16.109Z",
      "message": "3 public MITI offers verified; 2 records updated."
    },
    "miti-applicants": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-11-02T13:46:13.894Z",
      "message": "Puppeteer is not installed in CI; run scratch/sync-miti-applicants-login.js locally."
    },
    "isaham-api": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-11-02T13:07:54.302Z",
      "message": "Not used by choice; IPO data comes from KLSE Screener, i3investor and MITI."
    },
    "klse": {
      "status": "failed",
      "lastSuccess": "2026-10-30T00:45:07.442Z",
      "lastAttempt": "2026-11-02T13:07:55.099Z",
      "message": "Sync failed (exit 1)."
    },
    "i3investor": {
      "status": "partial",
      "lastSuccess": "2026-11-02T04:46:38.862Z",
      "lastAttempt": "2026-11-02T13:46:12.695Z",
      "message": "71 prices refreshed; 46 could not be refreshed."
    },
    "shariah": {
      "status": "success",
      "lastSuccess": "2026-11-02T13:46:16.389Z",
      "lastAttempt": "2026-11-02T13:46:16.389Z",
      "message": "Sync completed."
    },
    "target-calculation": {
      "status": "success",
      "lastSuccess": "2026-11-02T13:46:16.508Z",
      "lastAttempt": "2026-11-02T13:46:16.508Z",
      "message": "Sync completed."
    },
    "group-archive": {
      "status": "success",
      "lastSuccess": "2026-11-02T13:46:25.324Z",
      "lastAttempt": "2026-11-02T13:46:25.324Z",
      "message": "Sync completed."
    },
    "ipo-pages": {
      "status": "success",
      "lastSuccess": "2026-11-02T13:46:25.229Z",
      "lastAttempt": "2026-11-02T13:46:25.229Z",
      "message": "Sync completed."
    },
    "balloting": {
      "status": "failed",
      "lastSuccess": "2026-10-29T11:25:07.324Z",
      "lastAttempt": "2026-11-02T13:46:12.789Z",
      "message": "Overall public OS: 0 updated, 2 unavailable, 0 deferred."
    },
    "ipo-news": {
      "status": "success",
      "lastSuccess": "2026-11-03T03:00:23.649Z",
      "lastAttempt": "2026-11-03T03:00:23.649Z",
      "message": "120 news items from 13 feed(s); 0 feed(s) failed."
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
