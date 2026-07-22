---
id: 501
title: Final integration — full regression pass + new service test coverage
status: done
wave: 5
depends_on: [401, 402, 403]
priority: high
estimate: M
files:
  - client/src/app/features/columns/column.service.spec.ts
  - client/src/app/features/labels/label.service.spec.ts
prd_refs: [FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, FR-13, FR-14]
agent_ready: true
---

# 501 – Final integration — full regression pass + new service test coverage

## Context (self-contained)

This is the final task of the board-customization effort (full label management + custom board columns), after every other task has landed. Its job is to verify the whole thing actually works end-to-end — not just each piece in isolation — and to add the test coverage for the two new frontend services that earlier tasks intentionally left for this wave (so that wave 3's tasks, which build those services, weren't blocked writing tests against UI that didn't exist yet in waves 3-4).

By this point: `LabelService` (task 202) has `create`/`update`/`delete`; `SettingsPanelComponent` (task 301) has a full Labels management UI; `ColumnService` (task 302) has `create`/`rename`/`delete`/`reorder`; `BoardComponent` (task 401) renders dynamic columns with add/rename/delete/drag-reorder; `TaskDetailDrawerComponent` (task 402) offers a dynamic Status control; `DashboardComponent` (task 403) has been verified safe under custom columns.

## Interfaces you must conform to

No new interface — this task verifies existing behavior and adds tests against already-fixed public surfaces (`LabelService`, `ColumnService`).

## What to do

1. **Backend verification**: with Postgres running (`docker compose up -d`), run `dotnet build` then `dotnet run` from `server/` and confirm the app starts cleanly against the existing dev database (which by now has been through the `AddColumnsEntity` migration from task 102) with no errors and no data loss — spot-check a few existing tasks still show their correct column via `GET /api/tasks`.
2. **Frontend build/test**: run `ng build` and `ng test --watch=false` from `client/` and confirm both are clean (no errors, no new warnings beyond whatever was already accepted in this codebase).
3. **End-to-end labels pass** (exercise via a running `ng serve` + the API, or equivalent live checks): create a label with a name and one of the 7 tones; verify it appears immediately in the drawer's label picker and on any task's card once tagged; rename and recolor it; delete it and confirm a task that had it tagged loses the tag but is not itself deleted.
4. **End-to-end columns pass**: add a new column via the board's "+ Add column"; quick-add a task into it; drag that column to a new position (e.g. between In Progress and Done) and confirm it stays there on reload; rename the column and confirm its cards still appear under the new name; delete the column and confirm its task now appears in Backlog; attempt to rename or delete one of the 4 default columns via the API directly (`PUT`/`DELETE /api/columns/{id}` for a default column's id) and confirm both return `400`.
5. **Dashboard regression check**: with a task sitting in a custom column, confirm the Dashboard's stat cards, "Today's focus" list, and weekly progress ring still report correct numbers (the custom-column task should count as open, not completed, and not as "in progress" unless it happens to literally be in the In Progress column).
6. **Full regression on everything from the original Sprout redesign**: subtasks, comments, theme/density/accent/roundness, project creation/assignment/filtering, search, drag-and-drop of cards — confirm none of these regressed. (These were all working before this effort started; this step is a safety net, not a re-implementation.)
7. Add `client/src/app/features/columns/column.service.spec.ts`: unit tests for `ColumnService` (using `provideHttpClient()`/`provideHttpClientTesting()`, matching the pattern already established in `client/src/app/features/tasks/task.service.spec.ts`) covering `create`, `rename`, `delete`, and `reorder`, each asserting the internal `columns` signal updates correctly and immutably.
8. Add `client/src/app/features/labels/label.service.spec.ts`: unit tests for `LabelService`'s `create`/`update`/`delete`, same pattern.

## Acceptance criteria

- [x] `dotnet build` and `dotnet run` (with Postgres running) both succeed with no errors against the existing dev database.
- [x] `ng build` succeeds with no errors.
- [x] `ng test --watch=false` passes, including the two new spec files added by this task, with no regressions in any pre-existing test (29/29 across 7 files).
- [x] Manually verified: label create → tag a task with it → rename/recolor it → delete it (task survives, tag is gone) — all reflected live with no stale UI anywhere.
- [x] Manually verified: column create → quick-add into it → drag-reorder it between two defaults → rename it (its cards still show) → delete it (its task now shows in Backlog) — all reflected live with no stale UI anywhere.
- [x] Manually verified: `PUT`/`DELETE` on a default column's id both return `400`.
- [x] Manually verified: Dashboard stats remain correct with a task in a custom column present.
- [x] Manually verified: no regression in subtasks, comments, personalization, projects, search, or card drag-and-drop.
- [x] `column.service.spec.ts` and `label.service.spec.ts` both exist and pass, covering every new method on their respective services.

## Out of scope

- Do not add new product functionality — this task verifies and hardens what waves 1-4 already built.
- Do not write end-to-end/integration tests spanning multiple components (e.g. a full Playwright/Cypress suite) — out of scope for this effort; unit-level coverage for the two new services plus manual end-to-end verification is sufficient here.
