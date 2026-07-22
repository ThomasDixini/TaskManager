---
id: 302
title: Frontend Column model + service
status: in-progress
wave: 3
depends_on: [201]
priority: high
estimate: S
files:
  - client/src/app/features/columns/column.model.ts
  - client/src/app/features/columns/column.service.ts
prd_refs: [FR-7, FR-9, FR-10, FR-11, FR-12]
agent_ready: true
---

# 302 – Frontend Column model + service

## Context (self-contained)

We are building the data-access layer for board columns in an Angular Kanban board app: the board's columns (Backlog, To Do, In Progress, Done, plus any the user adds) are no longer a fixed, compile-time list — they're now backed by a real API. A prior task (201, already done) implemented the Columns API:
- `GET /api/columns` → `200 OK`, `ColumnDto[]` ordered by `position`.
- `POST /api/columns` body `{ name: string }` → `201 Created`, the created column.
- `PUT /api/columns/{id}` body `{ name: string }` → `200 OK`, the renamed column. `400` if the column is a protected default.
- `DELETE /api/columns/{id}` → `204 No Content`. `400` if the column is a protected default. On success, the backend has already moved every task that was in that column to Backlog.
- `PATCH /api/columns/reorder` body `{ orderedIds: number[] }` → `200 OK`, all columns in the new order.

Each column is shaped `{ id: number, name: string, hint: string | null, position: number, isDefault: boolean }`. The base URL is available as `environment.apiBaseUrl` from `client/src/environments/environment.ts`.

**Important note for the consumers of this service (later tasks 401/402, not this one):** because `DELETE /api/columns/{id}` moves tasks to Backlog *server-side*, the frontend's separate `TaskService.tasks()` signal will go stale for any task that was in the deleted column, until something reloads the task list. This service does not attempt to fix that itself (it has no reason to depend on `TaskService`) — it's the caller's responsibility to reload tasks after a successful `delete()`, the same way `board.component.ts` already reloads tasks after a drag-and-drop move. This is called out again in task 401, which owns that responsibility.

## Interfaces you must conform to

**`client/src/app/features/columns/column.model.ts`**:
```ts
export interface Column {
  id: number;
  name: string;
  hint: string | null;
  position: number;
  isDefault: boolean;
}

/**
 * The 4 default columns' `name` is the exact machine-form string the wire
 * contract has always used ("ToDo", "InProgress") — required for backward
 * compatibility with every existing `task.column` comparison and API call.
 * This maps those specific 4 names to the friendly, spaced display labels
 * the UI has always shown ("To Do", "In Progress") — a display-only concern.
 * Custom columns have no such distinction (the user's typed name IS the
 * display label), so anything not in this map falls back to `name` itself.
 */
export function columnDisplayLabel(name: string): string {
  const knownDefaults: Record<string, string> = {
    Backlog: 'Backlog',
    ToDo: 'To Do',
    InProgress: 'In Progress',
    Done: 'Done',
  };
  return knownDefaults[name] ?? name;
}
```

**`client/src/app/features/columns/column.service.ts`** — `@Injectable({ providedIn: 'root' })` class `ColumnService`:
```ts
export class ColumnService {
  readonly columns: Signal<Column[]>;   // read-only signal, initially empty, ordered by position
  load(): void;
  create(name: string): Promise<Column>;
  rename(id: number, name: string): Promise<Column>;
  delete(id: number): Promise<void>;
  reorder(orderedIds: number[]): Promise<Column[]>;
}
```
This exact public surface is what later tasks (401 board component, 402 task detail drawer) will call — do not rename these members.

## What to do

1. Create `client/src/app/features/columns/column.model.ts` with the `Column` interface and the `columnDisplayLabel(name)` helper function, both exactly as specified.
2. Create `client/src/app/features/columns/column.service.ts`:
   - `@Injectable({ providedIn: 'root' })` class `ColumnService`.
   - Inject `HttpClient`.
   - Hold state with a writable `signal<Column[]>([])`, exposed publicly as read-only via `.asReadonly()`.
   - `load()`: `GET ${apiBaseUrl}/columns`, subscribes, sets the internal signal to the response array (already ordered by `position` per the API contract). Log errors to console on failure.
   - `create(name)`: `POST ${apiBaseUrl}/columns` with `{ name }`, via `firstValueFrom`. On success, append the created column to the internal signal (immutably) and return it.
   - `rename(id, name)`: `PUT ${apiBaseUrl}/columns/${id}` with `{ name }`, via `firstValueFrom`. On success, replace the matching entry in the internal signal (immutably, matched by `id`) and return the updated column.
   - `delete(id)`: `DELETE ${apiBaseUrl}/columns/${id}`, via `firstValueFrom`. On success, remove the matching entry from the internal signal (immutably, filtered by `id`).
   - `reorder(orderedIds)`: `PATCH ${apiBaseUrl}/columns/reorder` with `{ orderedIds }`, via `firstValueFrom`. On success, set the internal signal to the response array (the new, full, ordered list) and return it.

## Acceptance criteria

- [ ] `Column` interface matches `{ id: number, name: string, hint: string | null, position: number, isDefault: boolean }`.
- [ ] `columnDisplayLabel('ToDo')` returns `'To Do'`, `columnDisplayLabel('InProgress')` returns `'In Progress'`, `columnDisplayLabel('Backlog')` returns `'Backlog'`, `columnDisplayLabel('Done')` returns `'Done'`, and `columnDisplayLabel('Review')` (an arbitrary custom name) returns `'Review'` unchanged.
- [ ] `ColumnService.columns` is a readable signal, starting as `[]`.
- [ ] Calling `load()` (with the backend running) populates `columns()` with the 4 seeded defaults, ordered by `position`.
- [ ] `create('Review')` performs `POST /api/columns` with `{ name: 'Review' }`, resolves with the created column, and the new column appears in `columns()` afterward (verify against the live backend).
- [ ] `rename(id, 'In Review')` performs `PUT /api/columns/{id}` with `{ name: 'In Review' }`, resolves with the updated column, and `columns()` reflects the rename for that entry only.
- [ ] `delete(id)` performs `DELETE /api/columns/{id}`, and on resolution that column is no longer present in `columns()`.
- [ ] `reorder([...])` performs `PATCH /api/columns/reorder`, and on resolution `columns()` reflects the new order.
- [ ] `ng build` succeeds.

## Out of scope

- Do not build any UI/components — pure data-access service, no template. That's tasks 401/402, in a later wave.
- Do not inject or reference `TaskService` — this service has no reason to know about tasks; reloading `TaskService.tasks()` after a column delete is the consuming component's job (task 401), not this service's.
- Do not touch `client/src/app/features/tasks/`, `client/src/app/features/labels/`, or any other feature folder.
