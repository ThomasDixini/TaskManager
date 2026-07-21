---
id: 203
title: Frontend theme service + dark/density/accent/roundness CSS
status: backlog
wave: 2
depends_on: [101]
priority: medium
estimate: M
files:
  - client/src/app/core/theme.service.ts
  - client/src/styles.scss
prd_refs: [FR-27, FR-28, FR-29, FR-30, FR-31]
agent_ready: true
---

# 203 – Frontend theme service + dark/density/accent/roundness CSS

## Context (self-contained)

We are adding personalization to an Angular Kanban board app that was just restyled (prior task 101) with a light "cream" theme driven by CSS custom properties on `:root` (`--bg`, `--surface`, `--ink`, `--accent`, `--tone-*`, `--shadow-*`, `--radius`, `--card-pad`, `--card-gap`, `--col-gap`, etc. — see `client/src/styles.scss`, already populated by task 101; do not redefine the base light-theme values, only add to the file). This task adds: a dark theme variant, three density variants, a choosable accent color, an adjustable corner-roundness value, and a service that applies and persists these choices.

The design source (Sprout prototype) drives theme/density via a `data-theme`/`data-density` attribute on the app's root element, and accent/roundness via inline CSS custom properties on that same element — this task reproduces that mechanism in Angular.

## Interfaces you must conform to

**`client/src/app/core/theme.service.ts`** — `@Injectable({ providedIn: 'root' })` class `ThemeService`:
```ts
export type ThemeMode = 'cream' | 'dusk';
export type ThemeDensity = 'compact' | 'regular' | 'comfy';

export interface ThemePrefs {
  theme: ThemeMode;
  density: ThemeDensity;
  accent: string;   // hex color, one of ACCENT_OPTIONS
  roundness: number; // px, 4-26
}

export const ACCENT_OPTIONS: string[] = ['#E8674C', '#E0982F', '#3F9E86', '#7B6CC9', '#D06B92'];

export class ThemeService {
  readonly prefs: Signal<ThemePrefs>; // read-only signal, current preferences
  setTheme(theme: ThemeMode): void;
  setDensity(density: ThemeDensity): void;
  setAccent(accent: string): void;
  setRoundness(roundness: number): void;
}
```
This exact public surface (`prefs` signal, `setTheme`/`setDensity`/`setAccent`/`setRoundness`) is what a later settings-panel component (task 305) will call — do not rename these members.

Defaults (when no stored preference exists): `{ theme: 'cream', density: 'regular', accent: '#E8674C', roundness: 18 }`.

Persistence: `localStorage` key `sprout-theme-prefs`, JSON-serialized `ThemePrefs`. On construction, read from `localStorage` if present (falling back to defaults on missing/invalid data), and apply immediately.

Application mechanism: on construction and on every setter call, the service must set `document.documentElement.setAttribute('data-theme', prefs.theme)`, `document.documentElement.setAttribute('data-density', prefs.density)`, `document.documentElement.style.setProperty('--accent', prefs.accent)`, `document.documentElement.style.setProperty('--radius', prefs.roundness + 'px')`, and write the updated `ThemePrefs` back to `localStorage`.

**CSS additions to `client/src/styles.scss`** — add (do not remove/modify the existing `:root` light-theme block from task 101):

```css
:root[data-theme="dusk"] {
  --bg: #201B26;
  --surface: #2A2431;
  --surface-2: #322B3A;
  --surface-3: #40384A;
  --border: #3A3342;
  --border-soft: #342E3C;
  --ink: #F2ECF3;
  --ink-2: #AEA3B7;
  --sidebar-bg: #1A1620;
  --tone-slate: #9A90A6;
  --shadow-sm: 0 1px 2px rgba(0,0,0,.25);
  --shadow-md: 0 6px 18px rgba(0,0,0,.32);
  --shadow-lg: 0 22px 60px rgba(0,0,0,.5);
}
:root[data-density="compact"] { --card-pad: 11px; --card-gap: 8px; --col-gap: 13px; font-size: 14px; }
:root[data-density="comfy"] { --card-pad: 19px; --card-gap: 15px; --col-gap: 24px; font-size: 15.5px; }
```

(Values taken directly from the Sprout prototype's dark theme and density variants.)

## What to do

1. Create `client/src/app/core/theme.service.ts` implementing `ThemeService` exactly as specified: a writable `signal<ThemePrefs>(...)` internally, exposed read-only via `.asReadonly()`, constructor reads `localStorage`/applies defaults and calls the apply-to-DOM logic, each setter updates the signal (immutably), re-applies to the DOM, and re-persists to `localStorage`.
2. Append the dark theme and density CSS blocks to `client/src/styles.scss` exactly as specified, applied via the `data-theme`/`data-density` attribute selectors on `:root` (matching what `ThemeService` sets on `document.documentElement`).
3. Do not wire this service into any component yet (no toolbar toggle, no settings panel) — that's task 305 (settings panel) and task 701 (final integration). This task only needs the service to exist, work correctly, and the CSS to respond to the attributes/variables it sets.

## Acceptance criteria

- [ ] `ThemeService.prefs()` returns `{ theme: 'cream', density: 'regular', accent: '#E8674C', roundness: 18 }` on first load with no prior `localStorage` value.
- [ ] Calling `setTheme('dusk')` sets `document.documentElement`'s `data-theme` attribute to `"dusk"`, updates `prefs().theme`, and persists to `localStorage` under `sprout-theme-prefs`; reloading the service (simulating a page reload) picks up `theme: 'dusk'` from storage.
- [ ] Calling `setDensity('compact')` sets `data-density="compact"` on the document root and updates `prefs().density`.
- [ ] Calling `setAccent('#3F9E86')` sets the `--accent` CSS custom property on the document root to `#3F9E86` and updates `prefs().accent`.
- [ ] Calling `setRoundness(8)` sets `--radius: 8px` on the document root and updates `prefs().roundness`.
- [ ] With `data-theme="dusk"` set on the root, computed styles for elements using `var(--bg)`/`var(--surface)`/`var(--ink)` reflect the dark values from the CSS block above (verify via browser devtools or a quick throwaway test harness).
- [ ] `ng build` succeeds with no errors.

## Out of scope

- Do not build any UI (toggle, settings panel) for changing these preferences — that's task 305.
- Do not wire `ThemeService` into `app.component.ts` or any bootstrap logic — that's task 701.
- Do not modify the light-theme `:root` block or any file from task 101 beyond appending the new CSS blocks described.
