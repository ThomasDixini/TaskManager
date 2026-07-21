---
id: 402
title: Frontend Comment model + service
status: done
wave: 4
depends_on: [302]
priority: medium
estimate: S
files:
  - client/src/app/features/tasks/comment.model.ts
  - client/src/app/features/tasks/comment.service.ts
prd_refs: [FR-26]
agent_ready: true
---

# 402 – Frontend Comment model + service

## Context (self-contained)

We are building the data-access layer for a comments/activity-feed feature in an Angular Kanban board app: a task can have zero or more comments (plain text with a timestamp), implicitly authored by the single local user (no auth/multi-user support in this app). The backend's Comments API (already implemented, prior task 302) exposes:
- `POST /api/tasks/{id}/comments` with body `{ text: string }` → `201 Created`, the created comment.

Returns a comment shaped `{ id: number, text: string, createdAt: string }` (`createdAt` is an ISO 8601 datetime string). The base URL is available as `environment.apiBaseUrl` from `client/src/environments/environment.ts`.

Note: a sibling type named `Comment` already exists in `client/src/app/features/tasks/task.model.ts` (added by an earlier task, 303) purely as part of the `TaskDetail` interface's shape. This task defines its own `Comment` type in a new file — as long as the shape matches exactly (`{ id: number, text: string, createdAt: string }`), TypeScript treats them as interchangeable (structural typing), so there's no conflict. Do not edit `task.model.ts`. Note also that TypeScript's global lib does NOT define a built-in `Comment` type that would clash (the DOM `Comment` interface represents an XML/HTML comment node and is rarely referenced directly in application code, but if your editor flags an ambiguity, ensure this interface is exported from `comment.model.ts` and imported explicitly wherever used, rather than relying on global scope).

## Interfaces you must conform to

**`client/src/app/features/tasks/comment.model.ts`**:
```ts
export interface Comment {
  id: number;
  text: string;
  createdAt: string;
}
```

**`client/src/app/features/tasks/comment.service.ts`** — `@Injectable({ providedIn: 'root' })` class `CommentService`:
```ts
export class CommentService {
  create(taskId: number, text: string): Promise<Comment>;
}
```
This service is deliberately stateless (no signal, no cached list) — the caller (a later component, `CommentFeedComponent` in task 502) owns and updates its own local list of comments based on the resolved promise. This exact public surface is what that later task will call — do not rename this member.

## What to do

1. Create `client/src/app/features/tasks/comment.model.ts` with the `Comment` interface exactly as specified, exported explicitly.
2. Create `client/src/app/features/tasks/comment.service.ts`:
   - `@Injectable({ providedIn: 'root' })` class `CommentService`.
   - Inject `HttpClient`.
   - `create(taskId, text)`: `POST ${apiBaseUrl}/tasks/${taskId}/comments` with `{ text }`, returns a `Promise<Comment>` via `firstValueFrom`.

## Acceptance criteria

- [x] `Comment` interface matches `{ id: number, text: string, createdAt: string }`.
- [x] `create(taskId, 'Looks good')` performs `POST /api/tasks/{taskId}/comments` with `{ text: 'Looks good' }` and resolves with the created comment (verify against the live backend).
- [x] `ng build` succeeds with no type ambiguity errors between this `Comment` interface and any global/DOM type.

## Out of scope

- Do not build any UI/components — pure data-access service, no template.
- Do not add `update`/`delete`/`list` methods — not part of this MVP's comments API (the full list comes from `TaskService.getById`, task 303).
- Do not touch `client/src/app/features/tasks/task.model.ts`, `task.service.ts`, or any other feature folder.
