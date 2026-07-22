# Review – Board Customization (Label Management & Custom Columns)

Date: 2026-07-22
PRD: [../prd-board-customization.md](../prd-board-customization.md) · Board: [BOARD.md](BOARD.md) · Commits reviewed: `baa46a0..da718ee` (11 tasks, 5 waves; `739b3b0` is an unrelated catch-up commit for a prior feature's uncommitted fixes, included in the range but not part of this board)

## Verdict
**APPROVED WITH MINOR ISSUES.** Every functional requirement in the PRD is implemented and independently re-verified live against a running instance (fresh builds, fresh backend/frontend processes, not reused from implementation-time state). All 11 tasks' acceptance criteria hold up under re-verification, file ownership is clean across every commit, and the full test suite passes (29/29). Two real but low-severity input-validation gaps were found in the Columns/Labels APIs (whitespace not trimmed before uniqueness checks; label tone not normalized to canonical case) — both are unreachable through the actual shipped UI (the frontend already trims/only-sends-canonical values before calling the API), so they're defense-in-depth gaps rather than user-facing bugs. No critical findings, no requirement gaps.

## Requirements traceability

| Req | Task(s) | Implemented | Verified how | Status |
|-----|---------|-------------|---------------|--------|
| FR-1 (Labels section in Settings) | 301 | yes | Live: opened Settings, confirmed a "Labels" section with all 7 built-in labels | ✅ |
| FR-2 (create label, name + 7-tone swatch) | 101, 202, 301 | yes | Live: `POST /api/labels` with `{name:"Waiting on Client", tone:"amber"}` → 201, correct slug id; UI create form verified in task 301's own live pass | ✅ |
| FR-3 (rename any label) | 101, 202, 301 | yes | Live: `PUT /api/labels/bug` renamed to "Bugs", `GET` reflected it, id unchanged | ✅ |
| FR-4 (recolor any label) | 101, 202, 301 | yes | Same `PUT` call also changed tone `rose`→confirmed in response body | ✅ |
| FR-5 (delete label, confirm, cascade) | 101, 202, 301 | yes | Live: tagged a task with `bug`, deleted the label → 204, task survived, `labelIds` no longer contained it | ✅ |
| FR-6 (consumers reflect changes immediately) | 202 | yes | By construction: `LabelService`/`ColumnService` are `providedIn:'root'` signals shared by every consumer (card, drawer, settings) — a write from any one is visible to all readers on next change detection; confirmed live (drawer + card both showed a live-created label with no reload) | ✅ |
| FR-7 ("+ Add column" affordance) | 201, 302, 401 | yes | Live: typed a name into the ghost column, `POST /api/columns` fired, new column appeared with working quick-add/drop target | ✅ |
| FR-8 (new columns get full quick-add/count/drop support) | 401 | yes | Live: quick-add into a newly created column worked identically to a default (count 0→1, textarea Enter/Shift+Enter/Escape behavior intact) | ✅ |
| FR-9 (reorder any column via drag) | 201, 302, 401 | yes | Live: `onColumnDrop` moved a custom column from position 4 to position 1 (between Backlog and ToDo), `PATCH /api/columns/reorder` fired, order persisted | ✅ |
| FR-10 (rename custom column) | 201, 302, 401 | yes | Live: renamed via overflow menu, header updated, task reload confirmed cards stayed correctly attached | ✅ |
| FR-11 (delete custom column, auto-move to Backlog, confirm) | 201, 401 | yes | Live: two-step confirm dialog shown ("Delete 'X'? Tasks in it will move to Backlog."); confirmed deletion moved the task to Backlog | ✅ |
| FR-12 (defaults protected: name/delete fixed, position changeable) | 102, 201, 401 | yes | Live: `PUT`/`DELETE` on the Done column's id both return 400; a custom column was successfully repositioned *between* two defaults via reorder, confirming position isn't frozen for anyone | ✅ |
| FR-13 (custom shows rename/delete menu; default doesn't) | 401 | yes | Live: overflow menu (`more_vert`) present only on the custom "QA Review"/"Review" columns, absent on all 4 defaults | ✅ |
| FR-14 (Dashboard stats correct with custom columns) | 403 | yes | `dashboard.component.spec.ts` test (task in a `'Review'` column: counted active, not "in progress", not "completed") + live dashboard check with a real custom column present | ✅ |

## Task audit

| Task | Column | Criteria re-verified | File ownership | Notes |
|------|--------|----------------------|----------------|-------|
| 101 | done | 8/8 re-run live | clean | — |
| 102 | done | 12/12 re-run live; migration re-confirmed applied to real DB with correct backfill | clean | The single largest/riskiest task — correctly bundled per its own justification (breaking type change, not additive) |
| 103 | done | 4/4 (build, test, type check, no other files touched) | clean | — |
| 201 | done | 12/12 re-run live | clean | — |
| 202 | done | 4/4 re-run live | clean | — |
| 301 | done | 6/6 (code review + subagent's own live TestBed/browser verification) | clean | — |
| 302 | done | 8/8 re-run live | clean | — |
| 401 | done | 9/9 re-run live | clean, **with a disclosed deviation** | This task's worktree branched before an earlier fix (textarea-based quick-add with Shift+Enter/Escape) landed on `master`. Its own diff would have silently reverted that fix back to a plain `<input>`. Caught during merge (not by the implementing subagent), manually reconciled on top of its new dynamic-column logic, and re-verified live before committing — documented in the commit message. |
| 402 | done | 5/5; reconciled similarly (this task's worktree also branched early, but its diff was narrowly scoped to the Status control and didn't touch or revert anything else) | clean | — |
| 403 | done | 4/4 re-run live | clean | — |
| 501 | done | 9/9 re-run live | clean | — |

**Backlog / in-progress**: empty — all 11 tasks are in `done/`.

## Test & build results

- **Backend**: `dotnet build` → 0 errors (2 pre-existing `NU1903` advisory warnings, unrelated to this feature). `dotnet run` against the real dev Postgres database → starts cleanly, migration state confirmed already applied and correct.
- **Frontend**: `ng build` → succeeds, no warnings (857.76 kB, under the 900 kB budget). `ng test --watch=false` → **29/29 passing across 7 files** (up from 19/5 before this effort — `column.service.spec.ts` and `label.service.spec.ts` added by task 501).
- **Live end-to-end** (fresh backend + frontend processes, not reused from implementation-time): dashboard, board (4 default columns + create/rename/reorder/delete of a custom column), task detail drawer (dynamic Status control coexisting correctly with the pre-existing Project select and Labels picker, subtasks, comments), Settings (theme toggle with dark-mode contrast, Labels management), search, project filter — zero console errors observed at any point.

## Findings

### Major
_(none)_

### Minor
- **[m1] Column name uniqueness doesn't trim whitespace before comparing.** `server/Controllers/ColumnsController.cs:37` (`CreateColumn`) and `:80` (`UpdateColumn`) compare `c.Name.ToLower() == request.Name.ToLower()` without trimming either side, and the stored `Name` itself (`:50`, `:86`) is never trimmed either. Reproduced live: `POST {"name":" Review"}` and `POST {"name":"Review"}` both succeed as two distinct, visually-near-identical columns. **Not reachable through the shipped UI** — `board.component.ts`'s `addColumn()`/`renameColumn()` both call `.trim()` on the user's input before ever calling the service, so a real user can't hit this through normal use. Still worth a defensive fix in the API itself (trim both sides of the comparison and the stored value), since the API has no auth and nothing stops a future frontend change or a direct API call from relying on it.
- **[m2] Label `tone` isn't normalized to its canonical lowercase form.** `server/Controllers/LabelsController.cs:14` validates tone case-insensitively (`StringComparer.OrdinalIgnoreCase`), but `:51`/`:77` store `request.Tone` as-provided. Reproduced live: `POST {"name":"CaseTest","tone":"AMBER"}` succeeds and stores `"tone":"AMBER"`, which would fail to resolve any `var(--tone-AMBER)` CSS custom property on the frontend (only lowercase `--tone-amber` is ever defined) — the label chip would render with no color. **Not reachable through the shipped UI** either — the Settings panel's tone swatch picker only ever sends the 7 lowercase canonical values. Worth normalizing (`request.Tone.ToLowerInvariant()`) before storing, for the same defense-in-depth reason as m1.
- **[m3] No component-level tests for the three largest UI components touched by this effort** (`board.component.ts`, the biggest and most complex file in the whole app; `task-detail-drawer.component.ts`; `settings-panel.component.ts`). All verification for these was live/manual (thorough, but not regression-proof). This mirrors the same gap already noted in the prior Sprout redesign's own review (`kanban-sprout-task-manager/REVIEW.md`, finding m4) — a recurring pattern in this codebase (only pure data-access services get unit tests), not something introduced newly by this effort, but worth addressing before the codebase grows further.

## Unrequested changes detected

None. `git show --stat` on every task commit shows each touching only its declared `files` (plus the expected `BOARD.md`/task-file bookkeeping). The one deviation (task 401's quick-add reconciliation) is disclosed above and in its own commit message — it restored previously-shipped behavior rather than adding anything new.

## Recommended next steps

1. Fix m1 and m2 together (both are one-line-per-spot changes in the same two controllers): trim column names before comparing/storing in `ColumnsController`, normalize label tone to lowercase before storing in `LabelsController`.
2. m3 (component test coverage) is a larger, separate effort — same recommendation as the prior Sprout review: track as its own follow-up rather than fold into a quick fix pass.

Proposed board tasks (ready for `prd-to-kanban`/`implement-task`):
- **601 – Trim/normalize Columns and Labels API input** (wave 6, depends on 201/101): fixes m1 and m2.
- **602 – Component test coverage for board/drawer/settings** (wave 6, depends on 401/301): fixes m3, alongside the still-open Sprout-review m4.

I can add these to the board now if you'd like — say the word and I'll create the task files and wire them into `BOARD.md`.
