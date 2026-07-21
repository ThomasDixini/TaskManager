---
id: 401
title: Frontend Subtask model + service
status: done
wave: 4
depends_on: [301]
priority: high
estimate: S
files:
  - client/src/app/features/tasks/subtask.model.ts
  - client/src/app/features/tasks/subtask.service.ts
prd_refs: [FR-25]
agent_ready: true
---

# 401 – Frontend Subtask model + service

## Context (self-contained)

We are building the data-access layer for a subtasks feature in an Angular Kanban board app: a task can have zero or more subtasks (short text + a done flag), used to track partial progress. The backend's Subtasks API (already implemented, prior task 301) exposes:
- `POST /api/tasks/{id}/subtasks` with body `{ text: string }` → `201 Created`, the created subtask.
- `PATCH /api/tasks/{id}/subtasks/{subtaskId}` with body `{ done: boolean }` → `200 OK`, the updated subtask.

Both return a subtask shaped `{ id: number, text: string, done: boolean, position: number }`. The base URL is available as `environment.apiBaseUrl` from `client/src/environments/environment.ts`.

Note: a sibling type named `Subtask` already exists in `client/src/app/features/tasks/task.model.ts` (added by an earlier task, 303) purely as part of the `TaskDetail` interface's shape. This task defines its own `Subtask` type in a new file — as long as the shape matches exactly (`{ id: number, text: string, done: boolean, position: number }`), TypeScript treats them as interchangeable (structural typing), so there's no conflict. Do not edit `task.model.ts`.

## Interfaces you must conform to

**`client/src/app/features/tasks/subtask.model.ts`**:
```ts
export interface Subtask {
  id: number;
  text: string;
  done: boolean;
  position: number;
}
```

**`client/src/app/features/tasks/subtask.service.ts`** — `@Injectable({ providedIn: 'root' })` class `SubtaskService`:
```ts
export class SubtaskService {
  create(taskId: number, text: string): Promise<Subtask>;
  toggle(taskId: number, subtaskId: number, done: boolean): Promise<Subtask>;
}
```
This service is deliberately stateless (no signal, no cached list) — the caller (a later component, `SubtaskListComponent` in task 501) owns and updates its own local list of subtasks based on the resolved promises. This exact public surface is what that later task will call — do not rename these members.

## What to do

1. Create `client/src/app/features/tasks/subtask.model.ts` with the `Subtask` interface exactly as specified.
2. Create `client/src/app/features/tasks/subtask.service.ts`:
   - `@Injectable({ providedIn: 'root' })` class `SubtaskService`.
   - Inject `HttpClient`.
   - `create(taskId, text)`: `POST ${apiBaseUrl}/tasks/${taskId}/subtasks` with `{ text }`, returns a `Promise<Subtask>` via `firstValueFrom`.
   - `toggle(taskId, subtaskId, done)`: `PATCH ${apiBaseUrl}/tasks/${taskId}/subtasks/${subtaskId}` with `{ done }`, returns a `Promise<Subtask>` via `firstValueFrom`.

## Acceptance criteria

- [x] `Subtask` interface matches `{ id: number, text: string, done: boolean, position: number }`.
- [x] `create(taskId, 'Draft outline')` performs `POST /api/tasks/{taskId}/subtasks` with `{ text: 'Draft outline' }` and resolves with the created subtask (verify against the live backend).
- [x] `toggle(taskId, subtaskId, true)` performs `PATCH /api/tasks/{taskId}/subtasks/{subtaskId}` with `{ done: true }` and resolves with the updated subtask reflecting `done: true`.
- [x] `ng build` succeeds.

## Out of scope

- Do not build any UI/components — pure data-access service, no template.
- Do not add a `delete` or `reorder` method — not part of this MVP's subtask API.
- Do not touch `client/src/app/features/tasks/task.model.ts`, `task.service.ts`, or any other feature folder.
