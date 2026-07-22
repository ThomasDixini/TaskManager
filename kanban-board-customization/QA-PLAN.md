# QA & Code Review Plan – Board Customization (Label Management & Custom Columns)

PRD: [../prd-board-customization.md](../prd-board-customization.md) · Board: [BOARD.md](BOARD.md) · AI review: [REVIEW.md](REVIEW.md)

Estimated effort: ~30 min manual QA (anyone) + ~35 min code review (developer)

## Environment setup

```bash
# 1. Start Postgres (from repo root)
docker compose up -d

# 2. Start the backend (from server/)
cd server
dotnet run
# → listens on http://localhost:5080, applies migrations automatically

# 3. Start the frontend (from client/)
cd client
npm start
# → serves on http://localhost:4200, calls the API at http://localhost:5080/api
```

No login/auth exists in this app — open `http://localhost:4200` directly. Use the app's existing seed data (or create a fresh task/project) as needed for each test case below.

## How to record results

Mark each step ✅ / ❌ and write what you actually saw in "Actual". Any ❌ goes into Part 4 (Findings log) with a severity.

---

## Part 1 — Manual QA (no coding skills required)

### TC-1: Labels section appears and lists all labels (covers FR-1)
Preconditions: app loaded, at least the 7 built-in labels exist.

| # | Step | Expected result | Actual | ✅/❌ |
|---|------|------------------|--------|------|
| 1 | Click the gear icon in the topbar to open Settings | Settings panel opens | | |
| 2 | Scroll to the "Labels" section (below Roundness) | A list of label rows appears, each with a color swatch and a name — 7 built-in labels (design/research/writing/bug/chore/health/learning) at minimum | | |

### TC-2: Create a new label (covers FR-2)

| # | Step | Expected result | Actual | ✅/❌ |
|---|------|------------------|--------|------|
| 1 | In the "New label name" field at the bottom of the Labels list, type `Urgent` | Text appears in the field | | |
| 2 | Click a tone swatch (e.g. the amber one) in the same row | That swatch shows a selected state (highlighted/outlined) | | |
| 3 | Click "+ New label" | A new row appears at the top/in the list titled "Urgent" with the amber swatch, no page reload | | |
| 4 | Open a task card's editor and check its label picker | "Urgent" is available to attach immediately (no refresh needed) — covers FR-6 | | |
| 5 | Try clicking "+ New label" with an empty name field | The button stays disabled — no empty-name label is created | | |

### TC-3: Rename and recolor any label (covers FR-3, FR-4 — try both a built-in and a custom label)

| # | Step | Expected result | Actual | ✅/❌ |
|---|------|------------------|--------|------|
| 1 | Click "Edit" on the built-in "bug" label | An inline edit form appears with a name input pre-filled "Bug" and the tone swatches, one marked selected | | |
| 2 | Change the name to `Bugs` and pick a different tone (e.g. rose) | Fields update as typed/clicked | | |
| 3 | Click "Save" | The row now shows "Bugs" with the rose swatch; a task previously tagged "bug" still shows the label, now renamed/recolored (FR-6) | | |
| 4 | Repeat steps 1–3 on the "Urgent" label created in TC-2, renaming it to `Blocker` | Same behavior — rename/recolor works identically for custom labels | | |
| 5 | Click "Edit" then "Cancel" without saving | Edit form closes, no change persisted | | |

### TC-4: Delete a label, with confirmation and cascade (covers FR-5)
Preconditions: tag an existing task with the "chore" label first.

| # | Step | Expected result | Actual | ✅/❌ |
|---|------|------------------|--------|------|
| 1 | Click "Delete" on the "chore" label | A confirm prompt appears: "Delete 'chore'?" with Yes/Cancel | | |
| 2 | Click "Cancel" | Nothing happens, label still present | | |
| 3 | Click "Delete" again, then "Yes" | Label row disappears from the list | | |
| 4 | Open the task that was tagged "chore" | The task still exists, still has its other data, but no longer shows the "chore" chip — it was not deleted, just untagged | | |

### TC-5: "+ Add column" affordance (covers FR-7, FR-8)

| # | Step | Expected result | Actual | ✅/❌ |
|---|------|------------------|--------|------|
| 1 | On the board, look at the end of the column row | A dashed "ghost" column with a "+ Add column" input and "Add" button is visible after the 4 default columns | | |
| 2 | Type `Review` and click "Add" | A new real column titled "Review" appears where the ghost was, with count "0" and its own quick-add row at the bottom | | |
| 3 | Use the new "Review" column's quick-add field: type a task title and press Enter | A new task card appears in "Review" with count updating to 1 | | |
| 4 | Drag an existing task card from another column into "Review" | Card moves, drops correctly, count updates on both source and target columns | | |

### TC-6: Reorder any column via drag, including a default (covers FR-9, FR-12's position rule)

| # | Step | Expected result | Actual | ✅/❌ |
|---|------|------------------|--------|------|
| 1 | Drag the "Review" column's header and drop it between "In Progress" and "Done" | Column order updates visually to Backlog / To Do / In Progress / Review / Done | | |
| 2 | Reload the page | The new order persists (confirms it was saved via the API, not just a local reorder) | | |
| 3 | Drag a **default** column's header (e.g. "To Do") to a different position | It moves successfully — confirms default columns can be repositioned even though they can't be renamed/deleted | | |

### TC-7: Rename and delete a custom column (covers FR-10, FR-11, FR-13)

| # | Step | Expected result | Actual | ✅/❌ |
|---|------|------------------|--------|------|
| 1 | On the "Review" column's header, look for a "⋮" (more) icon | It's present only on "Review", not on any default column (FR-13) | | |
| 2 | Click it → "Rename" | An inline rename input appears pre-filled "Review" | | |
| 3 | Change to `QA Review`, save | Header updates to "QA Review", the task(s) inside stay attached | | |
| 4 | Put a task into "QA Review", then click "⋮" → "Delete" | A confirm prompt appears: "Delete 'QA Review'? Tasks in it will move to Backlog." | | |
| 5 | Confirm deletion | Column disappears; the task that was in it now appears in "Backlog" | | |
| 6 | Try the "⋮" menu on any default column (Backlog/To Do/In Progress/Done) | No menu icon is present at all | | |

### TC-8: Default columns stay protected (covers FR-12)

| # | Step | Expected result | Actual | ✅/❌ |
|---|------|------------------|--------|------|
| 1 | Confirm from TC-7 step 6 that no rename/delete UI exists on any default column | Pass (no affordance to even attempt this through the UI) | | |
| 2 | (Optional, developer-only) `curl -X PUT http://localhost:5080/api/columns/{id-of-Done} -d '{"name":"X"}' -H "Content-Type: application/json"` | Returns `400 Default columns cannot be renamed.` | | |
| 3 | (Optional, developer-only) `curl -X DELETE http://localhost:5080/api/columns/{id-of-Done}` | Returns `400 Default columns cannot be deleted.` | | |

### TC-9: Dynamic Status control in the task drawer (covers task-detail-drawer's dynamic columnOptions)

| # | Step | Expected result | Actual | ✅/❌ |
|---|------|------------------|--------|------|
| 1 | Create a custom column "Blocked" (via TC-5's flow) | Column appears on the board | | |
| 2 | Open any task's detail drawer | The "Status" segmented control includes "Blocked" as an option alongside the defaults | | |
| 3 | Select "Blocked" and save | Task moves to the "Blocked" column on the board | | |
| 4 | Delete the "Blocked" column via its overflow menu | Task auto-moves to Backlog (per TC-7); reopen the drawer — Status control no longer offers "Blocked" and shows "Backlog" selected | | |

### TC-10: Dashboard stays correct with custom columns present (covers FR-14 — this directly re-checks a case the AI review specifically verified only via a unit test, not manually)

| # | Step | Expected result | Actual | ✅/❌ |
|---|------|------------------|--------|------|
| 1 | Create a custom column named "Review" between "In Progress" and "Done" | Column exists | | |
| 2 | Move a task into "Review" | Task sits in "Review" | | |
| 3 | Go to the Dashboard | The task in "Review" is counted as **open/active**, not "Completed" — it should not inflate the "Completed" stat card or the weekly-progress ring | | |
| 4 | Move that same task into "In Progress" | The "In progress" stat card count includes it | | |
| 5 | Move it into "Done" | It now counts toward "Completed" and the weekly-progress ring, and drops out of "open" | | |

### TC-11: Re-verify the AI review's fixed findings (m1/m2, task 601)
These were fixed after the initial review and are unreachable through the normal UI — this is a deliberate API-level double-check, developer-only (needs `curl` or Postman).

| # | Step | Expected result | Actual | ✅/❌ |
|---|------|------------------|--------|------|
| 1 | `curl -X POST http://localhost:5080/api/columns -d '{"name":" Padded "}' -H "Content-Type: application/json"` | Response's `name` is `"Padded"` (trimmed), not `" Padded "` | | |
| 2 | `curl -X POST http://localhost:5080/api/columns -d '{"name":"Padded"}' -H "Content-Type: application/json"` (right after) | `400` — collision correctly detected now that both sides are trimmed | | |
| 3 | `curl -X POST http://localhost:5080/api/labels -d '{"name":"Case Test","tone":"AMBER"}' -H "Content-Type: application/json"` | Response's `tone` is `"amber"` (lowercased), not `"AMBER"` | | |
| 4 | Clean up: delete the test column/label created above via `DELETE /api/columns/{id}` and `DELETE /api/labels/{id}` | Both return `204` | | |

### TC-12: Non-functional — visual consistency & responsiveness

| # | Step | Expected result | Actual | ✅/❌ |
|---|------|------------------|--------|------|
| 1 | Compare a custom column's styling to a default column's (border, padding, header font, quick-add row) | Visually identical except for the presence of the "⋮" menu | | |
| 2 | Compare a custom label's swatch/chip styling to a built-in label's | Identical — same tone-variable-driven colors, same chip shape | | |
| 3 | Toggle Settings → Theme between Cream and Dusk with a custom label/column visible | No unstyled/broken-contrast elements on either theme | | |
| 4 | Resize the browser window narrower (or use responsive/mobile view) with 5+ columns present | Column row scrolls horizontally; nothing overlaps or clips unreadably | | |

---

## Part 2 — Code review checklist (developer)

### Where to look

| File | What it does |
|------|---------------|
| `server/Controllers/LabelsController.cs` | Labels CRUD (create/rename+recolor/delete), tone validation, slug id generation |
| `server/Controllers/ColumnsController.cs` | Columns CRUD + reorder, default-column protection, delete-cascades-tasks-to-Backlog |
| `server/Entities/Column.cs`, `server/Migrations/*` (the column-entity migration) | The enum→entity schema change and its data backfill |
| `server/Services/TaskPositionService.cs`, `server/Controllers/TasksController.cs` | Column-id-based task positioning after the `BoardColumn` enum removal |
| `client/src/app/features/columns/column.service.ts`, `column.model.ts` | Frontend `Column` model + signal-based service |
| `client/src/app/features/labels/label.service.ts` | Extended with `create`/`update`/`delete` |
| `client/src/app/features/board/board.component.ts` (+ `.html`) | Dynamic columns on the board: add/rename/delete/reorder, drag-and-drop nesting |
| `client/src/app/features/tasks/task-detail-drawer.component.ts` (+ `.html`) | Dynamic Status control (`columnOptions`) |
| `client/src/app/features/dashboard/dashboard.component.ts` | Stats computed against column *names*, not enum values |
| `client/src/app/features/settings/settings-panel.component.ts` (+ `.html`) | Labels management UI |
| `client/src/app/features/columns/column.service.spec.ts`, `client/src/app/features/labels/label.service.spec.ts` | New service-level tests |

### Correctness & error handling
- [ ] `ColumnsController.cs` `CreateColumn`/`UpdateColumn`: is the trimmed name used consistently for both the collision check and the stored value (task 601's fix)? Confirm no other code path reintroduced an untrimmed comparison.
- [ ] `LabelsController.cs` `CreateLabel`/`UpdateLabel`: is `Tone` always normalized to lowercase before storing? Is `Name` trimmed?
- [ ] `ColumnsController.cs` `DeleteColumn`: does it correctly re-home tasks to Backlog *and* reindex the remaining columns' `Position` so there's no gap? Check the loop at the end of the method.
- [ ] `ColumnsController.cs` `ReorderColumns`: does it reject a request with duplicate ids, a wrong count, or an unknown id (all three checked)? What happens if `orderedIds` is empty?
- [ ] Migration: does the backfill correctly map every old `BoardColumn` enum value to the matching seeded `Column.Id`, with no silent `RenameColumn`-style corruption (this was called out as the single riskiest step in the PRD's Technical Considerations)?
- [ ] `dashboard.component.ts`: are the `doing`/`done`/`active` computed signals comparing against the correct *runtime string* column names (`'InProgress'`, `'Done'`) now that `BoardColumn` is a plain `string`, not a compile-time-checked union?
- [ ] `board.component.ts`: does the outer column-reorder `cdkDropList` coexist cleanly with the per-column card `cdkDropList`s (no accidental data leakage between the two drop-list groups)?

### Security
- [ ] `LabelsController.cs`: is `Tone` still validated server-side (`IsValidTone`) even though the frontend only ever sends the 7 canonical values? (It should be — this is the same defense-in-depth posture as the trim/normalize fix.)
- [ ] Any endpoint here reachable without the app's existing (lack of) auth model changing? Confirm no new endpoint was accidentally left more/less permissive than its siblings.
- [ ] No user-supplied string (column/label name) is interpolated into a raw SQL string anywhere — confirm all queries go through EF Core's parameterized LINQ (skim for any `FromSqlRaw`/string concatenation in the touched controllers).

### Tests
- [ ] Run `cd client && npm test` — all green? (Expect 29/29 as of the last review pass; note the actual count you see.)
- [ ] Run `cd server && dotnet build` — 0 errors?
- [ ] Open `column.service.spec.ts` / `label.service.spec.ts`: do they assert observable behavior (signal state, request method/body) rather than internal implementation details?
- [ ] Is there any test coverage for `board.component.ts`, `task-detail-drawer.component.ts`, or `settings-panel.component.ts` themselves (not just the services they call)? (REVIEW.md's finding m3 says no — confirm this is still the case and decide if it should block sign-off.)

### Readability & maintainability
- [ ] Would a new contributor understand `columnDisplayLabel()`'s purpose (mapping default machine-form names to friendly labels) without needing to ask? Is there a comment where the non-obvious part (why raw `name` vs. display label matters) is not otherwise clear from the code?
- [ ] Any leftover TODOs, commented-out code, or console.log/Console.WriteLine debug statements in the touched files?
- [ ] Naming consistency: does `ColumnService` mirror the shape/conventions of the pre-existing `LabelService`/`ProjectService` (signal + `.asReadonly()`, `Promise`-returning mutators)?

## Part 3 — Best-practices audit (stack-specific)

- [ ] `cd client && npx ng build` — succeeds with no new budget warnings? (Baseline at last review: 857.76 kB, under a 900 kB budget — check it hasn't crept close to the limit.)
- [ ] `cd server && dotnet build` — no new warnings beyond the pre-existing `NU1903` (Microsoft.OpenApi advisory, unrelated to this feature)?
- [ ] `git log --stat` on the `task(1xx)`–`task(601)` commits: does each commit touch only its declared `files` (per `BOARD.md`'s file-ownership map) plus expected board/task-file bookkeeping?
- [ ] No secrets or connection strings committed: `git log -p -- server/appsettings*.json` shows no plaintext credentials added in this effort.
- [ ] Any new npm/NuGet package added for this feature? If so, is it justified (check `client/package.json` / `server/Kanban.Api.csproj` diffs against the base commit) — this PRD didn't call for new dependencies.
- [ ] Error messages returned to the API caller (e.g. "A column named 'X' already exists.", "Default columns cannot be renamed.") — are they consistent in tone/format with pre-existing error responses elsewhere in the API?
- [ ] EF Core migration file: is it named descriptively and does `dotnet ef migrations list` (or equivalent) show it applied cleanly with no manual out-of-band DB edits required?

## Part 4 — Findings log

| ID | Where found (TC / file) | Severity (critical/major/minor) | Description | Suggested owner |
|----|------------------------|--------------------------------|-------------|-----------------|
| | | | | |

## Part 5 — Sign-off

- [ ] All test cases executed; failures logged above
- [ ] Code review checklist completed
- [ ] Best-practices audit completed

Verdict: SHIP / SHIP AFTER MINOR FIXES / DO NOT SHIP
Reviewer: ______  Date: ______
