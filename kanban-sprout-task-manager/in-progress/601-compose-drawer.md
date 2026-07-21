---
id: 601
title: Compose drawer (wire subtask list + comment feed)
status: in-progress
wave: 6
depends_on: [404, 501, 502]
priority: high
estimate: S
files:
  - client/src/app/features/tasks/task-detail-drawer.component.ts
  - client/src/app/features/tasks/task-detail-drawer.component.html
prd_refs: [FR-25, FR-26]
agent_ready: true
---

# 601 – Compose drawer (wire subtask list + comment feed)

## Context (self-contained)

We are finishing the task detail drawer for an Angular Kanban board app by embedding two previously-built, previously-standalone child components into it: a subtask checklist and a comment feed. The drawer shell (`TaskDetailDrawerComponent`, prior task 404) already fetches the full task detail (including `subtasks` and `comments` arrays) into a `detail` signal, and left composition slots in its template for this purpose.

**`TaskDetailDrawerComponent`** (`client/src/app/features/tasks/task-detail-drawer.component.ts`, already exists from task 404): has `readonly detail = signal<TaskDetail | null>(null)`, populated on init via `taskService.getById(data.taskId)`. Its template has marked composition points after the labels section (either `<div class="drawer-subtasks-slot">`/`<div class="drawer-comments-slot">` or comment markers — inspect the actual file to see which task 404 used).

**`SubtaskListComponent`** (`client/src/app/features/tasks/subtask-list.component.ts`, already exists from task 501), selector `app-subtask-list`:
```ts
@Input({ required: true }) taskId!: number;
@Input({ required: true }) subtasks!: Subtask[];
@Output() subtasksChanged = new EventEmitter<Subtask[]>();
```

**`CommentFeedComponent`** (`client/src/app/features/tasks/comment-feed.component.ts`, already exists from task 502), selector `app-comment-feed`:
```ts
@Input({ required: true }) taskId!: number;
@Input({ required: true }) comments!: Comment[];
@Output() commentAdded = new EventEmitter<Comment>();
```

## Interfaces you must conform to

No new public interface — this task only wires existing pieces together inside `TaskDetailDrawerComponent`. Preserve every existing input/output/behavior of `TaskDetailDrawerComponent` from task 404 (status/priority immediate-apply, batched Save, delete confirmation, close) unchanged.

## What to do

1. In `task-detail-drawer.component.ts`, import `SubtaskListComponent` and `CommentFeedComponent` and add them to the component's `imports` array.
2. In `task-detail-drawer.component.html`, replace the composition slot(s) left by task 404 with:
   ```html
   @if (detail(); as d) {
     <app-subtask-list
       [taskId]="d.id"
       [subtasks]="d.subtasks"
       (subtasksChanged)="onSubtasksChanged($event)">
     </app-subtask-list>

     <app-comment-feed
       [taskId]="d.id"
       [comments]="d.comments"
       (commentAdded)="onCommentAdded($event)">
     </app-comment-feed>
   }
   ```
3. In `task-detail-drawer.component.ts`, add handler methods:
   - `onSubtasksChanged(subtasks: Subtask[])`: updates `detail`'s `subtasks` field immutably (e.g. `this.detail.update(d => d ? { ...d, subtasks } : d)`), so the drawer's own state stays consistent if anything else in the shell reads subtask counts.
   - `onCommentAdded(comment: Comment)`: updates `detail`'s `comments` field immutably by appending the new comment (e.g. `this.detail.update(d => d ? { ...d, comments: [...d.comments, comment] } : d)`).

## Acceptance criteria

- [ ] Opening the drawer for a task with existing subtasks/comments shows both, rendered via the embedded child components (not re-fetched separately — the same `detail()` data flows down).
- [ ] Toggling a subtask inside the drawer updates immediately (via the child's own `SubtaskService` call) and the drawer's `detail().subtasks` reflects the change.
- [ ] Adding a comment inside the drawer appears immediately and the drawer's `detail().comments` reflects the addition.
- [ ] All of task 404's existing acceptance criteria (status/priority immediate-apply, batched Save for title/description/due/labels, delete confirmation, close, right-anchored panel styling) still pass — this task must not regress them.
- [ ] `ng build` succeeds.

## Out of scope

- Do not modify `SubtaskListComponent` or `CommentFeedComponent` internals — only import and use their existing public interfaces.
- Do not change the drawer's opening mechanism (`MatDialog`, `TaskDetailDrawerData`) — unaffected by this task.
- Do not wire the drawer into the board component or any route — that's task 701.
