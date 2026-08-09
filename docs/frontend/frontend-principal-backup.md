# Frontend — Backups & Data Export

**Status: DONE** (screen feature) / **PARTIAL** (needs the school's live Google Drive)

This page keeps the school's data safe. It connects Zentra to Google Drive so
a copy of the data is saved automatically, and it lets the school export a
readable copy of the data.

## What it does

- **Google Drive connection.** Use the **Connect Google Drive** button to sign
  in with a Google account. When connected, the page shows which account, and
  automatic backups are switched on. Backups go to a private "Zentra Backups"
  folder in that Drive.
- **Back up now.** A button to make a manual backup right away (it shows
  "Backing up…" while it runs).
- **Backup History.** A table of past backups — when they ran, whether they
  were automatic or manual, the status (Success / Failed / Running), and the
  size of the file.
- **Readable Export.** A button that makes a readable copy of the school data
  as one **Excel workbook** (a sheet per table) plus one **PDF per table**,
  saved to a folder in Google Drive. The export history shows when it ran, the
  status, how many files, and an **Open in Drive** link.
- **Clear messages.** Success and error toasts tell you what just happened, and
  each backup/export row shows its outcome.
- **Handles being turned off.** If backups are disabled on the server, the page
  explains that instead of looking broken.

## What's working today

- [x] Connect Google Drive
- [x] Automatic backups enabled once connected
- [x] "Back up now" with a working spinner
- [x] Backup history table with status and size
- [x] Readable export (Excel + PDF) with history and Open in Drive links
- [x] Success / error toast messages
- [x] A clear "disabled" screen when backups are turned off

## Notes

- To use this for real, the school's live Google Drive (OAuth) connection and
  a storage account must be configured. Until then the screen is complete and
  the logic behind it is tested.