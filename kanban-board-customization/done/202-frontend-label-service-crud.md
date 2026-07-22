---
id: 202
title: Frontend Label service extended with create/update/delete
status: done
wave: 2
depends_on: [101]
priority: high
estimate: S
files:
  - client/src/app/features/labels/label.service.ts
prd_refs: [FR-2, FR-3, FR-4, FR-5, FR-6]
agent_ready: true
---

# 202 – Frontend Label service extended with create/update/delete

## Context (self-contained)

We are extending the Angular `LabelService` so the user can manage the label catalog (create, rename, recolor, delete) rather than only reading the fixed 7-label list it exposes today. A prior task (101, already done) extended the backend's Labels API to support this:
- `POST /api/labels` body `{ name: string, tone: string }` → `201 Created`, the created label `{ id, name, tone }`. The server generates `id` as a slug of `name`.
- `PUT /api/labels/{id}` body `{ name: string, tone: string }` → `200 OK`, the updated label (rename + recolor together; `id` itself never changes).
- `DELETE /api/labels/{id}` → `204 No Content`.

The existing `Label` model (`client/src/app/features/labels/label.model.ts`, unchanged by this task):
```ts
export interface Label {
  id: string;
  name: string;
  tone: string;
}
```

The existing `LabelService` (`client/src/app/features/labels/label.service.ts`, before this task):
```ts
@Injectable({ providedIn: 'root' })
export class LabelService {
  private readonly _labels = signal<Label[]>([]);
  readonly labels: Signal<Label[]> = this._labels.asReadonly();
  constructor(private readonly http: HttpClient) {}
  load(): void { /* GET /api/labels, sets _labels */ }
}
```
The base URL is available as `environment.apiBaseUrl` from `client/src/environments/environment.ts`.

## Interfaces you must conform to

**`client/src/app/features/labels/label.service.ts`** — `LabelService`'s public surface becomes:
```ts
export class LabelService {
  readonly labels: Signal<Label[]>;
  load(): void;
  create(name: string, tone: string): Promise<Label>;    // NEW
  update(id: string, name: string, tone: string): Promise<Label>;   // NEW
  delete(id: string): Promise<void>;    // NEW
}
```
This exact public surface is what a later task (301, the Settings panel's Labels management UI) will call — do not rename these members. Keep `labels`/`load()` behaviorally unchanged.

## What to do

1. Add `create(name, tone)`: `POST ${apiBaseUrl}/labels` with `{ name, tone }`, via `firstValueFrom`. On success, append the created label to the internal `_labels` signal (immutably) and return it.
2. Add `update(id, name, tone)`: `PUT ${apiBaseUrl}/labels/${id}` with `{ name, tone }`, via `firstValueFrom`. On success, replace the matching entry in `_labels` (immutably, matched by `id`) and return the updated label.
3. Add `delete(id)`: `DELETE ${apiBaseUrl}/labels/${id}`, via `firstValueFrom`. On success, remove the matching entry from `_labels` (immutably, filtered by `id`).

## Acceptance criteria

- [x] `create('Waiting on Client', 'amber')` performs `POST /api/labels` with `{ name: 'Waiting on Client', tone: 'amber' }`, resolves with the created label (verify against the live backend — its `id` will be a slug like `waiting-on-client`), and the new label appears in `labels()` afterward.
- [x] `update(id, 'Bugs', 'rose')` performs `PUT /api/labels/{id}` with `{ name: 'Bugs', tone: 'rose' }`, resolves with the updated label, and `labels()` reflects the rename/recolor for that entry (same `id`, new `name`/`tone`) without affecting any other label in the list.
- [x] `delete(id)` performs `DELETE /api/labels/{id}` and, on resolution, that label is no longer present in `labels()`.
- [x] `ng build` succeeds.

## Out of scope

- Do not build any UI — this is a pure data-access layer change. That's task 301, in a later wave.
- Do not touch `client/src/app/features/labels/label.model.ts` — its shape is unchanged.
- Do not touch `client/src/app/features/tasks/`, `client/src/app/features/columns/`, or any other feature folder.
