---
id: 502
title: Task card component (presentational)
status: done
wave: 5
depends_on: [402]
priority: medium
estimate: S
files:
  - client/src/app/features/board/task-card.component.ts
  - client/src/app/features/board/task-card.component.html
  - client/src/app/features/board/task-card.component.scss
prd_refs: [FR-11]
agent_ready: true
---

# 502 – Task card component (presentational)

## Context (self-contained)

We are building a personal, local-only Kanban board app in Angular (standalone components, Angular Material for UI). The board (built by a later task, 601) renders three columns, each containing a list of task cards. This task builds the reusable card component itself: a small, presentational (dumb) component that displays one task's summary — title, project name (if set), and priority (if set, as a color-coded badge) — and emits an event when clicked so the parent (the board component) can open the task editor dialog.

This component does not fetch data itself and does not know about `TaskService` — it just receives a `Task` (and optionally the resolved project name) as an input and emits when clicked. Keeping it presentational-only means it can be built and visually verified in isolation before the board component (which handles data flow, drag-and-drop, and dialog-opening) exists.

**`Task` model** (`client/src/app/features/tasks/task.model.ts`, already exists):
```ts
export type BoardColumn = 'ToDo' | 'InProgress' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High';
export interface Task {
  id: number; title: string; description: string | null; projectId: number | null;
  priority: TaskPriority | null; column: BoardColumn; position: number;
}
```

## Interfaces you must conform to

- Component class name: `TaskCardComponent`, standalone, selector `app-task-card`, in `client/src/app/features/board/task-card.component.ts`.
- Inputs:
  ```ts
  @Input({ required: true }) task!: Task;
  @Input() projectName: string | null = null; // resolved by the parent (board component); null if task has no project
  ```
- Output:
  ```ts
  @Output() cardClick = new EventEmitter<Task>();
  ```
  Emit the `task` input value when the card's root element is clicked.
- Priority badge color convention (for the parent/CSS to be predictable, and for consistency if reused elsewhere): Low → green, Medium → yellow/amber, High → red. Implement via CSS classes on the badge element, e.g. `priority-low`, `priority-medium`, `priority-high`, computed from `task.priority`.

## What to do

1. Create `TaskCardComponent` as a standalone component (no external module imports needed beyond `CommonModule`/`NgIf` equivalents if using structural directives — modern Angular allows built-in control flow `@if` in templates, which is preferred if the Angular version scaffolded in task 102 supports it).
2. Template (`task-card.component.html`): render `task.title` prominently; below/beside it, render `projectName` as a small badge/chip if non-null (omit entirely if null); render a priority badge if `task.priority` is non-null (omit entirely if null), with text matching the priority level and a CSS class per the color convention above.
3. Bind a `(click)` handler on the card's root element that emits `cardClick.emit(task)`.
4. Style (`task-card.component.scss`): a card-like appearance (border/shadow, padding, rounded corners) suitable for sitting inside a column list and being draggable (no drag logic here — that's added by the board component in task 601 wrapping this component in a CDK drag item; just make sure the root element is a reasonable drag handle target, e.g. the whole card, no internal scroll traps). Priority badge colors: green/`#e6f4ea` background with dark green text for Low, amber/`#fff4e0` with dark amber text for Medium, red/`#fdecea` with dark red text for High (exact hex values are your discretion — just keep them visually distinct and legible).

## Acceptance criteria

- [x] `TaskCardComponent` renders the task's title.
- [x] When `projectName` is provided, a project badge/label showing that name is visible; when `null`, no project badge is rendered.
- [x] When `task.priority` is `'Low' | 'Medium' | 'High'`, a color-coded badge showing that priority is visible, with a distinct color per level; when `null`, no priority badge is rendered.
- [x] Clicking anywhere on the card emits `cardClick` with the `task` input value.
- [x] No compile errors; `ng build` succeeds with this component added (it doesn't need to be used anywhere yet — that's task 601's job).

## Out of scope

- Do not fetch tasks or projects, and do not inject `TaskService`/`ProjectService` — this component only receives data via `@Input`.
- Do not implement drag-and-drop here — the board component (task 601) wraps this component with Angular CDK drag-and-drop directives.
- Do not open the task editor dialog from here — this component only emits `cardClick`; the board component decides what to do with it (open `TaskEditorDialogComponent` from task 501).
- Do not touch `client/src/app/features/tasks/task-editor-dialog.component.*` (owned by task 501, running in parallel).
