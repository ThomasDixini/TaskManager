---
id: 405
title: Dashboard component
status: done
wave: 4
depends_on: [303]
priority: high
estimate: M
files:
  - client/src/app/features/dashboard/dashboard.component.ts
  - client/src/app/features/dashboard/dashboard.component.html
  - client/src/app/features/dashboard/dashboard.component.scss
prd_refs: [FR-5, FR-6, FR-7, FR-8, FR-9, FR-10]
agent_ready: true
---

# 405 – Dashboard component

## Context (self-contained)

We are building a new "Overview" / Dashboard page for an Angular Kanban board app, per the "Sprout" redesign — a landing view showing a greeting, key stats, today's due tasks, overall weekly progress, and per-project progress. It reads entirely from existing frontend state (`TaskService.tasks`, `ProjectService.projects`) — no new backend endpoint is needed; all aggregation happens client-side. This task builds the component in isolation; a later task (701) adds the route and sidebar nav entry that makes it reachable.

**`TaskService`** (`client/src/app/features/tasks/task.service.ts`, already exists):
```ts
export class TaskService {
  readonly tasks: Signal<Task[]>;
  load(projectId?: number): void;
  // ...create/update/delete/move/getById, not needed here except load()
}
```
**`Task` model** (`client/src/app/features/tasks/task.model.ts`):
```ts
export type BoardColumn = 'Backlog' | 'ToDo' | 'InProgress' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High';
export interface Task {
  id: number; title: string; description: string | null; projectId: number | null;
  priority: TaskPriority | null; column: BoardColumn; position: number;
  dueDate: string | null; labelIds: string[]; subtaskTotal: number; subtaskDone: number; commentCount: number;
}
```
**`ProjectService`** (`client/src/app/features/projects/project.service.ts`, already exists):
```ts
export class ProjectService {
  readonly projects: Signal<Project[]>;   // { id: number; name: string }
  load(): void;
}
```

## Interfaces you must conform to

- Component class name: `DashboardComponent`, standalone, selector `app-dashboard`, in `client/src/app/features/dashboard/dashboard.component.ts`.
- No `@Input`/`@Output` needed — it injects `TaskService` and `ProjectService` directly and calls `load()` on both in `ngOnInit` (safe to call even if already loaded elsewhere).
- Emits nothing to navigate — a later task (701) wires an "Open board" button/link inside this component's template to navigate via `Router`; for THIS task, inject `Router` and navigate to `/board` directly (the route is assumed to exist by then — if it doesn't yet when this task is tested in isolation, this is fine, `Router.navigate` will simply no-op/log a dev warning until 701 adds the route; do not let this block completing this task).

## What to do

1. Create `DashboardComponent` as a standalone component. Compute, via `computed()` signals derived from `taskService.tasks()`:
   - `active`: tasks where `column !== 'Done'`.
   - `doing`: tasks where `column === 'InProgress'`.
   - `done`: tasks where `column === 'Done'`.
   - `today`: tasks in `active` whose `dueDate` is today or in the past (reuse/reimplement the due-date-state logic described in task 403 — "over" or "today" state), sorted by `dueDate` ascending.
   - `pct`: `done.length / tasks.length` (0 if no tasks).
   - `byProject`: for each project in `projectService.projects()`, the count of its tasks and how many are done, filtered to projects with at least one task.
2. Template sections, matching the PRD's FRs:
   - **Greeting header** (FR-5): time-of-day-aware greeting ("Good morning"/"Good afternoon"/"Good evening" based on `new Date().getHours()`) plus today's formatted date, and an "Open board" button navigating to `/board`.
   - **Stat cards** (FR-6): four cards — Open tasks (`active.length`), Due today (`today.length`), In progress (`doing.length`), Completed (`done.length`).
   - **Today's focus list** (FR-7, FR-8): list of `today()` tasks, each showing priority and due badge (reuse the due-badge presentation approach from task 403 if convenient, or a simplified inline version — consistency with the card's due badge is preferred but not required for this task to pass); a checkbox/button that marks the task Done by calling `taskService.move(task.id, 'Done', 0)`; an empty state ("Nothing due today — enjoy the breathing room.") when `today().length === 0`.
   - **Weekly progress ring** (FR-9): an SVG ring showing `pct()` as a percentage, with the raw `done.length / tasks.length` count beneath it (an SVG `<circle>` with `stroke-dasharray`/`stroke-dashoffset` driven by `pct()` is sufficient — matching the prototype's `ProgressRing` approach).
   - **Per-project list** (FR-10): each project in `byProject()` showing its name, a mini progress bar (`done/total` width), and a `done/total` count.
3. Style (`dashboard.component.scss`): a scrollable page container, stat cards in a responsive grid (4 columns desktop, collapsing per the breakpoints noted in the PRD's Non-Functional Requirements if you want to address responsiveness now — not required for this task's acceptance criteria, but don't actively break it), consistent with the cream/coral tokens from task 101.

## Acceptance criteria

- [x] The greeting text changes appropriately based on time of day (verify by checking the computed greeting logic covers morning/afternoon/evening correctly, e.g. via a quick manual check or a throwaway spec you delete afterward).
- [x] With N active, M in-progress, K done tasks, the four stat cards show `N`, `<count due today>`, `M`, `K` respectively.
- [x] A task with today's date as `dueDate` and `column !== 'Done'` appears in "Today's focus"; a task with a past `dueDate` also appears (marked overdue); a task with a future `dueDate` does not.
- [x] Clicking the "mark done" affordance on a Today's-focus row calls `taskService.move(id, 'Done', 0)` and the task disappears from the list on the next reactive update (since it's no longer `column !== 'Done'`).
- [x] With zero tasks due today, the empty-state message renders.
- [x] The progress ring's displayed percentage matches `done.length / tasks.length` (rounded), and updates reactively when tasks change.
- [x] The per-project list shows one row per project that has at least one task, with a correct `done/total` count and proportional mini progress bar; projects with zero tasks are omitted.
- [x] `ng build` succeeds (the component doesn't need to be routed yet — that's task 701's job).

## Out of scope

- Do not add a new backend endpoint for dashboard aggregation — all computed client-side from already-loaded `tasks`/`projects` signals.
- Do not add the route or sidebar nav entry — that's task 701.
- Do not touch `client/src/app/features/board/`, `client/src/app/features/tasks/`, or `client/src/app/features/projects/` service/model files (read-only consumption via their existing public interfaces).
