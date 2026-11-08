# Roadmap Duo

One page, two accounts. Switch between them at the top.

- **Crypto + RE**: year-by-year plan, checklist, reference notes and a grade calculator.
- **2D Art**: phase-by-phase plan, checklist, reference notes and an applications tracker.

Each account has its own colours, ticks and plan. Turn on **Edit plan** to change phases, tasks, notes, and the account name and goal. Deleting something shows an **Undo** button for a few seconds.

## Files

```
index.html          page structure
css/styles.css      all styles and the two colour themes
js/theme.js         applies the saved light/dark choice before first paint
js/defaults.js      starting plans, notes and job leads for both accounts
js/core.js          data helpers, normalising, state, saving to localStorage
js/sync-local.js    save status and cross-tab updates (browser storage)
js/render.js        every screen (plan, checklist, reference, grades, applications)
js/app.js           clicks, typing, undo, backup, routing
```

The scripts are plain `<script>` tags, not modules, so the page also works when you open `index.html` straight from disk.

## Run it locally

Open the folder in VS Code, install the **Live Server** extension, right-click `index.html` and choose **Open with Live Server**. Opening the file directly also works. There is no build step.

## Publish on GitHub Pages

1. Push this folder to a GitHub repository (the files above at the repo root).
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, then save.
4. Your site appears at `https://<your-username>.github.io/<repo-name>/` after a minute or two.

## Where your data lives

Everything is saved in the browser's localStorage, per browser and per address. A phone, another laptop, a private window, or a different address (for example `127.0.0.1:5500` versus your GitHub Pages address) each start from the defaults.

Use **Backup** at the top of the page to move your data:

- **Download backup file** saves a `.json` file. Open the site on another device, choose **Import from file**, and pick it.
- **Copy as text** and **Restore from text** do the same through the clipboard.
- Backups from the earlier single-account version also import.

Clearing site data wipes your saved plan, so download a backup now and then.

If the repository is public, anyone can read the default plans in `js/defaults.js`. Your own edits and ticks stay in your browser and are not uploaded anywhere.

## Edit the defaults

The starting content is in `js/defaults.js`: `DEF.cyber`, `DEF.artist` (phases, tasks, notes) and `DEF_APPS` (starter job leads). People who already have saved edits keep their own version, and **Reset plan to default** in edit mode loads the new defaults. The grade-scale cutoffs are in `grade4()` in `js/render.js`.
