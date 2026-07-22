---
id: 601
title: Trim/normalize Columns and Labels API input
status: done
wave: 6
depends_on: [201, 101]
priority: medium
estimate: S
files:
  - server/Controllers/ColumnsController.cs
  - server/Controllers/LabelsController.cs
prd_refs: ["REVIEW.md findings m1, m2"]
agent_ready: true
---

# 601 – Trim/normalize Columns and Labels API input

## Context (self-contained)

`REVIEW.md` (from the board-customization review pass) found two related, low-severity input-validation gaps in the Columns and Labels APIs. Neither is reachable through the shipped UI (the frontend already trims column/label names and only ever sends the 7 canonical lowercase tone values before calling these endpoints), but both are worth a defensive fix since these APIs have no auth and nothing else guarantees a well-behaved caller.

**Finding m1** (`server/Controllers/ColumnsController.cs`): `CreateColumn` (name-collision check around line 37, stored name around line 50) and `UpdateColumn` (collision check around line 80, stored name around line 86) compare `c.Name.ToLower() == request.Name.ToLower()` without trimming either side, and never trim the value before storing it. Reproduced: `POST {"name":" Review"}` and `POST {"name":"Review"}` both succeed as two distinct, visually-near-identical columns.

**Finding m2** (`server/Controllers/LabelsController.cs`): tone validation (`IsValidTone`, using `StringComparer.OrdinalIgnoreCase`) is case-insensitive, but `CreateLabel` (around line 51) and `UpdateLabel` (around line 77) store `request.Tone` exactly as provided, not normalized to its canonical lowercase form. Reproduced: `POST {"name":"CaseTest","tone":"AMBER"}` succeeds and stores `"tone":"AMBER"`, which would fail to resolve any `var(--tone-AMBER)` CSS custom property on the frontend (only lowercase `--tone-amber` is ever defined) — the label chip would render with no color if this were ever reached.

## Interfaces you must conform to

No interface/contract change — these are internal validation/normalization fixes only. Routes, request/response shapes, and status codes are all unchanged.

## What to do

1. In `server/Controllers/ColumnsController.cs`:
   - In `CreateColumn`: trim `request.Name` once into a local variable at the top of the method; use the trimmed value for both the collision check (`c.Name.ToLower() == trimmedName.ToLower()`) and when constructing the new `Column` (`Name = trimmedName`).
   - In `UpdateColumn`: same treatment — trim `request.Name` once, use it for both the collision check and the assignment to `column.Name`.
2. In `server/Controllers/LabelsController.cs`:
   - In `CreateLabel`: after validating the tone, normalize it (`request.Tone.ToLowerInvariant()`) into a local variable and use that when constructing the `Label` (instead of the raw `request.Tone`). Also trim `request.Name` before using it (for both the slug generation input and the stored `Name`), for the same defense-in-depth reason as m1, even though it wasn't explicitly called out as a separate finding — it's the same category of gap in the same file.
   - In `UpdateLabel`: same treatment — normalize tone to lowercase, trim name, before assigning to `label.Name`/`label.Tone`.

## Acceptance criteria

- [x] `POST /api/columns` with `{ "name": " Review" }` creates a column with `name: "Review"` (trimmed), not `" Review"`.
- [x] `POST /api/columns` with `{ "name": "Review" }` immediately after the above returns `400` (correctly detected as a collision now that both sides are trimmed before comparing).
- [x] `PUT /api/columns/{id}` with a padded name behaves the same way (trims before storing and before the collision check).
- [x] `POST /api/labels` with `{ "name": "  Spacey  ", "tone": "AMBER" }` creates a label with `name: "Spacey"` (trimmed) and `tone: "amber"` (lowercased) — not the raw padded/mixed-case input.
- [x] `PUT /api/labels/{id}` with similar padded/mixed-case input behaves the same way.
- [x] All pre-existing acceptance criteria for tasks 101/201 (create/rename/delete, 400s on invalid tone/collision/protected-column) still pass unchanged — re-run their original checks.
- [x] `dotnet build` succeeds.

## Out of scope

- Do not add a frontend change — the frontend already trims/sends-canonical-values; this task is backend defense-in-depth only.
- Do not change the label `Id` slug-generation logic (`Slugify`/`GenerateUniqueSlugAsync`) — already correctly trims via `value.Trim().ToLowerInvariant()`.
- Do not touch `server/Controllers/TasksController.cs` or any other file.
