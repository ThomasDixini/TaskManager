---
id: 401
title: Projects frontend model + signals service
status: in-progress
wave: 4
depends_on: [301]
priority: high
estimate: S
files:
  - client/src/app/features/projects/project.model.ts
  - client/src/app/features/projects/project.service.ts
prd_refs: [FR-5, FR-10]
agent_ready: true
---

# 401 – Projects frontend model + signals service

## Context (self-contained)

We are building a personal, local-only Kanban board app in Angular (standalone components, Angular Signals for state — no NgRx, no RxJS `BehaviorSubject`). The backend API is an ASP.NET Core app reachable at `http://localhost:5080/api` (the base URL is available as `environment.apiBaseUrl` from `client/src/environments/environment.ts`, already scaffolded).

Projects are a lightweight entity used to tag tasks and filter the board. There is no dedicated Projects management screen in this MVP — projects are only ever listed (for a dropdown/filter) and created inline (from the task editor, in a later task). This task builds the data-access layer for Projects: a TypeScript model matching the backend's `ProjectDto`, and an injectable Angular service exposing project state as signals plus methods to load and create projects.

The backend's Projects API (already implemented, in a parallel/earlier task) exposes:
- `GET /api/projects` → `200 OK`, `ProjectDto[]`
- `POST /api/projects` with body `{ name: string }` → `201 Created`, the created `ProjectDto`

Where `ProjectDto` is `{ id: number, name: string }`.

## Interfaces you must conform to

**`client/src/app/features/projects/project.model.ts`**:
```ts
export interface Project {
  id: number;
  name: string;
}
```

**`client/src/app/features/projects/project.service.ts`** — a `providedIn: 'root'` injectable class named `ProjectService` exposing:
```ts
export class ProjectService {
  // Read-only signal of the current list of projects, initially empty.
  readonly projects: Signal<Project[]>;

  // Fetches all projects from the API and updates `projects`. Call on app/board init.
  load(): void;

  // Creates a project via POST /api/projects, appends it to `projects` on success,
  // and resolves with the created Project so callers (e.g. the task editor dropdown)
  // can immediately select it.
  create(name: string): Promise<Project>;
}
```
This exact public surface (`projects` signal, `load()`, `create(name)`) is what later tasks (the task editor dialog, the board component) will call — do not rename these members.

## What to do

1. Create `client/src/app/features/projects/project.model.ts` with the `Project` interface exactly as specified.
2. Create `client/src/app/features/projects/project.service.ts`:
   - `@Injectable({ providedIn: 'root' })` class `ProjectService`.
   - Inject `HttpClient` (from `@angular/common/http`, already available via `provideHttpClient()` in `app.config.ts`).
   - Hold state internally with a writable `signal<Project[]>([])`, expose it publicly as a read-only `Signal<Project[]>` (e.g. via `.asReadonly()`).
   - `load()`: calls `GET ${environment.apiBaseUrl}/projects`, subscribes, and sets the internal signal to the response array. Handle errors by logging to console (no retry/backoff needed for MVP).
   - `create(name: string): Promise<Project>`: calls `POST ${environment.apiBaseUrl}/projects` with `{ name }`, and on success appends the returned project to the internal signal's current value (immutably — create a new array) and resolves the returned promise with the created `Project`. Convert the `HttpClient` Observable to a Promise (e.g. via `firstValueFrom`).
3. Import `environment` from `../../../environments/environment` (adjust relative path as needed for the actual file location) for `apiBaseUrl`.

## Acceptance criteria

- [ ] `Project` interface matches `{ id: number, name: string }`.
- [ ] `ProjectService.projects` is a readable signal, starting as `[]`.
- [ ] Calling `load()` (with the backend running and reachable) populates `projects()` with the array returned by `GET /api/projects`.
- [ ] Calling `create('New Project')` performs a `POST /api/projects`, and after the returned promise resolves, `projects()` includes the newly created project alongside any previously loaded ones.
- [ ] No compile errors; `ng build` (or `ng serve`) succeeds with this file added.

## Out of scope

- Do not build any UI/components — this is a pure data-access service, no template.
- Do not implement project update or delete — not part of this MVP.
- Do not touch `client/src/app/features/tasks/` (owned by task 402, running in parallel) or any other feature folder.
