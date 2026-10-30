const SYNC_STATUS = {
  "lastSync": "30/10/2026, 9:00:06 am",
  "status": "Partial",
  "source": "miti-portal",
  "totalIpos": 314,
  "sources": {
    "miti-portal": {
      "status": "success",
      "lastSuccess": "2026-10-30T01:00:06.904Z",
      "lastAttempt": "2026-10-30T01:00:06.904Z",
      "message": "2 public MITI offers verified; 0 records updated."
    },
    "miti-applicants": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-30T01:00:06.426Z",
      "message": "MITI credentials are not configured; authenticated offer details were not checked."
    },
    "isaham-api": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-30T00:45:05.923Z",
      "message": "Not used by choice; IPO data comes from KLSE Screener, i3investor and MITI."
    },
    "klse": {
      "status": "success",
      "lastSuccess": "2026-10-30T00:45:07.442Z",
      "lastAttempt": "2026-10-30T00:45:07.442Z",
      "message": "Sync completed."
    },
    "i3investor": {
      "status": "success",
      "lastSuccess": "2026-10-30T00:50:18.629Z",
      "lastAttempt": "2026-10-30T00:50:18.629Z",
      "message": "112 prices refreshed; 0 could not be refreshed."
    },
    "shariah": {
      "status": "success",
      "lastSuccess": "2026-10-30T11:17:23.247Z",
      "lastAttempt": "2026-10-30T11:17:23.247Z",
      "message": "Sync completed."
    },
    "target-calculation": {
      "status": "success",
      "lastSuccess": "2026-10-30T00:50:19.573Z",
      "lastAttempt": "2026-10-30T00:50:19.573Z",
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
      "lastSuccess": "2026-10-30T00:50:19.977Z",
      "lastAttempt": "2026-10-30T00:50:19.977Z",
      "message": "Sync completed."
    },
    "balloting": {
      "status": "skipped",
      "lastSuccess": "2026-10-29T11:25:07.324Z",
      "lastAttempt": "2026-10-30T00:50:18.812Z",
      "message": "No recent IPOs missing overall public OS."
    },
    "ipo-news": {
      "status": "partial",
      "lastSuccess": "2026-10-29T11:25:17.808Z",
      "lastAttempt": "2026-10-29T11:25:17.808Z",
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
