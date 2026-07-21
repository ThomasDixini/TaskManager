---
id: 101
title: Visual restyle (Sprout tokens, light theme)
status: done
wave: 1
depends_on: []
priority: high
estimate: M
files:
  - client/src/styles.scss
  - client/src/index.html
  - client/src/app/features/board/board.component.scss
  - client/src/app/features/board/task-card.component.scss
  - client/src/app/features/tasks/task-editor-dialog.component.scss
prd_refs: [Goals, "UX / Design Notes"]
agent_ready: true
---

# 101 – Visual restyle (Sprout tokens, light theme)

## Context (self-contained)

We are redesigning the visual identity of an existing, working Angular Kanban board app (the "Kanban Board MVP") to match a new design direction called "Sprout" — a warmer, cream-and-coral look explored as a prototype on claude.ai/design. This task applies ONLY the visual styling (colors, typography, spacing, shadows, corner roundness) to the board's EXISTING structure and fields — it does not add or change any functionality, columns, or data. Dark theme, density, accent customization, and roundness customization are handled by a later task (203) — this task only establishes the light ("cream") theme's base tokens.

The app currently has: `client/src/styles.scss` (global styles), `client/src/app/features/board/board.component.*` (three-column board), `client/src/app/features/board/task-card.component.*` (task cards), `client/src/app/features/tasks/task-editor-dialog.component.*` (Angular Material dialog for editing a task). All of these currently use plain Angular Material defaults (azure-blue theme).

## Interfaces you must conform to

Define these as CSS custom properties on `:root` (or a `.tm-root`/`body` selector applied globally) in `client/src/styles.scss`, matching Sprout's light theme exactly (values taken directly from the prototype's source CSS):

```css
:root {
  --radius: 18px;
  --bg: #FBF6EE;
  --surface: #fff;
  --surface-2: #F6EFE4;
  --surface-3: #EADFCF;
  --border: #ECE2D3;
  --border-soft: #F2EADD;
  --ink: #2B2620;
  --ink-2: #726757;
  --sidebar-bg: #F2EADD;
  --tone-coral: #E8674C;
  --tone-amber: #DC9427;
  --tone-teal: #3F9E86;
  --tone-violet: #7B6CC9;
  --tone-blue: #4C87C7;
  --tone-rose: #D9556F;
  --tone-slate: #948873;
  --accent: #E8674C;
  --shadow-sm: 0 1px 2px rgba(60,45,30,.05), 0 2px 8px rgba(60,45,30,.05);
  --shadow-md: 0 4px 14px rgba(60,45,30,.09), 0 2px 6px rgba(60,45,30,.05);
  --shadow-lg: 0 18px 50px rgba(50,35,20,.16);
  --card-pad: 15px;
  --card-gap: 11px;
  --col-gap: 18px;
}
```

Fonts: "Bricolage Grotesque" (headings, weight 700-800) and "Instrument Sans" (body text), loaded from Google Fonts. Task titles, column headers, and dialog titles use Bricolage Grotesque; everything else uses Instrument Sans.

These CSS variable names (`--bg`, `--surface`, `--ink`, `--accent`, `--tone-*`, `--shadow-*`, `--radius`, etc.) are the exact contract task 203 (dark theme) extends — do not rename them.

## What to do

1. In `client/src/index.html`, add the Google Fonts `<link>` tags for "Bricolage Grotesque" (weights 500,600,700,800) and "Instrument Sans" (weights 400,500,600,700), matching the prototype's `<head>` (preconnect + stylesheet link).
2. In `client/src/styles.scss`, define the `:root` custom properties exactly as listed above, plus global resets: `box-sizing: border-box` on `*`, base `font-family: "Instrument Sans", system-ui, sans-serif`, `background: var(--bg)`, `color: var(--ink)`. Add a rule that `h1, h2, h3` use `font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; letter-spacing: -.01em`.
3. Restyle `client/src/app/features/board/board.component.scss`: column backgrounds use `color-mix(in oklab, var(--surface-2) 55%, var(--bg))`, `border: 1px solid var(--border-soft)`, `border-radius: calc(var(--radius) + 2px)`; column header title uses Bricolage Grotesque; overall board background is `var(--bg)`.
4. Restyle `client/src/app/features/board/task-card.component.scss`: card background `var(--surface)`, `border: 1px solid var(--border)`, `border-radius: var(--radius)`, `padding: var(--card-pad)`, `box-shadow: var(--shadow-sm)`, hover state `box-shadow: var(--shadow-md)` with a slight `translateY(-2px)` lift and border tinted toward `var(--accent)`. Priority/label badge colors should use the `--tone-*` variables via `color-mix(in oklab, var(--tone-X) N%, ...)` for background/text, matching the prototype's `LabelChip`/`PriorityTag` treatment (e.g. background `color-mix(in oklab, var(--tone-rose) 15%, var(--surface))`, text `color-mix(in oklab, var(--tone-rose) 68%, var(--ink))` for a rose-toned chip).
5. Restyle `client/src/app/features/tasks/task-editor-dialog.component.scss`: dialog surface `var(--surface)`, rounded corners via `var(--radius)`, primary action button background `var(--accent)` with `color: #fff` and `box-shadow: var(--shadow-sm)`.
6. Verify: `ng build` succeeds; `ng serve` + visiting the board shows the cream background, coral accent buttons, and Bricolage Grotesque headings with no console errors.

## Acceptance criteria

- [x] `client/src/index.html` loads both Google Fonts.
- [x] `client/src/styles.scss` defines all listed CSS custom properties with the exact values given, on `:root`.
- [x] The board's background, column backgrounds, and card styling visibly use the cream/coral palette (verify via `ng serve` + browser, or by inspecting computed styles).
- [x] Column and dialog titles render in Bricolage Grotesque; body text renders in Instrument Sans.
- [x] `ng build` succeeds with no errors.
- [x] No functional behavior changed — the board still has exactly the same three columns, same fields, same drag-and-drop, same quick-add, same dialog fields as before this task.

## Out of scope

- Do not add a Backlog column, dark theme, density switching, accent customization, or roundness customization — those are separate later tasks (102, 203).
- Do not change any TypeScript logic, component inputs/outputs, or templates beyond class bindings needed for styling — this is a pure CSS/SCSS + `index.html` task.
- Do not touch any backend files.
