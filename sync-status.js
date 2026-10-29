const SYNC_STATUS = {
  "lastSync": "29/10/2026, 10:00:02 pm",
  "status": "Success",
  "source": "miti-portal",
  "totalIpos": 307,
  "sources": {
    "miti-portal": {
      "status": "success",
      "lastSuccess": "2026-10-29T14:00:02.196Z",
      "lastAttempt": "2026-10-29T14:00:02.196Z",
      "message": "2 public MITI offers verified; 0 records updated."
    },
    "miti-applicants": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-29T14:00:01.043Z",
      "message": "MITI credentials are not configured; authenticated offer details were not checked."
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
      "lastSuccess": "2026-10-29T11:25:18.081Z",
      "lastAttempt": "2026-10-29T11:25:18.081Z",
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
