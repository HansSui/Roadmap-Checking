# Copilot instructions for Roadmap Duo

## Project shape

This is a dependency-free browser application. `index.html` is the entry point; it loads global, classic JavaScript files in a required order and renders into `#switcher`, `#hero`, `#tabs`, and `#view`.

- `js/defaults.js` defines account IDs, tabs, statuses, grade components, and the default Crypto + RE and 2D Art plans.
- `js/curriculum.js` defines the UIT course catalog, degree credit blocks, recommended semester plan, and normalization/migration helpers for course data.
- `js/core.js` owns the normalized application state, account/plan helpers, progress calculations, localStorage keys, and persistence wrappers.
- `js/sync-local.js` is the browser-only persistence adapter: it reports save status and applies changes received from other tabs through the `storage` event.
- `js/render.js` renders the shared shell plus Plan, Checklist, Reference, and Applications views. It also contains shared HTML formatting/escaping usage and task/application rendering.
- `js/semesters.js` implements the Crypto + RE Grades tab: semester/course editing, catalog placement, grade calculations, GPA summaries, warnings, and related event hooks.
- `js/app.js` handles event delegation, routing, editing actions, undo, backup/restore, theme switching, and startup.
- `js/theme.js` must remain in `<head>` so the saved theme is applied before the first paint.
- `css/styles.css` contains layout, responsive behavior, light/dark styling, and account-specific themes.

The two accounts are isolated under `S.accts.cyber` and `S.accts.artist`. Hash routes follow `#<account>-<tab>`, for example `#cyber-grades` and `#artist-applications`.

## Build, run, and validation

There is no package manifest, dependency installation, build script, lint configuration, automated test suite, or single-test command in this repository.

For manual browser testing, serve the repository root with any static HTTP server (for example `python -m http.server 8000`) and open `http://localhost:8000/`. Opening `index.html` directly also works for the localStorage-based app, but an HTTP server is preferable when checking browser behavior.

When validating changes, smoke-test both account routes, Plan editing, task ticking, Grades calculations/semester edits, Applications status/date behavior, theme switching, backup export/import, undo, and opening two tabs to verify localStorage synchronization.

## Data and state conventions

- Keep all persisted data JSON-safe and pass imported or migrated data through the normalizers in `core.js`/`curriculum.js`; do not assume localStorage or backup data is current or complete.
- Use `save(...)` for scoped changes and `saveAll()` for whole-state changes. These write the browser copy and update the `Sync` adapter.
- Plan edits must go through `mutPlan(...)`, which lazily clones the current default plan into account state before mutation.
- `PLAN(account)` returns the saved plan when present, otherwise the normalized default. Resetting a plan sets its saved plan to `null`, so preserve that convention.
- Task completion is stored separately from task definitions in each account's `checks` map, keyed by task ID. Removing phases/tasks must remove their obsolete check entries.
- Keep account-specific state separate: Crypto + RE owns `target`, semester settings, and `semesters`; 2D Art owns `apps` and `appGoal`.
- Preserve backward compatibility in `normState()`: it accepts the current `accts` shape and migrates legacy single-account `subjects`, `checks`, `target`, and `custom` fields.
- Use `esc()` for plain user data inserted into HTML and `fmt()` only for the supported reference-note markup (`**bold**` and `https://` markdown links). Keep link attributes protected with the existing escaping and `rel="noopener noreferrer"` pattern.
- Use delegated document handlers and `data-*` attributes for dynamic controls. Add new actions to `ACT`, semester actions to `SEM_ACT`, or the corresponding `semClick`/`semInput`/`semChange` hook rather than attaching listeners to individual rendered elements.
- Preserve focus while live-editing. Existing helpers such as `keepFocus()`, `refreshSem()`, and `updateCourse()` intentionally avoid full rerenders while typing.
- Destructive mutations use `withUndo(...)`; retain that behavior for deletes, resets, imports, and other reversible state replacements.

## Curriculum and grade rules

`curriculum.js` is the runtime source for the UIT catalog and recommended plan; the CSV under `data/` is not loaded by the application. Catalog course codes, blocks, NT classification, slot placeholders, and credit totals are consumed by `semesters.js`.

Grades use four weighted components (`qt`, `th`, `gk`, `ck`) on a 10-point scale. Weights are expected to total 100%; scores are validated to 0-10. Letter grades and 4.0 points are calculated by `grade4()` in `semesters.js` after rounding the final score to one decimal. A course counts as earned at 4.0 or above, while zero-credit separate courses are tracked without contributing to degree credits.

If changing the curriculum schema or persisted semester/course fields, update the normalizers, legacy migration path, default semester builders, render/edit handlers, and backup behavior together.

## Content and styling changes

Default roadmap content belongs in `js/defaults.js`, not in rendering code. Existing users retain saved edits until they explicitly reset a plan.

Keep UI strings and data attributes consistent with the existing render/event-delegation pattern. Account themes are selected with `data-acct` on `<html>`; theme mode is selected with `data-theme`. Preserve both light and dark variants and the responsive layout when changing CSS.
