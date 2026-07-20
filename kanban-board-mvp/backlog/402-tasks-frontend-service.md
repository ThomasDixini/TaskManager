---
id: 402
title: Tasks frontend model + signals service
status: backlog
wave: 4
depends_on: [302]
priority: high
estimate: M
files:
  - client/src/app/features/tasks/task.model.ts
  - client/src/app/features/tasks/task.service.ts
prd_refs: [FR-2, FR-4, FR-6, FR-7, FR-8, FR-10]
agent_ready: true
---

# 402 – Tasks frontend model + signals service

## Context (self-contained)

We are building a personal, local-only Kanban board app in Angular (standalone components, Angular Signals for state — no NgRx, no RxJS `BehaviorSubject`). The backend API is an ASP.NET Core app reachable at `http://localhost:5080/api` (base URL available as `environment.apiBaseUrl` from `client/src/environments/environment.ts`, already scaffolded).

The board has three fixed columns: `ToDo`, `InProgress`, `Done`. Tasks are quick-added with just a title, later enriched (description, project, priority) via an edit modal, dragged between/reordered within columns, and deletable. This task builds the data-access layer for Tasks: a TypeScript model matching the backend's `TaskDto`, and an injectable Angular service exposing task state as signals plus methods for all task operations.

The backend's Tasks API (already implemented, in a parallel/earlier task) exposes:
- `GET /api/tasks?projectId={int}` (projectId optional) → `200 OK`, `TaskDto[]`, ordered by column then position
- `POST /api/tasks` with `{ title: string }` → `201 Created`, the created `TaskDto` (column defaults to `"ToDo"`)
- `PUT /api/tasks/{id}` with `{ title, description, projectId, priority }` → `200 OK`, updated `TaskDto` (does NOT change column/position)
- `DELETE /api/tasks/{id}` → `204 No Content`
- `PATCH /api/tasks/{id}/move` with `{ column: string, position: number }` → `200 OK`, updated `TaskDto` (changes ONLY column/position)

Where `TaskDto` is `{ id: number, title: string, description: string | null, projectId: number | null, priority: string | null, column: string, position: number }`, with `priority` one of `"Low" | "Medium" | "High" | null` and `column` one of `"ToDo" | "InProgress" | "Done"`.

## Interfaces you must conform to

**`client/src/app/features/tasks/task.model.ts`**:
```ts
export type BoardColumn = 'ToDo' | 'InProgress' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  projectId: number | null;
  priority: TaskPriority | null;
  column: BoardColumn;
  position: number;
}
```

**`client/src/app/features/tasks/task.service.ts`** — a `providedIn: 'root'` injectable class named `TaskService` exposing:
```ts
export class TaskService {
  // Read-only signal of the current list of tasks (all tasks, unfiltered — the board
  // component filters by project client-side, or by calling load(projectId)).
  readonly tasks: Signal<Task[]>;

  // Fetches tasks from the API (optionally filtered server-side by projectId) and
  // replaces `tasks` with the result.
  load(projectId?: number): void;

  // Quick-add: creates a task with only a title. Appends the created task to `tasks`.
  create(title: string): Promise<Task>;

  // Updates title/description/projectId/priority (never column/position). Updates the
  // matching entry in `tasks` in place on success.
  update(id: number, changes: { title: string; description: string | null; projectId: number | null; priority: TaskPriority | null }): Promise<Task>;

  // Deletes a task. Removes it from `tasks` on success.
  delete(id: number): Promise<void>;

  // Moves a task to a new column/position via the dedicated move endpoint. Updates
  // `tasks` to reflect the new column/position for the moved task on success.
  // (Note: this does not attempt to locally re-derive every other task's shifted
  // position — after a move, callers should re-fetch via load() if exact positions
  // of OTHER tasks matter immediately; the moved task's own updated record is enough
  // for optimistic UI in most drag-and-drop libraries, which manage local ordering
  // themselves during the drag.)
  move(id: number, column: BoardColumn, position: number): Promise<Task>;
}
```
This exact public surface is what the board component and task editor dialog (later tasks) will call — do not rename these members or change their signatures.

## What to do

1. Create `client/src/app/features/tasks/task.model.ts` with `BoardColumn`, `TaskPriority`, and `Task` exactly as specified.
2. Create `client/src/app/features/tasks/task.service.ts`:
   - `@Injectable({ providedIn: 'root' })` class `TaskService`.
   - Inject `HttpClient`.
   - Hold state with a writable `signal<Task[]>([])`, expose publicly as read-only.
   - `load(projectId?)`: `GET ${apiBaseUrl}/tasks` with an optional `?projectId=` query param when provided; sets the internal signal to the response.
   - `create(title)`: `POST ${apiBaseUrl}/tasks` with `{ title }`; on success, append the created task (immutably) and resolve with it.
   - `update(id, changes)`: `PUT ${apiBaseUrl}/tasks/${id}` with the changes body; on success, replace the matching task in the signal's array (immutably) and resolve with the updated task.
   - `delete(id)`: `DELETE ${apiBaseUrl}/tasks/${id}`; on success, remove the task from the signal's array (immutably) and resolve.
   - `move(id, column, position)`: `PATCH ${apiBaseUrl}/tasks/${id}/move` with `{ column, position }`; on success, replace the matching task in the signal's array with the updated one (immutably) and resolve with it.
   - Use `firstValueFrom` to convert HttpClient Observables to Promises for `create`/`update`/`delete`/`move`. `load` can stay subscription-based (fire-and-forget into the signal) since callers don't need to await it per the interface above.
3. Import `environment` from the appropriate relative path for `apiBaseUrl`.

## Acceptance criteria

- [ ] `Task`, `BoardColumn`, `TaskPriority` types match the shapes specified above.
- [ ] `TaskService.tasks` is a readable signal, starting as `[]`.
- [ ] `load()` (backend running) populates `tasks()` from `GET /api/tasks`; `load(5)` calls `GET /api/tasks?projectId=5`.
- [ ] `create('New task')` performs `POST /api/tasks`, and after resolving, `tasks()` includes the new task with `column: 'ToDo'`.
- [ ] `update(id, {...})` performs `PUT /api/tasks/{id}`, and after resolving, the matching entry in `tasks()` reflects the new title/description/projectId/priority.
- [ ] `delete(id)` performs `DELETE /api/tasks/{id}`, and after resolving, `tasks()` no longer contains that task.
- [ ] `move(id, 'InProgress', 0)` performs `PATCH /api/tasks/{id}/move`, and after resolving, the matching entry in `tasks()` has `column: 'InProgress'` and `position: 0`.
- [ ] No compile errors; `ng build` (or `ng serve`) succeeds with this file added.

## Out of scope

- Do not build any UI/components — this is a pure data-access service, no template.
- Do not attempt to locally reindex every other task's position after a move — that's the backend's job; the frontend just reflects what the API returns for the moved task (see note in the interface above).
- Do not touch `client/src/app/features/projects/` (owned by task 401, running in parallel) or any other feature folder.
