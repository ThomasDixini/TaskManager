# Kanban – Sprout Task Manager

Source PRD: [../prd-sprout-task-manager.md](../prd-sprout-task-manager.md)

Assignees/multi-user (PRD Non-Goal) are excluded from this board entirely — nothing here builds a `Person` entity or real multi-user assignment.

## How to run this board with AI agents

- Tasks in the same wave are safe to run **in parallel** (one agent, session, or git worktree per task): they share no files.
- Start a wave only when every task in the previous wave is in `done/`.
- To work a task: move its file to `in-progress/`, set `status`, implement, verify acceptance criteria, move to `done/`.
- Each task is self-contained: give an agent just the task file.
- EF Core migrations are inherently sequential (each migration is generated against the prior schema snapshot), so all schema changes for this PRD are deliberately bundled into a single wave-1 task (102) rather than split across parallel tasks — splitting them would produce conflicting/unreconcilable migration files.

## Execution plan

| Wave | Tasks | Max parallel agents | What it delivers |
|------|-------|---------------------|-------------------|
| 1 | 101, 102 | 2 | Visual restyle (existing fields only); full backend schema extension (Backlog column, due date, labels, subtasks, comments) + migration |
| 2 | 201, 202, 203 | 3 | Tasks API extended (due date, labels, per-task counts, get-by-id); Labels API; frontend theme service + dark/density/accent/roundness CSS |
| 3 | 301, 302, 303, 304, 305 | 5 | Subtasks API; Comments API; frontend Task model/service extended; frontend Label model/service; Settings panel component |
| 4 | 401, 402, 403, 404, 405 | 5 | Frontend Subtask model/service; frontend Comment model/service; task card enhancements; task detail drawer shell; Dashboard component |
| 5 | 501, 502 | 2 | Subtask list component; comment feed component |
| 6 | 601 | 1 | Compose subtask list + comment feed into the drawer shell |
| 7 | 701 | 1 | Final integration: app shell (sidebar/topbar/nav/search), routing, board updates (Backlog column, card data resolution, opens drawer instead of dialog) |

19 tasks, 7 waves, max 5 parallel agents (waves 3 and 4).

## Shared interfaces

### Domain model additions (backend, task 102)

- `BoardColumn` enum extended: `Backlog, ToDo, InProgress, Done` (Backlog is new, first in display order).
- `TaskItem` gets a new field: `DueDate` (`DateOnly?`, nullable).
- New `Label` entity: `{ Id: string (PK, e.g. "design"), Name: string, Tone: string }`. Seeded with a **fixed catalog of 7** (id/name/tone): `design`/Design/coral, `research`/Research/violet, `writing`/Writing/amber, `bug`/Bug/rose, `chore`/Chore/slate, `health`/Health/teal, `learning`/Learning/blue. No create/rename/delete UI or endpoint — matches the PRD's Open Questions decision to keep the label set fixed for v1.
- `TaskItem` ↔ `Label` is many-to-many via EF Core's implicit skip-navigation (`TaskItem.Labels: ICollection<Label>`, `Label.Tasks: ICollection<TaskItem>`) — no explicit join entity class needed.
- New `Subtask` entity: `{ Id: int (PK), TaskItemId: int (FK), Text: string, Done: bool, Position: int }`.
- New `Comment` entity: `{ Id: int (PK), TaskItemId: int (FK), Text: string, CreatedAt: DateTime (UTC) }`. No author field — comments are implicitly "You" (see PRD Non-Goals on assignees).

### Backend API routes

- `GET /api/labels` → `200`, `LabelDto[]` (task 202)
- `GET /api/tasks/{id}` → `200`, `TaskDetailDto` (**new**, task 201) — used by the detail drawer to fetch full subtasks/comments.
- `GET /api/tasks?projectId={int?}` → `200`, `TaskDto[]` (extended shape, task 201)
- `POST /api/tasks` body `{ title: string, column?: BoardColumn }` → `201`, `TaskDto` (column optional, defaults `ToDo` — extended per PRD FR-13, task 201)
- `PUT /api/tasks/{id}` body `{ title, description, projectId, priority, dueDate, labelIds }` → `200`, `TaskDto` (extended, task 201; still never touches column/position)
- `DELETE /api/tasks/{id}` → `204` (unchanged)
- `PATCH /api/tasks/{id}/move` body `{ column, position }` → `200`, `TaskDto` (unchanged)
- `POST /api/tasks/{id}/subtasks` body `{ text: string }` → `201`, `SubtaskDto` (task 301)
- `PATCH /api/tasks/{id}/subtasks/{subtaskId}` body `{ done: boolean }` → `200`, `SubtaskDto` (task 301)
- `POST /api/tasks/{id}/comments` body `{ text: string }` → `201`, `CommentDto` (task 302)

`TasksController` becomes a `partial class` starting at task 201, so tasks 301/302 can add `TasksController.Subtasks.cs` / `TasksController.Comments.cs` as separate partial-class files with zero file overlap.

### DTOs

- `TaskDto`: `{ id, title, description, projectId, priority, column, position, dueDate: string|null ("yyyy-MM-dd"), labelIds: string[], subtaskTotal: number, subtaskDone: number, commentCount: number }`
- `TaskDetailDto`: `TaskDto` fields + `subtasks: SubtaskDto[]`, `comments: CommentDto[]`
- `LabelDto`: `{ id: string, name: string, tone: string }`
- `SubtaskDto`: `{ id: number, text: string, done: boolean, position: number }`
- `CommentDto`: `{ id: number, text: string, createdAt: string (ISO datetime) }`

### Frontend models & services

- `Task` model extended: `dueDate: string | null`, `labelIds: string[]`, `subtaskTotal: number`, `subtaskDone: number`, `commentCount: number` (task 303)
- `TaskDetail` (new, extends `Task`): `subtasks: Subtask[]`, `comments: Comment[]` (task 303)
- `TaskService` extended: `getById(id): Promise<TaskDetail>`; `create(title, column?)`; `update(id, changes)` now includes `dueDate`/`labelIds` (task 303)
- `Label` model + `LabelService` (`labels: Signal<Label[]>`, `load()`) (task 304)
- `Subtask` model + `SubtaskService` (`create(taskId, text)`, `toggle(taskId, subtaskId, done)`) (task 401)
- `Comment` model + `CommentService` (`create(taskId, text)`) (task 402)
- `ThemeService` (core, `providedIn: 'root'`): signals for `theme` (`'cream'|'dusk'`), `density` (`'compact'|'regular'|'comfy'`), `accent` (hex string), `roundness` (number, px); applies them as `data-theme`/`data-density` attributes + `--accent`/`--radius` CSS custom properties on `document.documentElement`; persists to `localStorage` under key `sprout-theme-prefs` (task 203)

### Components

- `TaskCardComponent` (extended, task 403): new `@Input` fields `labels: { id: string; name: string; tone: string }[]`, `dueDate: string | null`, `subtaskTotal: number`, `subtaskDone: number`, `commentCount: number` — renders label chips, due badge, subtask progress bar, comment-count indicator. Parent (board) resolves label objects/due/counts, same pattern as the existing `projectName` input.
- `TaskDetailDrawerComponent` (shell: task 404; composed with children: task 601): opened via `MatDialog.open(TaskDetailDrawerComponent, { data: { taskId } as TaskDetailDrawerData, panelClass: 'tm-detail-drawer-panel', position: { right: '0' }, height: '100%', width: 'min(520px, 100vw)' })`. Fetches its own detail via `TaskService.getById(taskId)`. Hosts `<app-subtask-list>` and `<app-comment-feed>` (wired in task 601).
- `SubtaskListComponent` (task 501), selector `app-subtask-list`: `@Input({required:true}) taskId: number`, `@Input({required:true}) subtasks: Subtask[]`, `@Output() subtasksChanged = new EventEmitter<Subtask[]>()`.
- `CommentFeedComponent` (task 502), selector `app-comment-feed`: `@Input({required:true}) taskId: number`, `@Input({required:true}) comments: Comment[]`, `@Output() commentAdded = new EventEmitter<Comment>()`.
- `DashboardComponent` (task 405), selector `app-dashboard`: stats, "today's focus", weekly progress ring, per-project list — reads `TaskService.tasks` and `ProjectService.projects` directly (no new backend endpoint).
- `SettingsPanelComponent` (task 305), selector `app-settings-panel`: theme/density/accent/roundness controls bound to `ThemeService`.

## File ownership map

| File | Owned by task |
|------|---------------|
| `client/src/styles.scss` | 101 (created base tokens), 203 (dark/density/accent/roundness additions) |
| `client/src/index.html` | 101 |
| `client/src/app/features/board/board.component.*` | 101 (restyle only), 403 (skipped — card only), 701 (Backlog column, data resolution, opens drawer) |
| `client/src/app/features/board/task-card.component.*` | 101 (restyle only), 403 (new inputs + rendering) |
| `client/src/app/features/tasks/task-editor-dialog.component.*` | 101 (restyle only) — component itself remains until replaced by the drawer in 701 |
| `server/Entities/Enums.cs` | 102 |
| `server/Entities/TaskItem.cs` | 102 |
| `server/Entities/Label.cs` | 102 |
| `server/Entities/Subtask.cs` | 102 |
| `server/Entities/Comment.cs` | 102 |
| `server/Data/AppDbContext.cs` | 102 |
| `server/Migrations/**` | 102 |
| `server/Controllers/TasksController.cs` | 201 (extended + made `partial`) |
| `server/Dtos/TaskDto.cs` | 201 |
| `server/Dtos/CreateTaskRequest.cs` | 201 |
| `server/Dtos/UpdateTaskRequest.cs` | 201 |
| `server/Dtos/TaskDetailDto.cs` | 201 |
| `server/Controllers/LabelsController.cs` | 202 |
| `server/Dtos/LabelDto.cs` | 202 |
| `client/src/app/core/theme.service.ts` | 203 |
| `server/Controllers/TasksController.Subtasks.cs` | 301 |
| `server/Dtos/SubtaskDto.cs` | 301 |
| `server/Dtos/CreateSubtaskRequest.cs` | 301 |
| `server/Dtos/ToggleSubtaskRequest.cs` | 301 |
| `server/Controllers/TasksController.Comments.cs` | 302 |
| `server/Dtos/CommentDto.cs` | 302 |
| `server/Dtos/CreateCommentRequest.cs` | 302 |
| `client/src/app/features/tasks/task.model.ts` | 303 |
| `client/src/app/features/tasks/task.service.ts` | 303 |
| `client/src/app/features/labels/label.model.ts` | 304 |
| `client/src/app/features/labels/label.service.ts` | 304 |
| `client/src/app/features/settings/settings-panel.component.*` | 305 |
| `client/src/app/features/tasks/subtask.model.ts` | 401 |
| `client/src/app/features/tasks/subtask.service.ts` | 401 |
| `client/src/app/features/tasks/comment.model.ts` | 402 |
| `client/src/app/features/tasks/comment.service.ts` | 402 |
| `client/src/app/features/tasks/task-detail-drawer.component.*` | 404 (shell), 601 (compose children) |
| `client/src/app/features/dashboard/dashboard.component.*` | 405 |
| `client/src/app/features/tasks/subtask-list.component.*` | 501 |
| `client/src/app/features/tasks/comment-feed.component.*` | 502 |
| `client/src/app/app.component.*` | 701 |
| `client/src/app/app.routes.ts` | 701 |

## Backlog

| ID | Wave | Task | Priority | Estimate | Depends on |
|----|------|------|----------|----------|------------|
| ~~101~~ | 1 | ~~Visual restyle (Sprout tokens, light theme)~~ | high | M | – |
| ~~102~~ | 1 | ~~Backend schema extension (Backlog column, due date, labels, subtasks, comments)~~ | high | M | – |
| ~~201~~ | 2 | ~~Tasks API extended (due date, labels, counts, get-by-id)~~ | high | M | 102 |
| ~~202~~ | 2 | ~~Labels API~~ | medium | S | 102 |
| ~~203~~ | 2 | ~~Frontend theme service + dark/density/accent/roundness CSS~~ | medium | M | 101 |
| ~~301~~ | 3 | ~~Subtasks API~~ | high | S | 102, 201 |
| ~~302~~ | 3 | ~~Comments API~~ | medium | S | 102, 201 |
| ~~303~~ | 3 | ~~Frontend Task model + service extended~~ | high | M | 201 |
| ~~304~~ | 3 | ~~Frontend Label model + service~~ | medium | S | 202 |
| ~~305~~ | 3 | ~~Settings panel component~~ | low | S | 203 |
| ~~401~~ | 4 | ~~Frontend Subtask model + service~~ | high | S | 301 |
| ~~402~~ | 4 | ~~Frontend Comment model + service~~ | medium | S | 302 |
| ~~403~~ | 4 | ~~Task card enhancements (labels, due, subtask progress, comments)~~ | high | M | 303 |
| ~~404~~ | 4 | ~~Task detail drawer shell~~ | high | M | 303, 304 |
| ~~405~~ | 4 | ~~Dashboard component~~ | high | M | 303 |
| ~~501~~ | 5 | ~~Subtask list component~~ | high | S | 401 |
| ~~502~~ | 5 | ~~Comment feed component~~ | medium | S | 402 |
| 601 | 6 | Compose drawer (wire subtask list + comment feed) | high | S | 404, 501, 502 |
| 701 | 7 | Final integration (app shell, routing, board updates) | high | M | 601, 403, 405, 305 |

## In progress

_(empty)_

## Done

| ID | Wave | Task |
|----|------|------|
| 101 | 1 | Visual restyle |
| 102 | 1 | Backend schema extension |
| 201 | 2 | Tasks API extended |
| 202 | 2 | Labels API |
| 203 | 2 | Frontend theme service |
| 301 | 3 | Subtasks API |
| 302 | 3 | Comments API |
| 303 | 3 | Frontend Task model + service extended |
| 304 | 3 | Frontend Label model + service |
| 305 | 3 | Settings panel component |
| 401 | 4 | Frontend Subtask model + service |
| 402 | 4 | Frontend Comment model + service |
| 403 | 4 | Task card enhancements |
| 404 | 4 | Task detail drawer shell |
| 405 | 4 | Dashboard component |
| 501 | 5 | Subtask list component |
| 502 | 5 | Comment feed component |
