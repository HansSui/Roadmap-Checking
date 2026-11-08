# Roadmap Duo

A planner with two separate accounts on one page: **Crypto + RE** (cryptography and reverse engineering) and **2D Art** (character design, animation and rigging). Each account has its own roadmap, ticks, colours and tools, and everything in the plan can be edited.

## Accounts

Two cards at the top switch between the accounts. Each card shows the account name, a subtitle and its overall progress. The page re-themes when you switch:

- **Crypto + RE**: graphite green, square tick boxes, monospaced labels.
- **2D Art**: ink blue with a coral highlight, round tick boxes, and phase cells drawn as film frames.

The accounts are independent. Ticks, plan edits and tools never mix. Each screen has its own link (`#cyber-plan`, `#artist-applications` and so on), so you can bookmark one.

## Screens

Every account has the same first three tabs and one tool tab of its own.

### Plan
- A header with the account's headline, goal, a progress ring and the current phase.
- A strip of phase cells showing progress per phase. The first phase with unfinished tasks is marked **Now**, and finished phases are marked **Done**. Clicking a cell jumps to that phase.
- **Next up**: the next few unticked tasks from the current phase, which you can tick directly.
- Collapsible phase cards. Each has a goal, focus points, what to expect, a gate (the condition for finishing the phase) and a task list. Tasks marked **Target** are the key milestones. **Expand all** and **Collapse all** open or close every card.

### Checklist
A flat list of every task grouped by phase, in the style of a problem list. Filter by phase, search by text or tag, hide completed tasks, and add a task to any phase. It shares the same ticks as the Plan tab.

### Reference
The background notes for the account, shown as lists and tables.
- Crypto + RE: the research thread, certification table, Red Hat exam notes, weekly habits and things to watch.
- 2D Art: the short version, career options table, the five lanes, pay signals, weekly time budget, habits to keep and avoid, and open points.

### Grades (Crypto + RE)
A grade calculator for your university subjects, entered by hand.
- Each subject has four components: Quá trình, Thực hành, Giữa kỳ and Cuối kỳ. Give each a weight (%) and a score out of 10. A weight of 0 removes that component.
- It shows the weighted final grade, the letter grade and the 4.0 points, and warns if the weights do not add up to 100.
- While some scores are missing, it shows the running average and the score you still need on the remaining components to reach your target grade, or tells you the target is out of reach.
- The summary shows your GPA on the 10-point and 4.0 scales, weighted by credits.
- The three subjects at the start are examples and can be removed in one click.

### Applications (2D Art)
A tracker for studios you are looking at or have applied to.
- Each entry holds studio, role, status, date, listing link and notes. Statuses are Saved, Applied, Replied, Test, Interview, Offer and Rejected.
- A counter shows applications sent against your goal (20 by default). Saved leads do not count. Everything from Applied onward does, including rejections.
- Filter by status. Changing a status away from Saved fills in today's date if the date is empty.
- It starts with three leads from the plan: Gear Games, Otsu Labs and Amanotes.

## Editing the plan

**Edit plan** (top right of the Plan and Reference tabs) turns the screen into an editor, and everything saves as you type.
- Change the account name, subtitle, headline and goal.
- Edit any phase: label, period, title, goal, focus points, expectations and gate. Add, delete and reorder phases.
- Edit any task: text, tag, date note and Target flag. Add, delete and reorder tasks.
- Edit the Reference notes. Lists take one bullet per line, and tables take one row per line with columns separated by ` | ` (the first line is the header). Text supports `**bold**` and `[link text](https://example.com)`.
- **Reset plan to default** restores the original plan for that account.

## Undo

Deleting a task, phase, note, subject or application, resetting a plan, removing the example subjects, importing a backup and resetting everything all show an **Undo** button for a few seconds.

## Saving and backup

All data is saved in the browser's localStorage, so it stays on that browser and device and works offline. It covers ticks, plan edits, subjects, scores, applications and settings for both accounts. The header shows when it last saved, and warns if the browser refuses to save.

The **Backup** panel moves data between browsers and devices:
- **Download backup file** saves everything as a `.json` file, and **Import from file** loads one.
- **Copy as text** and **Restore from text** do the same through the clipboard.
- Backups from the earlier single-account version also import.

If you change the page's address or clear site data, the saved data starts again from the defaults, so keep a backup file for anything you care about.

## Appearance

The page follows your system light or dark setting, and the **Theme** button cycles Auto, Light and Dark. The tab bar stays at the top while you scroll. The layout adapts down to phone width.

## What is included

| File | What it holds |
| --- | --- |
| `index.html` | The page structure: account switcher, header tools, the areas the screens render into, the backup panel and the undo message |
| `css/styles.css` | All styling, including both account colour themes in light and dark |
| `js/theme.js` | Applies your saved light or dark choice before the page paints |
| `js/defaults.js` | The starting content: both plans, their reference notes, and the starter job leads |
| `js/core.js` | Data handling: cleaning and validating data, the app state, saving to localStorage, and the plan editing helpers |
| `js/sync-local.js` | The save status message and updates between open tabs |
| `js/render.js` | Every screen: plan, checklist, reference, grades and applications, plus the grade calculations |
| `js/app.js` | Clicks and typing, editing actions, undo, backup and import, and the screen routing |

To change the starting plans, edit `js/defaults.js`. Anyone who already has saved edits keeps their own version until they use **Reset plan to default**. The grade-scale cutoffs are in `grade4()` in `js/render.js`.
