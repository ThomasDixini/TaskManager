---
id: 304
title: Frontend Label model + service
status: in-progress
wave: 3
depends_on: [202]
priority: medium
estimate: S
files:
  - client/src/app/features/labels/label.model.ts
  - client/src/app/features/labels/label.service.ts
prd_refs: [FR-16, FR-23]
agent_ready: true
---

# 304 – Frontend Label model + service

## Context (self-contained)

We are building the data-access layer for a new "labels" feature in an Angular Kanban board app: tasks can be tagged with zero or more labels from a small, fixed catalog (Design, Research, Writing, Bug, Chore, Health, Learning — each with a color "tone"). There is no create/rename/delete UI for labels in this MVP — the catalog is fixed. This task only needs to fetch and expose that catalog; later tasks (card enhancements, the detail drawer) will consume it to resolve label ids into display names/colors.

The backend's Labels API (already implemented, prior task 202) exposes:
- `GET /api/labels` → `200 OK`, `LabelDto[]`

Where `LabelDto` is `{ id: string, name: string, tone: string }`. The base URL is available as `environment.apiBaseUrl` from `client/src/environments/environment.ts` (already scaffolded, e.g. `http://localhost:5080/api`).

## Interfaces you must conform to

**`client/src/app/features/labels/label.model.ts`**:
```ts
export interface Label {
  id: string;
  name: string;
  tone: string;
}
```

**`client/src/app/features/labels/label.service.ts`** — `@Injectable({ providedIn: 'root' })` class `LabelService`:
```ts
export class LabelService {
  readonly labels: Signal<Label[]>;  // read-only signal, initially empty
  load(): void;                       // fetches the catalog, populates `labels`
}
```
This exact public surface (`labels` signal, `load()`) is what later tasks (task card enhancements, the detail drawer) will call — do not rename these members. There is deliberately no `create`/`update`/`delete` method — the catalog is fixed.

## What to do

1. Create `client/src/app/features/labels/label.model.ts` with the `Label` interface exactly as specified.
2. Create `client/src/app/features/labels/label.service.ts`:
   - `@Injectable({ providedIn: 'root' })` class `LabelService`.
   - Inject `HttpClient`.
   - Hold state with a writable `signal<Label[]>([])`, expose publicly as read-only via `.asReadonly()`.
   - `load()`: `GET ${environment.apiBaseUrl}/labels`, subscribes, sets the internal signal to the response array. Log errors to console on failure (no retry needed).

## Acceptance criteria

- [ ] `Label` interface matches `{ id: string, name: string, tone: string }`.
- [ ] `LabelService.labels` is a readable signal, starting as `[]`.
- [ ] Calling `load()` (with the backend running) populates `labels()` with all 7 catalog entries returned by `GET /api/labels`, each with correct `id`/`name`/`tone`.
- [ ] `ng build` succeeds.

## Out of scope

- Do not build any UI/components — pure data-access service, no template.
- Do not implement any create/update/delete capability for labels.
- Do not touch `client/src/app/features/tasks/` or any other feature folder.
