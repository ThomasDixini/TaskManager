---
id: 103
title: Frontend BoardColumn type loosened to string
status: in-progress
wave: 1
depends_on: []
priority: medium
estimate: S
files:
  - client/src/app/features/tasks/task.model.ts
  - client/src/app/features/tasks/task.service.ts
prd_refs: [FR-9, "Technical Considerations"]
agent_ready: true
---

# 103 – Frontend `BoardColumn` type loosened to `string`

## Context (self-contained)

The backend is being converted (in a parallel task, 102, touching only backend files) from a fixed 4-value `BoardColumn` enum to a user-editable `Column` entity — meaning the board will eventually support any number of columns, not just the 4 built-in ones. This task makes the small, purely-typological frontend change that unblocks everything else: today, `BoardColumn` is a TypeScript literal union (`'Backlog' | 'ToDo' | 'InProgress' | 'Done'`), which can never represent a column name the compiler doesn't already know about. This task loosens it to plain `string`.

This is a **type-only change with no dependency on the backend work landing first** — it doesn't call any API, and every existing piece of code that currently assigns a literal like `'Backlog'` to a `BoardColumn`-typed value keeps compiling fine once the type is `string` (a string literal is always assignable to `string`). That's why this task has no `depends_on` and can run in the very first wave alongside the backend schema task.

**Current shape** (`client/src/app/features/tasks/task.model.ts`):
```ts
export type BoardColumn = 'Backlog' | 'ToDo' | 'InProgress' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface Task {
  id: number; title: string; description: string | null; projectId: number | null;
  priority: TaskPriority | null; column: BoardColumn; position: number;
  dueDate: string | null; labelIds: string[]; subtaskTotal: number; subtaskDone: number; commentCount: number;
}
// ...Subtask, Comment, TaskDetail unchanged
```

**Current relevant `TaskService` methods** (`client/src/app/features/tasks/task.service.ts`):
```ts
async create(title: string, column?: BoardColumn): Promise<Task> { ... }
async move(id: number, column: BoardColumn, position: number): Promise<Task> { ... }
```

## Interfaces you must conform to

**`client/src/app/features/tasks/task.model.ts`**:
```ts
export type BoardColumn = string;   // was a 4-value literal union — any column name is now valid
```
Everything else in this file (`TaskPriority`, `Task`, `Subtask`, `Comment`, `TaskDetail`) stays exactly as-is; `Task.column: BoardColumn` still compiles unchanged since it's still referencing the same type alias, just a wider one now.

**`client/src/app/features/tasks/task.service.ts`**: no signature changes needed — `create(title: string, column?: BoardColumn)` and `move(id: number, column: BoardColumn, position: number)` already reference the type alias, so they automatically widen along with it. Re-read the file to confirm there is nothing hardcoding one of the 4 literal values directly (as opposed to via the `BoardColumn` type) — if you find any, it's out of scope to change here (flag it in your report instead), since this task's job is the *type* change only.

This exact widened type (`BoardColumn = string`) is the contract that later tasks (401 board component, 402 task detail drawer, 403 dashboard verification) will build against — they'll assume any string can be a valid column name and validate against a live-loaded column list instead of a compile-time union.

## What to do

1. In `client/src/app/features/tasks/task.model.ts`, change `export type BoardColumn = 'Backlog' | 'ToDo' | 'InProgress' | 'Done';` to `export type BoardColumn = string;`.
2. Read `client/src/app/features/tasks/task.service.ts` to confirm no code changes are needed there beyond what the type change automatically widens (there shouldn't be any — report if you find something surprising).
3. Run `ng build` to confirm the whole app still compiles with the widened type (this exercises every existing consumer of `BoardColumn` — `board.component.ts`, `task-detail-drawer.component.ts`, `dashboard.component.ts`, `task-card.component.ts` — none of which need any code change from this task alone, since they only ever *read or compare* `task.column`, never rely on the compiler rejecting an out-of-union value).

## Acceptance criteria

- [ ] `BoardColumn` is `string` in `task.model.ts`.
- [ ] `ng build` succeeds with no new type errors anywhere in the app.
- [ ] `ng test --watch=false` still passes (existing `task.service.spec.ts` tests, which use string literals like `'ToDo'` for `column`, continue to pass unchanged).
- [ ] No other file was modified by this task beyond the two listed.

## Out of scope

- Do not change `board.component.ts`, `task-detail-drawer.component.ts`, `dashboard.component.ts`, or `task-card.component.ts` — those are owned by tasks 401/402/403 in a later wave, which will replace their hardcoded 4-column assumptions with a live-loaded column list. This task only removes the *type-level* obstacle; it does not change any component's behavior.
- Do not call any backend endpoint or add a `ColumnService` — that's tasks 201/302, in later waves.
- Do not touch `client/src/app/features/labels/` or any other feature folder.
