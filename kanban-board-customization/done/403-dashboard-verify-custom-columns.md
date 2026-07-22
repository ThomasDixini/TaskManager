---
id: 403
title: Dashboard — verify stats stay correct with custom columns
status: done
wave: 4
depends_on: [103]
priority: medium
estimate: S
files:
  - client/src/app/features/dashboard/dashboard.component.ts
  - client/src/app/features/dashboard/dashboard.component.spec.ts
prd_refs: [FR-14]
agent_ready: true
---

# 403 – Dashboard — verify stats stay correct with custom columns

## Context (self-contained)

The board can now have user-defined columns in addition to the four defaults (Backlog, To Do, In Progress, Done), which stay protected — their names never change. The Dashboard's stat cards, "Today's focus" list, and weekly progress ring must keep working correctly no matter how many custom columns exist: "In progress" must still mean specifically the In Progress column, "Completed"/the weekly-progress ring must still mean specifically the Done column, and "open"/active tasks must still mean "not in Done" — a task sitting in a custom column (e.g. "Review") between In Progress and Done must count as open/active, not completed, and must not be miscounted as "in progress" either.

**Current `dashboard.component.ts` logic** (already reviewed, believed correct as-is — this task's job is to *verify* that belief, not to guess):
```ts
readonly active = computed<Task[]>(() => this.taskService.tasks().filter((task) => task.column !== 'Done'));
readonly doing = computed<Task[]>(() => this.taskService.tasks().filter((task) => task.column === 'InProgress'));
readonly done = computed<Task[]>(() => this.taskService.tasks().filter((task) => task.column === 'Done'));
// todaysFocus, pct, byProject all derive from active/doing/done above, or from taskService.tasks()/projectService.projects() directly
```
These three lines compare `task.column` (a plain `string`, per a prior task 103 that widened the type from a fixed 4-value union) against the literal strings `'InProgress'`/`'Done'`. Those two specific strings remain the machine-form names of the two protected default columns (enforced server-side: a prior task, 201, rejects any attempt to rename or delete a default column) — so this comparison is expected to *already* be correct without any code change, precisely because those two names can never change out from under it. This task exists to confirm that belief explicitly with a test, and to leave the reasoning documented in the code, rather than let it be an unexamined assumption that a future change could silently break.

## Interfaces you must conform to

No new interface — this task does not change `DashboardComponent`'s public shape (selector, inputs/outputs are all unchanged). It may add code comments and one or more test cases.

## What to do

1. Re-read `dashboard.component.ts` in full and confirm there is no other place (beyond the three lines above) that assumes exactly 4 columns exist, iterates over a fixed column list, or otherwise hardcodes an assumption that would break once custom columns exist. If you find one, fix it minimally and describe the fix in your report — do not silently leave it.
2. Add a short code comment directly above the `active`/`doing`/`done` computed signals explaining why comparing against the literal strings `'InProgress'`/`'Done'` remains correct even though `BoardColumn` is now a plain `string` and the board can have arbitrarily many columns: these two names are the protected default columns' machine-form names, which the Columns API (task 201) refuses to let the user rename or delete.
3. Add or extend `client/src/app/features/dashboard/dashboard.component.spec.ts` (create it if it doesn't exist yet) with a test that constructs a task list including a task in a *custom* column (e.g. `column: 'Review'`) alongside tasks in the 4 defaults, and asserts: the custom-column task is included in `active` (open/not-done), is **not** included in `doing` (it isn't literally `'InProgress'`), and is **not** included in `done`. Use `TestBed` with `provideHttpClient()`/`provideHttpClientTesting()` (matching the pattern already established in `task.service.spec.ts`) to stand up `TaskService`/`ProjectService`, seeding `TaskService`'s internal state via its `load()` + a flushed HTTP response (or, if simpler, directly exercise the exported computed-signal logic — whichever produces the clearest, most direct test of the `active`/`doing`/`done` computations).

## Acceptance criteria

- [x] A written-out reasoning comment exists above the `active`/`doing`/`done` computed signals in `dashboard.component.ts` explaining why the literal `'InProgress'`/`'Done'` comparisons remain safe under a dynamic column list.
- [x] A new or extended test in `dashboard.component.spec.ts` demonstrates: a task in a custom column (e.g. `'Review'`) is counted as active/open, is not counted as "in progress," and is not counted as "completed."
- [x] All of Dashboard's existing behavior (greeting, stat cards, today's-focus list + one-click mark-done, weekly progress ring, per-project list) continues to work exactly as before — confirmed by re-running the existing manual verification (or existing tests, if any) alongside the new one.
- [x] `ng build` and `ng test --watch=false` both succeed.

## Out of scope

- Do not modify `client/src/app/features/board/` or `client/src/app/features/tasks/task-detail-drawer.component.ts` — those are tasks 401/402, different files, in this same wave.
- Do not add any new Dashboard feature (e.g. per-custom-column stats) — not requested; this task is verification-and-safety-net only.
