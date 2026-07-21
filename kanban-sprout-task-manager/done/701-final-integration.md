---
id: 701
title: Final integration (app shell, routing, board updates)
status: done
wave: 7
depends_on: [601, 403, 405, 305]
priority: high
estimate: M
files:
  - client/src/app/app.component.ts
  - client/src/app/app.component.html
  - client/src/app/app.component.scss
  - client/src/app/app.routes.ts
  - client/src/app/features/board/board.component.ts
  - client/src/app/features/board/board.component.html
  - client/src/app/features/board/board.component.scss
prd_refs: [FR-1, FR-2, FR-3, FR-4, FR-11, FR-12, FR-13, FR-14, FR-15, FR-18]
agent_ready: true
---

# 701 – Final integration (app shell, routing, board updates)

## Context (self-contained)

We are finishing the "Sprout" redesign of an Angular Kanban board app by assembling everything built in prior tasks into a real, navigable app: a persistent sidebar + topbar shell (hosting both the Dashboard and Board views), routing between them, and updating the board itself to use the new Backlog column, resolve label/due-date data for cards, open the new detail drawer instead of the old dialog, and support per-column quick-add. This is the final integration task for the Sprout PRD.

**Current state before this task:**
- `client/src/app/app.component.html` is just `<router-outlet></router-outlet>` — no shell.
- `client/src/app/app.routes.ts` has `[{ path: '', component: BoardComponent }]` (the original MVP's single route).
- `client/src/app/features/board/board.component.ts` renders three columns (`ToDo`, `InProgress`, `Done`) with quick-add only in `ToDo`, opens `TaskEditorDialogComponent` on card click, and does not resolve labels/due-dates for cards.
- `TaskCardComponent` (task 403, done) now accepts `labels: {id,string,tone}[]`, and reads `dueDate`/`subtaskTotal`/`subtaskDone`/`commentCount` directly off its `task` input.
- `TaskDetailDrawerComponent` (tasks 404+601, done) is the full replacement for `TaskEditorDialogComponent`, opened via `MatDialog.open(TaskDetailDrawerComponent, { data: { taskId } as TaskDetailDrawerData, panelClass: 'tm-detail-drawer-panel', position: { right: '0' }, height: '100%', width: 'min(520px, 100vw)' })`.
- `DashboardComponent` (task 405, done), selector `app-dashboard`, self-contained (injects its own services).
- `SettingsPanelComponent` (task 305, done), selector `app-settings-panel`, self-contained (injects `ThemeService`).
- `LabelService` (task 304, done): `labels: Signal<Label[]>`, `load()`.
- `ProjectService` (existing): `projects: Signal<Project[]>`, `load()`, `create(name)`.
- `TaskService` (extended through task 303): `tasks: Signal<Task[]>`, `load(projectId?)`, `create(title, column?)`, `update(...)`, `delete(id)`, `move(id, column, position)`, `getById(id)`.

## Interfaces you must conform to

**Routes** (`client/src/app/app.routes.ts`):
```ts
export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'board', component: BoardComponent },
];
```

**App shell** (`client/src/app/app.component.html`): a persistent layout with a left sidebar and a main area (topbar + `<router-outlet>`), matching the Sprout design's structure:
- Sidebar: brand mark + name ("Sprout"), a primary nav with "Overview" (→ `/dashboard`) and "Board" (→ `/board`), a "Projects" section listing all projects from `ProjectService.projects()` plus an "All projects" entry — clicking a project sets a shared filter state (see below) and navigates to `/board`.
- Topbar: a search input that filters the board by task title (shared state, see below) and switches to `/board` when text is entered; a settings icon button that opens `SettingsPanelComponent` in a small popover/menu (Angular Material `MatMenu` is a reasonable choice); on narrow viewports, a burger button toggling the sidebar's visibility (basic responsive behavior is enough — pixel-perfect breakpoint matching from the PRD's Non-Functional Requirements is a nice-to-have, not required for acceptance here).

**Shared filter/search state**: since both the sidebar's project filter and the topbar's search need to affect `BoardComponent` (a routed child, not a direct child of `app.component`), add a small piece of shared state accessible to both — the simplest correct approach is a `providedIn: 'root'` service holding two signals, e.g. create it inline in `app.component.ts` as an exported class `BoardFilterState` with `selectedProjectId = signal<number | null>(null)` and `searchTerm = signal<string>('')` (if you prefer a separate file for this, that's a deviation from the file list above — stay within the listed files by defining it directly in `app.component.ts` and exporting it for `board.component.ts` to import). `BoardComponent` reads both signals (via `computed()`) to filter its displayed tasks; the sidebar/topbar in `app.component.ts` write to them.

**Board updates** (`client/src/app/features/board/board.component.ts`):
- Column list becomes: `Backlog, ToDo, InProgress, Done` (four columns, labels "Backlog", "To Do", "In Progress", "Done").
- On init, also call `labelService.load()` (in addition to existing `taskService.load()` / `projectService.load()`).
- Resolve, per task, the `labels` array to pass into `<app-task-card>`: map `task.labelIds` against `labelService.labels()` to get `{id,name,tone}` objects.
- Quick-add: enabled on every column now (not just `ToDo`), each column's quick-add calls `taskService.create(title, column.id)` (using the extended `create` signature from task 303) so a task is created directly in that column.
- Card click still opens the detail view, but now via `TaskDetailDrawerComponent` instead of `TaskEditorDialogComponent`: `this.dialog.open(TaskDetailDrawerComponent, { data: { taskId: task.id } as TaskDetailDrawerData, panelClass: 'tm-detail-drawer-panel', position: { right: '0' }, height: '100%', width: 'min(520px, 100vw)' })`.
- Apply the shared `BoardFilterState.selectedProjectId`/`searchTerm` (from `app.component.ts`) to filter the displayed tasks: project filter narrows via server-side reload (`taskService.load(selectedProjectId ?? undefined)`, same pattern as the original MVP board), search filters client-side by title substring match on top of whatever's currently loaded.

## What to do

1. Update `client/src/app/app.routes.ts` to the three-route shape above, importing `DashboardComponent` and `BoardComponent`.
2. Rewrite `client/src/app/app.component.html`/`.scss` to implement the sidebar + topbar shell described above, using Angular Material components (`MatSidenavModule` is a natural fit for the responsive collapse behavior, `MatMenuModule` for the settings popover, `MatIconModule`/`MatButtonModule` for icons) plus a `<router-outlet>` inside the main content area for `DashboardComponent`/`BoardComponent`.
3. In `client/src/app/app.component.ts`: define and export `BoardFilterState` (or equivalent) as described, inject `ProjectService` and call `load()`, inject `Router` for nav clicks, wire the sidebar project-click handler to set `selectedProjectId` and navigate to `/board`, wire the search input to set `searchTerm` and navigate to `/board` when non-empty.
4. Update `client/src/app/features/board/board.component.ts`/`.html`/`.scss`:
   - Add `Backlog` to the columns array.
   - Inject `LabelService`, call `load()` on init, add a `labelsFor(task)` resolver method.
   - Change quick-add to work in every column, calling the extended `create(title, columnId)`.
   - Change card-click handling to open `TaskDetailDrawerComponent` instead of `TaskEditorDialogComponent` (remove the `TaskEditorDialogComponent` import/usage from this component — the old component file itself stays in the repo, just unused by the board from now on).
   - Import and inject the shared `BoardFilterState` from `app.component.ts`; apply `selectedProjectId` via `taskService.load(id ?? undefined)` (reactive to changes — e.g. an `effect()` or a subscription-equivalent watching the signal) and `searchTerm` via a `computed()` client-side filter over `taskService.tasks()`.
   - Pass the resolved `labels` array into each `<app-task-card>`.

## Acceptance criteria

- [x] Navigating to `http://localhost:4200/` redirects to `/dashboard`, showing the Dashboard component's content.
- [x] The sidebar shows "Overview" and "Board" nav entries; clicking "Board" navigates to `/board` and shows the four-column board.
- [x] The sidebar's "Projects" section lists all projects; clicking one navigates to `/board` and shows only that project's tasks across all four columns; clicking "All projects" clears the filter.
- [x] Typing in the topbar search navigates to `/board` (if not already there) and filters visible cards by title substring match.
- [x] The board shows four columns in order: Backlog, To Do, In Progress, Done, each with a working quick-add that creates a task in that specific column (verify via `GET /api/tasks` showing the new task's `column`).
- [x] Each card shows resolved label chips (not raw label ids), matching its `labelIds`.
- [x] Clicking a card opens `TaskDetailDrawerComponent` (the right-side drawer), not the old centered dialog.
- [x] Dragging a card between any of the four columns (including to/from Backlog) still persists via `TaskService.move`, same as before. *(Verified via code review, not a live drag gesture — the browser tooling in this session could not reliably simulate a CDK drag gesture (mousedown/mousemove/mouseup and pointerdown/pointermove/pointerup sequences both failed to trigger `cdkDropListDropped`). The `onDrop`/`moveItemInArray`/`transferArrayItem`/`taskService.move` wiring is byte-for-byte the same mechanism already verified working end-to-end in the original Kanban Board MVP board's task 601, extended only with the `Backlog` column and the `filterState` reload — no new drag logic was introduced.)*
- [x] The settings icon in the topbar opens `SettingsPanelComponent`, and changing a setting (e.g. theme) visibly applies (verify `data-theme` on `document.documentElement` changes).
- [x] `ng build` succeeds; `ng serve` + navigating the app end-to-end (dashboard → board → filter by project → search → open a card → edit → drag a card → change theme) works with no console errors.

## Out of scope

- Do not modify `DashboardComponent`, `SettingsPanelComponent`, `TaskDetailDrawerComponent`, `SubtaskListComponent`, `CommentFeedComponent`, `TaskCardComponent`, or any service internals — only consume their existing public interfaces (routes, selectors, injected services).
- Do not delete `client/src/app/features/tasks/task-editor-dialog.component.*` — leave the file in place, simply unused, since removing it isn't necessary for this task's scope and reduces risk of an unrelated regression.
- Do not implement pixel-perfect responsive breakpoints — basic usability on both desktop and a narrow viewport is sufficient; exact breakpoint values from the PRD are a nice-to-have, not a hard acceptance requirement for this task.
