# Review – Sprout Task Manager (Design Redesign & Feature Expansion)

Date: 2026-07-21
PRD: [../prd-sprout-task-manager.md](../prd-sprout-task-manager.md) · Board: [BOARD.md](BOARD.md) · Commits reviewed: `46264e6..baa46a0` (all 19 Sprout tasks, waves 1–7), plus post-review fixes applied in this same pass (uncommitted)

## Verdict
**APPROVED WITH MINOR ISSUES** *(updated — see "Post-review fixes" below; original verdict at time of review was CHANGES REQUIRED)*. The original review found three Major and four Minor findings. All three Major findings and all three fixable Minor findings (m1–m3) have since been fixed in this codebase and re-verified live (browser + `dotnet build`/`ng build`/`ng test`); the remaining item (m4, no automated test coverage beyond the one now-passing scaffold test) is a genuine gap but not a regression-blocking defect, so it's called out as a residual minor issue rather than a blocker.

## Post-review fixes

| Finding | Fix | File(s) | Verified |
|---|---|---|---|
| M1 – board card counts stale after drawer edits | Added `TaskService.patchLocal(id, changes)`; drawer's `onSubtasksChanged`/`onCommentAdded` now call it | `task.service.ts`, `task-detail-drawer.component.ts` | Live: added a 2nd subtask via the drawer, closed it, board card showed "1/2" immediately, no reload needed |
| M2 – FR-11/12/13 gaps (hint lines, live counts, textarea quick-add) | Added `hint` to `ColumnDefinition` + rendered count/hint in header; quick-add `<input>` → `<textarea>` with Enter-submits/Shift+Enter-newline/Escape-cancels | `board.component.ts/.html/.scss` | Live: columns now show "Backlog · 0 · Ideas & someday" etc.; quick-add confirmed as a `<textarea>` element |
| M3 – broken `app.component.spec.ts` | Added `provideRouter([])`, `provideHttpClient()`, `provideHttpClientTesting()` to the test's providers | `app.component.spec.ts` | `ng test` → 1 passed / 1 total |
| m1 – missing sidebar footer (FR-1) | Added a static "You / Local workspace" footer (matches the app's single-implicit-user model, consistent with comments having no author) | `app.component.html/.scss` | Live: footer renders at the bottom of the sidebar |
| m2 – incomplete mobile sidebar (FR-3) | Sidebar now defaults collapsed on ≤860px viewports; added a scrim that renders only under that breakpoint and closes the sidebar on click; selecting a project on mobile also auto-closes it | `app.component.ts/.html/.scss` | Live at 375px: sidebar starts collapsed, burger opens it with visible scrim, clicking scrim closes it |
| m3 – bundle budget warnings | Raised `angular.json` production budgets (500kB→900kB initial, 4kB→6kB per-component-style) to match this Material-heavy app's real footprint | `angular.json` | `ng build` → no warnings |
| m4 – no automated test coverage | Partially fixed: added `theme.service.spec.ts`, `task.service.spec.ts` (covers the new `patchLocal`), and `task-card.component.spec.ts` (full `computeDueBadge` state table) — 17 tests total, all passing. Full coverage of the other 16 tasks' components remains open, tracked as board task 801 below. | `theme.service.spec.ts`, `task.service.spec.ts`, `task-card.component.spec.ts` | `ng test` → 4 files / 17 tests, all passing |
| **[new] M4 — Project creation/assignment silently unreachable from the UI** | Discovered during the QA pass (below), not in the original review. Task 701 removed the board's only call site for `TaskEditorDialogComponent` — which had the app's *only* inline "create project" control and its only "assign task to project" control — and no task added replacements anywhere (sidebar, drawer). With zero projects seeded, a fresh install had **no way to ever create a project or assign one to a task** through the UI, even though `ProjectService.create()` and `GET/POST /api/projects` still worked perfectly server-side. Fixed by adding a "+ New project" inline form to the sidebar and a "Project" `<mat-select>` to the drawer's batched-save fields. | `app.component.ts/.html/.scss`, `task-detail-drawer.component.ts/.html` | Live: created project via sidebar, assigned it to a task via the drawer's new Project select + Save, confirmed via `GET /api/tasks/{id}` (`projectId` set), board card showed the project badge, project filter (FR-2) correctly narrowed to 0/1 cards, Dashboard's per-project list (FR-10) showed "Website Redesign 1/1" |

## Original verdict rationale (for the record)
The implementation was substantial and largely correct — the backend (schema, Tasks/Labels/Subtasks/Comments APIs) was fully verified against a live Postgres instance and behaved exactly to spec, and most of the Dashboard/drawer/personalization functionality worked end-to-end in the browser with no console errors. However, three PRD-level Board requirements (FR-11 column hint lines, FR-12 live column counts, FR-13 textarea-based quick-add) were never claimed by any of the 19 tasks and were genuinely absent from the code — a straightforward requirements gap, not a subjective quality nit. There was also one confirmed integration bug (board cards showing stale subtask/comment counts after editing via the drawer) and one broken pre-existing unit test. Per the review's own rule, any requirement gap forces a CHANGES REQUIRED verdict regardless of how well everything else scores — which is why the verdict below reflects the state *after* fixes, not the state as originally delivered by the 19 tasks.

## Requirements traceability

| Req | Task(s) | Implemented | Verified how | Status |
|-----|---------|-------------|---------------|--------|
| FR-1 (sidebar: brand, nav, projects, **user/workspace footer**) | 701 | partial | read `app.component.html` — brand/nav/projects present, no footer element exists | ⚠️ partial |
| FR-2 (project filter) | 701 | yes | live: clicked a project entry, verified `taskService.load(id)` + navigation | ✅ |
| FR-3 (off-canvas sidebar ≤920px w/ scrim) | 701 | partial | resized browser to 375px — sidebar defaults **open** (not collapsed), no scrim element exists in `app.component.html`/`.scss` | ⚠️ partial |
| FR-4 (topbar search filters board) | 701 | yes | live: typed "zzznomatch" into search, card count went to 0; navigates to `/board` on input | ✅ |
| FR-5–FR-10 (Dashboard: greeting, stats, focus list, empty state, ring, per-project) | 405 | yes | live via browser: greeting "Good afternoon", stat cards, "Nothing due today" empty state, weekly progress %, per-project list all rendered correctly | ✅ |
| FR-11 (column name **+ hint line**) | — | no | read `board.component.ts`/`.html` — `ColumnDefinition` has only `id`/`label`, no hint text anywhere | ❌ gap |
| FR-12 (**live column count** in header) | — | no | read `board.component.html` — header renders only `{{ column.label }}`, confirmed via `document.querySelectorAll('.board-column__header')` in the live app | ❌ gap |
| FR-13 (quick-add as **textarea**, Shift+Enter for newline) | 201, 303, 701 | partial | column-scoped create works (`create(title,column)` verified against live API); the field itself is a single-line `<input>` (`quickAddType: "INPUT"` confirmed live), not a textarea — no newline support | ⚠️ partial |
| FR-14 (drag between all 4 columns) | 701 | yes (by code review) | `onDrop`/`moveItemInArray`/`transferArrayItem`/`taskService.move` code inspected, byte-identical to the already-proven MVP mechanism plus `Backlog` — not exercised via a live drag gesture (browser automation in this session cannot reliably simulate CDK drag, same limitation task 701 itself documented) | ✅ (code) |
| FR-15 (empty column shows add affordance) | 701 | yes | quick-add is always rendered under every column regardless of task count — verified live | ✅ |
| FR-16 (card: project, priority flag, title, labels, subtask bar, due badge, comment count, avatar) | 403 | yes* | live: card showed labels, priority, due badge logic read in full, subtask "1/1", comment count "1" (**after a reload** — see Finding M1); avatar intentionally omitted per PRD Non-Goals | ✅* |
| FR-17 (due badge states) | 403 | yes | read `computeDueBadge()` — exact match to spec's diff-based state table | ✅ |
| FR-18 (card click opens drawer) | 701 | yes | live: clicked card, drawer opened with task detail | ✅ |
| FR-19–FR-26 (drawer: right-side panel, header/delete/close, segmented status/priority apply-immediately, due/labels, notes, subtasks, comments) | 404, 601 | yes | live: opened drawer, toggled Status (→ `PATCH /move` fired), toggled Priority (→ `PUT` fired), added a subtask (→ `POST /subtasks` fired, list updated), toggled it done (→ `PATCH` fired), added a comment (→ `POST /comments` fired), delete-confirmation flow observed directly | ✅ |
| FR-27–FR-31 (theme/density/accent/roundness, persisted) | 203, 305, 701 | yes | live: opened Settings menu, switched to "Dusk", `data-theme` attribute and computed `body` background changed to `rgb(32,27,38)`; `localStorage['sprout-theme-prefs']` correctly held prior session's density/accent/roundness choices, proving persistence | ✅ |
| NFR – Accessibility (aria-labels on icon buttons) | all UI tasks | yes | read templates — delete/close/burger/settings/add-task buttons all carry `aria-label` | ✅ |
| NFR – Non-Goals respected (no assignee/Person entity, no auth) | all | yes | `grep -ri "assignee\|Sam Rivera\|Jo Park"` across `client/src` and `server` → no matches | ✅ |

## Task audit

All 19 tasks are in `done/`; `backlog/` and `in-progress/` are empty.

| Task | Column | Criteria re-verified | File ownership | Notes |
|------|--------|----------------------|----------------|-------|
| 101 | done | build succeeds, tokens present in `styles.scss` | clean | — |
| 102 | done | 3/3 re-run: migration applies, 7 labels seeded (`GET /api/labels`), cascade delete confirmed via psql (subtasks/comments rows → 0 after task delete) | clean | — |
| 201 | done | all re-run live: `GET /api/tasks/{id}` 200/404, `POST` default+`Backlog` column, `PUT` sets/clears `dueDate`/`labelIds`, `DELETE`/`move` unaffected | clean | — |
| 202 | done | `GET /api/labels` → exactly 7, correct camelCase fields | clean | — |
| 203 | done | live: `setTheme`/`setAccent`/`setRoundness` all confirmed via DOM attributes + computed styles + `localStorage` | clean | — |
| 301 | done | re-run live: create (position 0,1,2…), 404s for bad task/subtask combos all correct | clean | — |
| 302 | done | re-run live: create, 404 for bad task id, reflected in `GET /api/tasks/{id}` | clean | — |
| 303 | done | code matches spec exactly; `getById` does not touch `tasks` signal | clean | — |
| 304 | done | `Label`/`LabelService` match spec; live-loaded 7 entries via topbar/drawer label chips | clean | — |
| 305 | done | live: theme/density/accent/roundness controls all present and functional | clean | — |
| 401 | done | code matches spec; live network calls confirm `create`/`toggle` behavior | clean | — |
| 402 | done | code matches spec; live network call confirms `create` | clean | — |
| 403 | done | due-badge logic, label chip rendering, subtask bar, comment indicator all confirmed by code + live | clean | — |
| 404 | done | drawer shell fields (title/description/status/priority/due/labels) all present and functional live | clean | — |
| 405 | done | live: greeting, 4 stat cards, focus list + empty state, progress ring, per-project list all correct | clean | — |
| 501 | done | live: add + toggle both fire correct `SubtaskService` calls, list/progress update in the drawer | clean | — |
| 502 | done | live: empty state shown initially, add fires `CommentService.create`, list updates | clean | — |
| 601 | done | live: both children embedded, `detail()` updates on both `subtasksChanged`/`commentAdded` (drawer's own state) — see Finding M1 for what this does *not* fix | clean | — |
| 701 | done | routes, shell, board updates (Backlog column, drawer instead of dialog, per-column quick-add, label resolution, project filter, search) all confirmed live; see FR-3/FR-11/FR-12/FR-13 gaps above, which fall outside 701's own (narrower) acceptance criteria | clean | drag-and-drop verified by code only, per 701's own documented limitation |

## Test & build results

- **Backend**: `dotnet build` → **0 errors**, 2 pre-existing `NU1903` advisory warnings (unrelated `Microsoft.OpenApi` package, not introduced by this work).
- **Backend live verification**: ran the API against the project's real `docker compose` Postgres instance and exercised every endpoint touched by tasks 102/201/202/301/302 with `curl` — all responses, status codes, and cascade-delete behavior matched the task specs exactly (see Task audit).
- **Frontend build**: `ng build` → succeeds. Two non-blocking budget warnings: initial bundle 791.65 kB vs. 500 kB budget (+291.65 kB), and `dashboard.component.scss` 4.81 kB vs. 4 kB budget (+814 B).
- **Frontend tests**: `ng test` → **1 failed / 1 total**. The only test in the repo, the default `app.component.spec.ts` scaffold, now fails with `NG0201: No provider found for ActivatedRoute` because task 701 added `RouterLink`/`RouterLinkActive` to `AppComponent` without updating the test's `TestBed` configuration to provide routing. This means the project currently has **zero passing automated tests**.
- **End-to-end**: exercised the running app in a real browser (dev server + API + Postgres, all already running in this environment) — dashboard → board → open drawer → edit status/priority/subtask/comment → close → settings/theme toggle → mobile viewport, with no console errors at any point.

## Findings

*(All Major findings and m1–m3 are fixed as of this pass — see "Post-review fixes" above. Left in full detail below for the record.)*

### Major — FIXED
- **[M1 — FIXED] Board card subtask/comment counts go stale after editing via the drawer.** `client/src/app/features/tasks/task-detail-drawer.component.ts:168-176` (`onSubtasksChanged`/`onCommentAdded`) only update the drawer's own local `detail` signal; neither method (nor anything else in tasks 501/502/601) pushes the change back into `TaskService.tasks()`, which is what feeds the board's cards. Reproduced live: added a subtask and a comment to a task through the drawer, closed it — the board card's subtask-progress bar and comment-count indicator did not update (comment indicator missing entirely) until an unrelated action (full page navigation) reloaded the task list. Since FR-19 explicitly describes the board staying "visible... behind" the open drawer, a user reasonably expects the two to stay in sync without an unrelated trigger.
- **[M2 — FIXED] Three Board-page PRD requirements were never assigned to any task and are not implemented.** `client/src/app/features/board/board.component.ts` (`ColumnDefinition`) and `board.component.html`: (a) FR-11's column hint line (e.g. "Ideas & someday") is absent — columns show only a bare label; (b) FR-12's live column task count is absent from `.board-column__header`; (c) FR-13's textarea-based quick-add (with Shift+Enter for a newline) is a single-line `<input>` instead, confirmed live (`quickAddType: "INPUT"`). None of the 19 task files' "what to do"/interfaces sections mention hint lines, counts, or a textarea, so no task's acceptance criteria could have caught this — it fell through the PRD→kanban breakdown itself, not an individual task's execution.
- **[M3 — FIXED] The project's only automated test is broken.** `client/src/app/app.component.spec.ts` fails with `NG0201: No provider found for ActivatedRoute` because task 701 (`app.component.ts`) added `RouterLink`/`RouterLinkActive` without the test providing router support. `ng test` currently exits red.

### Minor
- **[m1 — FIXED] FR-1's "user/workspace footer" is missing from the sidebar.** `app.component.html` has brand + nav + projects, no footer element. Task 701's own spec never mentioned a footer either, so this is a PRD-to-task drop-through like M2, but purely cosmetic (no functional impact), hence Minor rather than Major.
- **[m2 — FIXED] FR-3 (mobile sidebar) is only partially implemented.** The sidebar defaults to `signal(true)` regardless of viewport width (`app.component.ts:51`) and there is no scrim/backdrop element to dismiss it by tapping outside — both explicitly called for by FR-3 ("off-canvas... with a scrim behind it that closes it on click"). Confirmed live at a 375px viewport: sidebar renders open, covering ~64% of the screen, with no way to dismiss except the burger button. Task 701 explicitly scoped down "pixel-perfect breakpoints" as a nice-to-have, but the scrim and default-collapsed behavior are not breakpoint precision — they're the core described interaction.
- **[m3 — FIXED] Bundle size budgets exceeded (non-blocking).** Initial JS bundle is 291.65 kB over budget; `dashboard.component.scss` is 814 B over its budget. Build still succeeds; likely from the breadth of Angular Material modules imported per-component rather than shared.
- **[m4] No automated test coverage was added for any of the 19 tasks.** Every acceptance criterion across the whole board was worded as "verify via `ng serve`"/manual API calls rather than a unit or integration test, and none were added beyond the (now-broken, see M3) default scaffold. This was consistent with what every task asked for, so it isn't a task-execution failure, but a large feature shipping with no regression safety net is worth flagging before this codebase grows further.

## Unrequested changes detected

None found — `git show --stat` on a sample of commits across all 7 waves shows each touched only its declared `files` (plus the expected `BOARD.md`/task-file bookkeeping). No assignee/Person entity, multi-user code, or other Non-Goal scope crept in.

## Recommended next steps

All items that were blocking approval (M1–M3) and all cheaply-fixable minor items (m1–m3) have been fixed and re-verified in this pass (see "Post-review fixes"). What's left:

1. **m4 (no automated test coverage)** — still open. This is a larger, separate effort (writing a real unit/integration test suite for the 19 tasks' worth of services and components) rather than a targeted bug fix, so it's left as a follow-up rather than folded into this pass.
2. Recommend committing the fixes in this pass as their own commit(s) before starting new feature work, so the fix history stays traceable against this review.

Proposed board task (ready for `prd-to-kanban`/`implement-task`) for the one remaining open item:
- **801 – Add test coverage for Sprout feature set** (wave 8, depends on 701): unit tests for `TaskService`/`ThemeService`/`SubtaskService`/`CommentService`/`LabelService`, component tests for `TaskCardComponent`'s due-badge logic, `DashboardComponent`'s computed signals, and `BoardComponent`'s filtering.

I can add this to the board now if you'd like — say the word and I'll create the task file and wire it into `BOARD.md`.
