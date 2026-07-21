---
id: 303
title: Frontend Task model + service extended
status: backlog
wave: 3
depends_on: [201]
priority: high
estimate: M
files:
  - client/src/app/features/tasks/task.model.ts
  - client/src/app/features/tasks/task.service.ts
prd_refs: [FR-13, FR-16, FR-17, FR-22, FR-23, FR-25, FR-26]
agent_ready: true
---

# 303 – Frontend Task model + service extended

## Context (self-contained)

We are extending the existing Angular `Task` model and `TaskService` to support the "Sprout" redesign's richer task fields: due dates, labels, subtask progress counts, and comment counts — plus a new method to fetch a single task's full detail (including its full subtask/comment lists) for the upcoming task-detail drawer.

The backend Tasks API is already extended (prior task 201, done) to match. `GET /api/tasks` / `GET /api/tasks?projectId=` now return items shaped:
```
{ id, title, description, projectId, priority, column, position, dueDate: string|null, labelIds: string[], subtaskTotal: number, subtaskDone: number, commentCount: number }
```
`GET /api/tasks/{id}` (new) returns a richer shape:
```
{ id, title, description, projectId, priority, column, position, dueDate: string|null, labelIds: string[], subtasks: [{id, text, done, position}], comments: [{id, text, createdAt}] }
```
`POST /api/tasks` now accepts an optional `column` field. `PUT /api/tasks/{id}` now accepts `dueDate` and `labelIds` in addition to the existing fields.

The existing `client/src/app/features/tasks/task.model.ts` and `task.service.ts` (before this task) look like:
```ts
export type BoardColumn = 'ToDo' | 'InProgress' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High';
export interface Task {
  id: number; title: string; description: string | null; projectId: number | null;
  priority: TaskPriority | null; column: BoardColumn; position: number;
}
// TaskService: tasks signal, load(projectId?), create(title), update(id, changes), delete(id), move(id, column, position)
```
Note: `BoardColumn` must also gain `'Backlog'` as a value (the backend enum was extended in task 102) — update it here.

## Interfaces you must conform to

**`client/src/app/features/tasks/task.model.ts`** (extended):
```ts
export type BoardColumn = 'Backlog' | 'ToDo' | 'InProgress' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  projectId: number | null;
  priority: TaskPriority | null;
  column: BoardColumn;
  position: number;
  dueDate: string | null;        // "yyyy-MM-dd" or null
  labelIds: string[];
  subtaskTotal: number;
  subtaskDone: number;
  commentCount: number;
}

export interface Subtask { id: number; text: string; done: boolean; position: number; }
export interface Comment { id: number; text: string; createdAt: string; }

export interface TaskDetail extends Task {
  subtasks: Subtask[];
  comments: Comment[];
}
```
(`Subtask`/`Comment` are declared here as plain shape references for `TaskDetail`; the dedicated `subtask.model.ts`/`comment.model.ts` files created by later tasks 401/402 will re-export or redeclare identical shapes for their own services — that's fine, TypeScript structural typing means both are interchangeable as long as the shape matches exactly. Do not import from files that don't exist yet.)

**`client/src/app/features/tasks/task.service.ts`** (extended) — `TaskService` public surface becomes:
```ts
export class TaskService {
  readonly tasks: Signal<Task[]>;
  load(projectId?: number): void;
  create(title: string, column?: BoardColumn): Promise<Task>;
  update(id: number, changes: { title: string; description: string | null; projectId: number | null; priority: TaskPriority | null; dueDate: string | null; labelIds: string[] }): Promise<Task>;
  delete(id: number): Promise<void>;
  move(id: number, column: BoardColumn, position: number): Promise<Task>;
  getById(id: number): Promise<TaskDetail>;   // NEW
}
```
This exact public surface is what later tasks (card enhancements, drawer, dashboard) will call — do not rename existing members, only add `getById` and extend `create`/`update`'s signatures as shown.

## What to do

1. Update `client/src/app/features/tasks/task.model.ts`: add `'Backlog'` to `BoardColumn`, add the five new `Task` fields, add `Subtask`, `Comment`, `TaskDetail` as specified.
2. Update `client/src/app/features/tasks/task.service.ts`:
   - `create(title, column?)`: `POST ${apiBaseUrl}/tasks` with `{ title, column }` (omit `column` from the body — or send `undefined` which `HttpClient`'s JSON serialization drops — when not provided, so the backend's default-to-ToDo behavior applies).
   - `update(id, changes)`: extend the existing `PUT` call's body to include `dueDate` and `labelIds` from `changes`.
   - Add `getById(id)`: `GET ${apiBaseUrl}/tasks/${id}`, returns a `Promise<TaskDetail>` via `firstValueFrom`. This method does NOT touch the `tasks` signal (it's a one-off detail fetch, not a list operation).
   - Keep `load`, `delete`, `move` behaviorally unchanged apart from the response shape now including the new fields (no code change needed there beyond the type update, since the extra fields just flow through as part of `Task`).

## Acceptance criteria

- [ ] `Task`, `BoardColumn` (now including `'Backlog'`), `Subtask`, `Comment`, `TaskDetail` types match the shapes specified above exactly.
- [ ] `create('New task')` still creates in ToDo (omitting column); `create('New idea', 'Backlog')` performs `POST /api/tasks` with `{ title: 'New idea', column: 'Backlog' }` and the resolved task's `column` is `'Backlog'` (verify against the live backend, which was extended in task 201).
- [ ] `update(id, { title, description, projectId, priority, dueDate: '2026-08-01', labelIds: ['bug'] })` performs `PUT /api/tasks/{id}` with those fields, and the resolved task reflects the new `dueDate`/`labelIds`.
- [ ] `getById(id)` performs `GET /api/tasks/{id}` and resolves with a `TaskDetail` including `subtasks` and `comments` arrays (verify against a task that has at least one subtask/comment, created via direct API calls if needed).
- [ ] `getById` does not modify `TaskService.tasks()` — the list signal is unaffected by calling it.
- [ ] `ng build` succeeds.

## Out of scope

- Do not build any UI/components — this is a pure data-access layer change.
- Do not create `client/src/app/features/tasks/subtask.model.ts`, `subtask.service.ts`, `comment.model.ts`, or `comment.service.ts` — those are tasks 401/402, in a later wave (they will define their own `Subtask`/`Comment`-shaped types independently; this task's `Task.model.ts` versions are only for `TaskDetail`'s shape).
- Do not touch `client/src/app/features/projects/`, `client/src/app/features/labels/`, or any board/card component files.
