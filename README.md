# GetFit split static app

This folder is the split version of the PT Sessions app.

- `index.html` contains the page structure.
- `styles.css` contains the visual design.
- `app.js` connects the app pieces together and still contains calendar, package, and exercise-row logic.
- `firebase.js` contains Firebase setup, sign-in, sign-out, and live database syncing.
- `dashboard.js` contains the Overview dashboard rendering.
- `sessions.js` contains booking, completion, cancellation, session history, session detail, and calendar export logic.
- `exercises.js` contains the exercise database and exercise categories.

Publish all seven files together at the repository root. The app should be opened from a web origin such as GitHub Pages or localhost, not directly with `file://`, because Google/Firebase sign-in needs a real web origin.

For local testing from this folder:

```bash
ruby -run -e httpd . -p 8765 -b 127.0.0.1
```

Then open:

```text
http://127.0.0.1:8765/
```
