const SYNC_STATUS = {
  "lastSync": "29/10/2026, 1:00:03 am",
  "status": "Success",
  "source": "miti-portal",
  "totalIpos": 307,
  "sources": {
    "miti-portal": {
      "status": "success",
      "lastSuccess": "2026-10-28T17:00:03.950Z",
      "lastAttempt": "2026-10-28T17:00:03.950Z",
      "message": "1 public MITI offers verified; 1 records updated."
    },
    "miti-applicants": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-28T17:00:03.473Z",
      "message": "MITI credentials are not configured; authenticated offer details were not checked."
    },
    "isaham-api": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-28T10:59:26.967Z",
      "message": "Not used by choice; IPO data comes from KLSE Screener, i3investor and MITI."
    },
    "klse": {
      "status": "success",
      "lastSuccess": "2026-10-28T10:59:27.831Z",
      "lastAttempt": "2026-10-28T10:59:27.831Z",
      "message": "Sync completed."
    },
    "i3investor": {
      "status": "success",
      "lastSuccess": "2026-10-28T11:07:44.314Z",
      "lastAttempt": "2026-10-28T11:07:44.314Z",
      "message": "107 prices refreshed; 0 could not be refreshed."
    },
    "shariah": {
      "status": "success",
      "lastSuccess": "2026-10-28T11:07:45.923Z",
      "lastAttempt": "2026-10-28T11:07:45.923Z",
      "message": "Sync completed."
    },
    "target-calculation": {
      "status": "success",
      "lastSuccess": "2026-10-28T11:07:46.035Z",
      "lastAttempt": "2026-10-28T11:07:46.035Z",
      "message": "Sync completed."
    },
    "group-archive": {
      "status": "success",
      "lastSuccess": "2026-10-28T11:07:46.440Z",
      "lastAttempt": "2026-10-28T11:07:46.440Z",
      "message": "Sync completed."
    },
    "ipo-pages": {
      "status": "success",
      "lastSuccess": "2026-10-28T11:07:46.340Z",
      "lastAttempt": "2026-10-28T11:07:46.340Z",
      "message": "Sync completed."
    },
    "balloting": {
      "status": "skipped",
      "lastSuccess": null,
      "lastAttempt": "2026-10-28T11:07:44.426Z",
      "message": "No recent IPOs missing overall public OS."
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SYNC_STATUS;
}
