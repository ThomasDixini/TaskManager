---
id: 502
title: Comment feed component
status: done
wave: 5
depends_on: [402]
priority: medium
estimate: S
files:
  - client/src/app/features/tasks/comment-feed.component.ts
  - client/src/app/features/tasks/comment-feed.component.html
  - client/src/app/features/tasks/comment-feed.component.scss
prd_refs: [FR-26]
agent_ready: true
---

# 502 – Comment feed component

## Context (self-contained)

We are building a small, self-contained UI component for displaying a task's comments (an activity feed with a compose box), to be embedded inside the task detail drawer (a later task, 601, composes this into `TaskDetailDrawerComponent`). This component owns adding new comments via `CommentService`, but receives its initial list via `@Input` from the parent (which already has it from `TaskService.getById`) rather than fetching it itself.

**`CommentService`** (`client/src/app/features/tasks/comment.service.ts`, already exists):
```ts
export class CommentService {
  create(taskId: number, text: string): Promise<Comment>;
}
```
**`Comment` model** (`client/src/app/features/tasks/comment.model.ts`):
```ts
export interface Comment { id: number; text: string; createdAt: string; }
```

## Interfaces you must conform to

- Component class name: `CommentFeedComponent`, standalone, selector `app-comment-feed`, in `client/src/app/features/tasks/comment-feed.component.ts`.
- Inputs/outputs:
  ```ts
  @Input({ required: true }) taskId!: number;
  @Input({ required: true }) comments!: Comment[];
  @Output() commentAdded = new EventEmitter<Comment>();
  ```
  The component maintains its own internal copy of the list (seeded from `comments` on init/change) so it can show a newly-added comment immediately; on successful add, it emits the new comment via `commentAdded` so the parent (the drawer shell) can keep its own state in sync (e.g. to update a comment-count display elsewhere).

## What to do

1. Create `CommentFeedComponent` as a standalone component (`MatInputModule`/`FormsModule` for the compose input).
2. Inject `CommentService`.
3. On `ngOnInit` (and via `ngOnChanges` if `comments` input changes after init), copy the input array into an internal signal, e.g. `readonly items = signal<Comment[]>([])`.
4. Template: render each comment as a row showing its text and a relative-ish timestamp (a simple formatted date/time from `createdAt` is sufficient — full "2h ago" relative-time formatting is a nice-to-have, not required for acceptance). Show an empty state ("No activity yet. Start the conversation.") when `items().length === 0`. Below the list, a compose input (Enter to submit) that calls `commentService.create(taskId, text)`, and on success appends the new comment to `items` (immutably), clears the input, and emits `commentAdded`.
5. Style (`comment-feed.component.scss`): compact feed rows, consistent with the cream/coral tokens from task 101.

## Acceptance criteria

- [x] Given `comments = [{id:1,text:'Nice work',createdAt:'2026-07-20T10:00:00Z'}]`, the component renders that one comment's text.
- [x] With `comments = []`, the empty-state message renders.
- [x] Typing "Thanks!" into the compose input and pressing Enter calls `commentService.create(taskId, 'Thanks!')`; on resolution, a new row appears with that text, the input clears, and `commentAdded` emits the new comment.
- [x] `ng build` succeeds (the component doesn't need to be embedded anywhere yet — that's task 601's job).

## Out of scope

- Do not fetch the initial comment list itself — it's provided via `@Input`.
- Do not implement comment editing or deletion — not part of this MVP's API.
- Do not touch `client/src/app/features/tasks/task-detail-drawer.component.*` or `client/src/app/features/tasks/subtask-list.component.*` (owned by task 501, running in parallel).
