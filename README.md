# GetFit static app

This folder contains the static PT package tracker app.

- `index.html` contains the page structure.
- `styles.css` contains the visual design.
- `app.js` starts the app, wires modules together, and handles view routing, modals, and toast messages.
- `firebase.js` contains Firebase setup, sign-in, sign-out, and live database syncing.
- `dashboard.js` contains the Overview dashboard rendering.
- `calendar.js` contains calendar rendering, navigation, and jump-to-month behavior.
- `packages.js` contains package stats, package rendering, and package create/delete/activate actions.
- `log.js` contains Log page analytics, filters, charts, and session-history rows.
- `sessions.js` contains booking, completion, cancellation, session detail, and calendar export logic.
- `exercise-ui.js` contains the exercise picker, exercise rows, workout set editor, and workout volume input behavior.
- `exercises.js` contains the exercise database and exercise categories.
- `utils.js` contains shared formatting and small helper functions.

Publish all app files together at the repository root. The app should be opened from a web origin such as GitHub Pages or localhost, not directly with `file://`, because Google/Firebase sign-in needs a real web origin.

For local testing from this folder:

```bash
ruby -run -e httpd . -p 8765 -b 127.0.0.1
```

Then open:

```text
http://127.0.0.1:8765/
```
