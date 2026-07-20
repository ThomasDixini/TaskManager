# PRD: Kanban Board MVP (Personal Task Management)

## 1. Overview

A local, single-user kanban board for tracking everyday tasks across software projects. The user currently has no structured way to see what's in progress, what's blocked, and what's next across their projects. This MVP gives them a single board — To Do / In Progress / Done — where tasks can be quickly captured, tagged to a project, prioritized, and moved via drag-and-drop, with a lightweight Angular + ASP.NET Core + PostgreSQL stack running entirely on their own machine.

This is a personal tool, not a product for external users. The goal is a fast, low-friction MVP that can be extended later (customizable columns, multiple boards, etc.) once real usage reveals what's actually needed.

## 2. Goals

- Let the user capture a task in under 5 seconds (quick-add, title only).
- Give the user a single view of all tasks across their projects, filterable by project.
- Support the natural kanban workflow: drag a card between To Do, In Progress, and Done.
- Let the user tag each task with a project and a priority for quick visual triage.
- Run entirely locally with minimal setup (Postgres in Docker, API and frontend run directly).

## 3. Non-Goals

- No authentication / login — the app is local-only and single-user.
- No multi-user or collaboration features.
- No cloud deployment or hosting.
- No customizable columns in this iteration (fixed: To Do, In Progress, Done). Explicitly planned for a later version.
- No multiple boards or swimlanes — single board only.
- No due dates, freeform labels/tags, comments, or attachments on tasks.
- No archiving or auto-cleanup of "Done" tasks — they remain visible indefinitely in this iteration.
- No real-time sync across devices, tabs, or sessions.
- No automated tests (unit/integration/e2e) in this iteration.
- No dedicated Projects management screen — projects are created inline from the task editor.
- No priority-based auto-sorting — priority is informational only; ordering is manual via drag-and-drop.

## 4. Target Users & Use Cases

**User:** A single software developer (the app's owner) managing their own day-to-day tasks across multiple concurrent software projects.

**Use cases:**
- Quickly jot down a task the moment it comes to mind, without interrupting current work.
- See everything currently in progress or blocked at a glance.
- Filter the board down to a single project to focus on it.
- Drag a card to reflect real status as work progresses.
- Open a task to add more detail (description, project, priority) when there's time.

## 5. User Stories

- As the user, I want to type a task title and hit enter so that I can capture it instantly without breaking focus.
- As the user, I want to drag a card between columns so that the board reflects real progress.
- As the user, I want to assign a task to a project so that I can tell which codebase/effort it belongs to.
- As the user, I want to filter the board by project so that I can focus on one project's work at a time.
- As the user, I want to set a priority on a task so that I can visually identify what matters most.
- As the user, I want to create a new project on the fly while editing a task so that I never have to leave my flow to set up structure first.
- As the user, I want to edit a task's details in a modal so that I stay in the context of the board.
- As the user, I want to delete a task I no longer need so that stale or accidental cards don't clutter the board indefinitely.

## 6. Functional Requirements

1. FR-1: The system must display a single board with three fixed columns, in order: To Do, In Progress, Done.
2. FR-2: The system must allow creating a task via a quick-add input at the bottom of each column, requiring only a title; the task is created in that column with no project and no priority set.
3. FR-3: The system must allow the user to open a task (click the card) to view/edit it in a modal or side panel, without navigating away from the board.
4. FR-4: The task editor must allow editing: Title, Description, Project (dropdown of existing projects), Priority (Low / Medium / High).
5. FR-5: The task editor's Project dropdown must include an inline "add new project" option that creates a project without leaving the modal.
6. FR-6: The system must allow deleting a task from the editor, with a confirmation step before the delete is applied.
7. FR-7: The system must allow reordering and moving tasks via drag-and-drop, both within a column and across columns.
8. FR-8: Each drag-and-drop move must be persisted via a dedicated move endpoint that updates only the task's column and position (not its other fields).
9. FR-9: Task position within a column must be maintained as an integer; moving a task must reindex the affected positions in the source and/or destination column.
10. FR-10: The system must display a project filter control at the top of the board, defaulting to "All," which when set to a specific project shows only that project's tasks on the board.
11. FR-11: Each task card must visually display its title, project (if set), and priority (if set, via a color-coded badge).
12. FR-12: The system must persist all data (tasks, projects) in PostgreSQL via the API; no data lives only in the frontend.
13. FR-13: On API startup, the database schema must be brought up to date automatically via EF Core migrations (no manual migration step required in normal use).
14. FR-14: All API responses and requests must use DTOs; EF Core entities must never be serialized directly to the client.
15. FR-15: Unhandled exceptions in the API must be caught by global middleware and returned as a consistent `ProblemDetails` JSON error response.

## 7. Non-Functional Requirements

- **Environment:** Runs entirely on localhost. PostgreSQL runs in a Docker container; the ASP.NET Core API and Angular dev server run directly on the host machine (`dotnet run`, `ng serve`).
- **Configuration:** Database connection string and related config are supplied via environment variables, defined in `docker-compose.yml` / a `.env` file — no secrets committed in plaintext beyond local-only, non-sensitive defaults.
- **Performance:** Not a formal target for MVP given local single-user scale (expected dozens, not thousands, of tasks); no specific latency budget required.
- **Security:** No authentication required (local, single-user, not exposed beyond localhost). Should not be exposed to the public internet as-is.
- **Accessibility / i18n:** Not a requirement for this iteration.
- **Browser support:** Latest evergreen desktop browser (whatever the user runs locally); no cross-browser/mobile requirement for MVP.

## 8. UX / Design Notes

- **Board view:** Three columns rendered left to right (To Do, In Progress, Done). A project filter dropdown sits above the board. Each column has a quick-add input at its bottom.
- **Card:** Shows title, project badge (if set), priority badge (color-coded: e.g., green/yellow/red for Low/Medium/High). Clicking anywhere on the card opens the editor.
- **Task editor (modal/side panel):** Fields for Title, Description, Project (dropdown + inline "add new project"), Priority (select). A Delete button with a confirmation prompt. Closing the modal saves changes (or an explicit Save action — left to implementation, but must not require navigating away from the board).
- **Empty states:** A column with no tasks should show its quick-add input with no additional placeholder content required beyond that.
- **Drag-and-drop:** Cards are draggable within and across columns using Angular CDK drag-and-drop; the drop position determines the new column/position sent to the move endpoint.

## 9. Technical Considerations

**Stack**
- Frontend: Angular, Angular Material + Angular CDK (drag-and-drop), Angular Signals for state management (no NgRx, no RxJS `BehaviorSubject` pattern).
- Backend: ASP.NET Core Web API, single project (no Clean Architecture layering), controller-based endpoints.
- Database: PostgreSQL via EF Core, running in Docker.

**Repo structure**
- Single monorepo: `/client` (Angular app), `/server` (ASP.NET Core API), root-level `docker-compose.yml` (Postgres service only).

**Backend structure**
- Folders: `Controllers/`, `Entities/`, `Dtos/`, `Data/` (DbContext), `Services/` (business logic, e.g. reindexing on move).
- Endpoints: `TasksController` (CRUD + `PATCH /api/tasks/{id}/move`), `ProjectsController` (CRUD, used inline from the task editor).
- EF Core migrations applied automatically on startup via `Database.Migrate()`.
- Global exception-handling middleware producing `ProblemDetails` responses.

**Frontend structure**
- Feature-based folders: `features/board/`, `features/tasks/`, `features/projects/`, each owning its own components and signal-based services.

**Data model (initial shape)**
- `Project`: Id, Name.
- `Task`: Id, Title, Description (nullable), ProjectId (nullable FK), Priority (enum: Low/Medium/High, nullable), Column (enum: ToDo/InProgress/Done), Position (int).

**Ordering/move logic**
- Moving a task updates its `Column` and `Position`; positions of other tasks in the affected column(s) are reindexed within the same transaction to keep positions contiguous.

## 10. Success Metrics

This is a personal tool with no external adoption metrics. Success is qualitative: the user actually uses the board daily to track real work instead of falling back to no system or an ad-hoc list, and task capture/movement feels fast enough not to be annoying.

## 11. Milestones / Rollout

- **MVP (this PRD):** Single board, fixed columns, quick-add, task editor, drag-and-drop, project filter, inline project creation, no auth, no tests, local-only.
- **Later (explicitly deferred, not committed):**
  - Customizable columns (add/rename/reorder/delete).
  - Multiple boards / swimlanes per project.
  - Archiving or cleanup strategy for Done tasks.
  - Due dates and freeform labels.
  - Dedicated Projects management screen.
  - Automated tests.
  - Possible remote/multi-device access (would reintroduce the auth question).

## 12. Open Questions / Assumptions

- Assumption: "Save" behavior in the task editor (autosave on change vs. explicit Save button) is left to implementation discretion; the requirement is only that editing happens without leaving the board view.
- Assumption: Deleting a project that still has tasks assigned is not addressed in this PRD — likely just leaves those tasks with no project until decided otherwise. Flagged for a decision before implementing project deletion.
- Assumption: No task can exist without a title (required field on quick-add), but Description, Project, and Priority are all optional until the user fills them in.
- Open question: What happens when the last project is deleted while tasks still reference it — out of scope to resolve now, but should be decided before building project deletion specifically.
