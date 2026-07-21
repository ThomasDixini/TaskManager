---
id: 403
title: Task card enhancements (labels, due, subtask progress, comments)
status: done
wave: 4
depends_on: [303]
priority: high
estimate: M
files:
  - client/src/app/features/board/task-card.component.ts
  - client/src/app/features/board/task-card.component.html
  - client/src/app/features/board/task-card.component.scss
prd_refs: [FR-16, FR-17]
agent_ready: true
---

# 403 – Task card enhancements (labels, due, subtask progress, comments)

## Context (self-contained)

We are enriching the existing task card component in an Angular Kanban board app to show the new fields introduced by the "Sprout" redesign: labels, a due-date badge, subtask progress, and a comment-count indicator — on top of what it already shows (title, project badge, priority badge). This component is presentational (no service injection) — the parent (board component, updated in a later task 701) resolves label objects and passes everything in via `@Input`, the same pattern already used for `projectName`.

The component currently looks like:
```ts
// client/src/app/features/board/task-card.component.ts
@Component({ selector: 'app-task-card', standalone: true, ... })
export class TaskCardComponent {
  @Input({ required: true }) task!: Task;
  @Input() projectName: string | null = null;
  @Output() cardClick = new EventEmitter<Task>();
  get priorityClass(): string { /* returns 'priority-low' | 'priority-medium' | 'priority-high' | '' */ }
}
```
The `Task` model (`client/src/app/features/tasks/task.model.ts`, extended by prior task 303) now includes `dueDate: string | null`, `labelIds: string[]`, `subtaskTotal: number`, `subtaskDone: number`, `commentCount: number`.

## Interfaces you must conform to

Add these new `@Input`s to `TaskCardComponent` (keep the existing `task`, `projectName`, `cardClick` unchanged):
```ts
@Input() labels: { id: string; name: string; tone: string }[] = [];
```
(The parent resolves `task.labelIds` into full `{id,name,tone}` objects via `LabelService` and passes the resolved array here — the card itself never injects `LabelService`.) The other new data (`dueDate`, `subtaskTotal`, `subtaskDone`, `commentCount`) is already available directly on the existing `task` input — no new inputs needed for those, just render from `task.dueDate` etc.

Due-date badge text/state logic (a pure function, can live as a private method or a small exported helper in this file):
- `dueDate` is `null` → render nothing.
- Parse `dueDate` ("yyyy-MM-dd") as a local date, compare to today (midnight-normalized): difference in days `diff`.
  - `diff < 0` → text `${-diff}d overdue` (or `"Yesterday"` if `diff === -1`), state `"over"`.
  - `diff === 0` → text `"Today"`, state `"today"`.
  - `diff === 1` → text `"Tomorrow"`, state `"soon"`.
  - `1 < diff <= 6` → text `"${diff}d"`, state `"soon"`.
  - `diff > 6` → text as a short formatted date (e.g. `"Aug 12"`), state `"far"`.
- `"over"`/`"today"` states get a tinted background (rose/coral respectively); `"soon"`/`"far"` render as plain text with the `--ink-2` color, no background — matching the prototype's `DueBadge` treatment described in the PRD.

## What to do

1. Add the `labels` input to `task-card.component.ts` as specified.
2. Implement the due-date badge logic (a method returning `{ text: string; state: 'over' | 'today' | 'soon' | 'far' } | null` given `task.dueDate`, or inline the logic in the template via a getter — your choice).
3. Update `task-card.component.html`:
   - Render label chips for each entry in `labels` (small pill, background/text colored via `color-mix(in oklab, var(--tone-{tone}) N%, ...)` matching the pattern established in task 101's restyle for priority badges — reuse the same CSS approach, keyed by each label's `tone` string).
   - Render the due-date badge per the logic above, when `task.dueDate` is non-null.
   - Render a subtask progress bar + fraction (e.g. "2/4") when `task.subtaskTotal > 0`, using a `<div>`-based minibar (width = `subtaskDone/subtaskTotal * 100%`) styled with `--accent`.
   - Render a small comment-count indicator (icon + number) when `task.commentCount > 0`.
4. Style (`task-card.component.scss`): add rules for the new elements (label chip row, due badge, subtask minibar, comment count), consistent with the cream/coral tokens established in task 101 (use the same `--tone-*`, `--surface`, `--ink-2` variables — do not introduce new hardcoded colors).

## Acceptance criteria

- [x] With `labels = [{id:'bug', name:'Bug', tone:'rose'}]`, the card renders a "Bug" chip tinted with the rose tone.
- [x] With `labels = []`, no label chips render.
- [x] With `task.dueDate` set to today's date (formatted "yyyy-MM-dd"), the card shows a "Today" badge with tinted background.
- [x] With `task.dueDate` set to a date 3 days from now, the card shows a "3d" badge with no tinted background.
- [x] With `task.dueDate` set to a date 2 days in the past, the card shows a "2d overdue" badge with tinted background.
- [x] With `task.dueDate === null`, no due badge renders.
- [x] With `task.subtaskTotal = 4, subtaskDone = 2`, the card shows a progress bar at 50% width and the text "2/4".
- [x] With `task.subtaskTotal = 0`, no subtask progress UI renders.
- [x] With `task.commentCount = 3`, a comment indicator showing "3" renders; with `commentCount = 0`, it doesn't.
- [x] Existing behavior (title, project badge, priority badge, `cardClick` emission) is unchanged.
- [x] `ng build` succeeds.

## Out of scope

- Do not inject `LabelService` into this component — the parent resolves and passes label objects in.
- Do not add drag-and-drop logic here — unaffected, owned by the board component.
- Do not touch `client/src/app/features/board/board.component.*` — the parent wiring (resolving `labels` from `task.labelIds`) happens in task 701.
