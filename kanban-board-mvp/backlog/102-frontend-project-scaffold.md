---
id: 102
title: Frontend project scaffold (Angular + Material + CDK)
status: backlog
wave: 1
depends_on: []
priority: high
estimate: M
files:
  - client/package.json
  - client/angular.json
  - client/tsconfig.json
  - client/src/app/app.config.ts
  - client/src/app/app.routes.ts
  - client/src/app/app.component.ts
  - client/src/app/app.component.html
  - client/src/app/app.component.scss
  - client/src/environments/environment.ts
  - client/src/environments/environment.development.ts
  - client/src/styles.scss
prd_refs: [Technical-Considerations, FR-1]
agent_ready: true
---

# 102 – Frontend project scaffold (Angular + Material + CDK)

## Context (self-contained)

We are building a personal, local-only Kanban board app (single user, no auth) with:
- Frontend: Angular (standalone components style), Angular Material for UI components (dialogs, buttons, form fields, badges), Angular CDK for drag-and-drop (the board's core interaction), Angular Signals for state management (no NgRx, no RxJS `BehaviorSubject` patterns).
- Backend: ASP.NET Core Web API (built in a parallel task) reachable at `http://localhost:5080/api`.
- Folder organization: feature-based — `src/app/features/board/`, `src/app/features/tasks/`, `src/app/features/projects/` (created by later tasks; this task only needs to establish the app shell and routing that will host them).

This task creates the bare Angular application skeleton: a runnable `ng serve` app with Material and CDK installed, routing configured, and the API base URL available via Angular's environment files. No feature functionality (board, tasks, projects) is built here — later tasks add those inside `features/`.

## Interfaces you must conform to

- The Angular dev server runs on the default port **`4200`** (`ng serve` default — no need to change it).
- The backend API base URL is **`http://localhost:5080/api`** (set by task 101, a parallel task — assume it will exist at that address). Expose it as `apiBaseUrl` in both `client/src/environments/environment.ts` and `client/src/environments/environment.development.ts`, e.g.:
  ```ts
  export const environment = {
    production: false, // true in environment.ts (prod), false in environment.development.ts
    apiBaseUrl: 'http://localhost:5080/api',
  };
  ```
- `app.routes.ts` must export an empty (or single placeholder) `Routes` array for now — a later task (board component) will add the real route. Just make sure the file exists with a valid, empty `export const routes: Routes = [];` so `app.config.ts` can import it without error.
- `app.config.ts` must provide: the router (`provideRouter(routes)`), Angular's `provideHttpClient()` (needed by every later task that calls the API), and Angular Material's animations provider (`provideAnimationsAsync()` or `provideAnimations()`).

## What to do

1. Create the Angular app at `client/` using the Angular CLI with standalone components (default for recent Angular versions), routing enabled, SCSS as the stylesheet format: e.g. `ng new client --routing --style=scss --standalone --skip-git`.
2. Add Angular Material: `ng add @angular/material` (choose a prebuilt theme, e.g. Indigo/Pink; enable global typography; animations set up automatically). This also pulls in Angular CDK as a dependency.
3. Explicitly ensure `@angular/cdk` is present in `package.json` dependencies (Material's schematic usually adds it; verify and add manually via `npm install @angular/cdk` if it's missing).
4. Update `client/src/environments/environment.ts` and `environment.development.ts` to include `apiBaseUrl` as specified above (create the `environments/` folder and files if the CLI version used didn't scaffold them — recent Angular CLI versions don't generate environment files by default, so create them manually if needed, and add the corresponding `fileReplacements` config in `angular.json` for the `production` build configuration).
5. Confirm/update `client/src/app/app.config.ts` to include `provideRouter(routes)`, `provideHttpClient()`, and Material's animations provider.
6. Leave `client/src/app/app.routes.ts` with an empty `routes` array (or a comment noting the board route will be added later).
7. Simplify `client/src/app/app.component.html` to just a `<router-outlet></router-outlet>` (remove the CLI's default welcome-page template).
8. Verify the app builds and serves: `npm install` then `ng serve` starts without errors and `http://localhost:4200` loads a blank page (since routes are empty) with no console errors.

## Acceptance criteria

- [ ] `npm install` succeeds inside `client/`.
- [ ] `ng serve` starts the dev server on port 4200 without build errors.
- [ ] Navigating to `http://localhost:4200` in a browser loads with no console errors (a blank page is expected since no routes/components exist yet).
- [ ] `@angular/material` and `@angular/cdk` are present in `client/package.json` dependencies.
- [ ] `client/src/environments/environment.ts` and `environment.development.ts` both export `apiBaseUrl: 'http://localhost:5080/api'`.
- [ ] `client/src/app/app.config.ts` provides router, HttpClient, and Material animations.
- [ ] `client/src/app/app.component.html` contains only a router outlet (no default CLI welcome content).

## Out of scope

- Do not create any files under `client/src/app/features/` — those belong to later tasks (401, 402, 501, 502, 601).
- Do not build the board, task cards, dialogs, or any real UI — this is scaffolding only.
- Do not touch `server/` (owned by task 101) or the root `docker-compose.yml` (owned by task 103).
