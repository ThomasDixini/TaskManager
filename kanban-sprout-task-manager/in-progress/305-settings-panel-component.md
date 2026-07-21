---
id: 305
title: Settings panel component
status: in-progress
wave: 3
depends_on: [203]
priority: low
estimate: S
files:
  - client/src/app/features/settings/settings-panel.component.ts
  - client/src/app/features/settings/settings-panel.component.html
  - client/src/app/features/settings/settings-panel.component.scss
prd_refs: [FR-27, FR-28, FR-29, FR-30]
agent_ready: true
---

# 305 – Settings panel component

## Context (self-contained)

We are building the UI for personalizing an Angular Kanban board app: theme (light/dark), layout density, accent color, and corner roundness. A prior task (203, already done) built `ThemeService` (`client/src/app/core/theme.service.ts`), which holds the current preferences as a signal, applies them to the document (CSS variables/attributes), and persists them to `localStorage`. This task builds the visible controls for changing those preferences; a later task (701) wires this component into the app shell (e.g. behind a settings icon button in the topbar) — this task does not need to place it anywhere itself, just make it work as a standalone component.

**`ThemeService`** (`client/src/app/core/theme.service.ts`, already exists):
```ts
export type ThemeMode = 'cream' | 'dusk';
export type ThemeDensity = 'compact' | 'regular' | 'comfy';
export interface ThemePrefs { theme: ThemeMode; density: ThemeDensity; accent: string; roundness: number; }
export const ACCENT_OPTIONS: string[] = ['#E8674C', '#E0982F', '#3F9E86', '#7B6CC9', '#D06B92'];

export class ThemeService {
  readonly prefs: Signal<ThemePrefs>;
  setTheme(theme: ThemeMode): void;
  setDensity(density: ThemeDensity): void;
  setAccent(accent: string): void;
  setRoundness(roundness: number): void;
}
```

## Interfaces you must conform to

- Component class name: `SettingsPanelComponent`, standalone, selector `app-settings-panel`, in `client/src/app/features/settings/settings-panel.component.ts`. No `@Input`/`@Output` needed — it reads/writes `ThemeService` directly (injected).

## What to do

1. Create `SettingsPanelComponent` as a standalone component importing whatever Angular Material modules are needed for the controls (e.g. `MatButtonToggleModule` for theme/density segmented choices, `MatSliderModule` for roundness, plain buttons/swatches for accent color — your choice of concrete Material components, as long as the resulting UI is usable and matches the four controls below).
2. Inject `ThemeService`.
3. Template: a **Theme** control offering "Cream" / "Dusk", bound to `themeService.prefs().theme`, calling `themeService.setTheme(...)` on change. A **Density** control offering "Compact" / "Regular" / "Comfy", bound similarly via `setDensity`. An **Accent** control showing the 5 `ACCENT_OPTIONS` as clickable color swatches, highlighting the currently selected one (`themeService.prefs().accent`), calling `setAccent(...)` on click. A **Roundness** control (slider or numeric stepper) ranging 4–26 (matching the prototype's range), bound to `themeService.prefs().roundness`, calling `setRoundness(...)` on change.
4. Style (`settings-panel.component.scss`): a simple vertical stack of labeled controls with reasonable spacing — no need for elaborate design, but it should be usable as a dropdown/popover panel content (assume it will be placed inside a small container by whatever later task wires it in).

## Acceptance criteria

- [ ] The component renders four distinct controls: theme, density, accent, roundness.
- [ ] Clicking "Dusk" calls `themeService.setTheme('dusk')` and the control visually reflects the new selected state (verify `document.documentElement`'s `data-theme` attribute changes, since `ThemeService` applies it).
- [ ] Clicking each density option calls the corresponding `setDensity` value.
- [ ] Clicking an accent swatch calls `setAccent` with that swatch's hex value, and the swatch shows as selected.
- [ ] Moving the roundness control calls `setRoundness` with the new value, and `document.documentElement.style.getPropertyValue('--radius')` reflects it.
- [ ] `ng build` succeeds (the component doesn't need to be used/routed anywhere yet — that's task 701's job).

## Out of scope

- Do not modify `ThemeService` itself — only consume its existing public interface.
- Do not add this component to any route, toolbar, or app shell — that's task 701.
- Do not add any settings beyond the four listed (no font size, no custom accent color picker beyond the fixed 5-swatch palette).
