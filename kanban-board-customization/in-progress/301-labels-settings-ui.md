---
id: 301
title: Labels management UI in the Settings panel
status: in-progress
wave: 3
depends_on: [202]
priority: high
estimate: M
files:
  - client/src/app/features/settings/settings-panel.component.ts
  - client/src/app/features/settings/settings-panel.component.html
  - client/src/app/features/settings/settings-panel.component.scss
prd_refs: [FR-1, FR-2, FR-3, FR-4, FR-5, FR-6]
agent_ready: true
---

# 301 – Labels management UI in the Settings panel

## Context (self-contained)

We are adding label management (create, rename, recolor, delete) to the Settings panel of an Angular Kanban board app. A prior task (202, already done) extended `LabelService` with the methods this task calls; another prior task (301... — no, this task IS 301; ignore) not applicable. The Settings panel already exists (`SettingsPanelComponent`, standalone, selector `app-settings-panel`) with working Theme/Density/Accent/Roundness controls, opened via a gear icon in the topbar's `MatMenu` (wired up in `app.component.html`, not touched by this task). This task adds a fifth section, "Labels," alongside the existing four — it does not change how the panel itself is opened or placed.

**`LabelService`** (`client/src/app/features/labels/label.service.ts`, already extended by task 202):
```ts
export class LabelService {
  readonly labels: Signal<Label[]>;
  load(): void;
  create(name: string, tone: string): Promise<Label>;
  update(id: string, name: string, tone: string): Promise<Label>;
  delete(id: string): Promise<void>;
}
```
**`Label` model** (`client/src/app/features/labels/label.model.ts`, unchanged): `{ id: string; name: string; tone: string }`.

The 7 valid tone keywords — the *only* colors a label can ever have, matching the app's existing CSS custom properties (`--tone-coral`, `--tone-amber`, `--tone-teal`, `--tone-violet`, `--tone-blue`, `--tone-rose`, `--tone-slate`) — are: `coral`, `amber`, `teal`, `violet`, `blue`, `rose`, `slate`. There is no free-form color input anywhere in this feature.

**Current `SettingsPanelComponent`** (`client/src/app/features/settings/settings-panel.component.ts`, before this task):
```ts
@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [MatButtonToggleModule, MatSliderModule, FormsModule],
  templateUrl: './settings-panel.component.html',
  styleUrl: './settings-panel.component.scss',
})
export class SettingsPanelComponent {
  readonly accentOptions = ACCENT_OPTIONS;
  constructor(protected readonly themeService: ThemeService) {}
  onThemeChange(theme: ThemeMode): void { this.themeService.setTheme(theme); }
  onDensityChange(density: ThemeDensity): void { this.themeService.setDensity(density); }
  onAccentChange(accent: string): void { this.themeService.setAccent(accent); }
  onRoundnessChange(roundness: number): void { this.themeService.setRoundness(roundness); }
}
```
Its template renders the Accent control as a row of clickable swatches (one per `ACCENT_OPTIONS` hex value), highlighting the currently-selected one — reuse this exact same swatch-picker visual/interaction pattern for the label tone picker below, just keyed by the 7 tone *keywords* (rendered as `background: var(--tone-{tone})`) instead of hex values.

## Interfaces you must conform to

- No new public interface — this task only adds a UI section to the existing `SettingsPanelComponent`, consuming `LabelService`'s already-fixed public surface.
- Inject `LabelService` into `SettingsPanelComponent`'s constructor (alongside the existing `ThemeService`), call `labelService.load()` in `ngOnInit` (safe to call even if already loaded elsewhere — the board and the task-detail drawer both already call it redundantly, matching this app's established convention).

## What to do

1. In `settings-panel.component.ts`: implement `OnInit`, inject `LabelService`, call `labelService.load()` in `ngOnInit`. Add a local constant for the 7 tone keywords (e.g. `readonly labelTones = ['coral', 'amber', 'teal', 'violet', 'blue', 'rose', 'slate'];`).
2. Add state for the "create new label" form: a name input (plain string field/signal) and a selected-tone field/signal (default to the first tone), plus an `isSaving`/`isCreating` guard signal to prevent double-submits (matching the pattern already used elsewhere in this app, e.g. `TaskDetailDrawerComponent.isSaving`).
3. Add state for per-label inline editing: which label id (if any) is currently being edited, its in-progress name/tone edits, and which label id (if any) is in a delete-confirmation state (mirroring `TaskDetailDrawerComponent`'s `showDeleteConfirm` two-step confirm/cancel pattern for its own delete action).
4. Add methods: `createLabel()` (calls `labelService.create(name, tone)`, clears the form on success), `startEditingLabel(label)` (seeds the edit-state from the label), `saveLabelEdit(id)` (calls `labelService.update(id, name, tone)`, exits edit mode on success), `cancelLabelEdit()`, `requestDeleteLabel(id)` (enters confirm state), `cancelDeleteLabel()`, `confirmDeleteLabel(id)` (calls `labelService.delete(id)`).
5. Template (`settings-panel.component.html`): add a "Labels" section after the existing four. For each label in `labelService.labels()`: show its tone swatch + name; a small edit affordance (click to enter edit mode, showing a name input + the 7-swatch tone picker + Save/Cancel) and a delete affordance (click to enter the confirm state, showing "Delete 'X'?" + Yes/Cancel, matching the drawer's existing delete-confirm copy style). Below the list, a "+ New label" control: a name input + the 7-swatch tone picker + an add button, calling `createLabel()`.
6. Style (`settings-panel.component.scss`): compact list rows consistent with the panel's existing sections — reuse the same swatch-button sizing/selected-state styling already used for the Accent control, just applied to `var(--tone-{tone})` backgrounds instead of literal hex values.

## Acceptance criteria

- [ ] The Labels section renders all 7 built-in labels plus any previously-created custom ones, each showing its tone swatch and name.
- [ ] Filling the "+ New label" name field, picking a tone swatch, and submitting calls `labelService.create(name, tone)`; on resolution, the new label appears in the list and the form clears.
- [ ] Clicking a label's edit affordance shows an editable name field and the 7-swatch tone picker, prefilled with its current name/tone.
- [ ] Changing the name/tone and saving calls `labelService.update(id, newName, newTone)`; on resolution, the list reflects the change and edit mode closes.
- [ ] Clicking a label's delete affordance shows a confirm step (not an immediate delete); clicking "Cancel" exits without calling `delete`; clicking confirm calls `labelService.delete(id)`, and on resolution the label disappears from the list.
- [ ] The tone picker (both create and edit) only ever offers the 7 known tones — no free-form color input anywhere.
- [ ] `ng build` succeeds.

## Out of scope

- Do not modify `ThemeService`, the existing Theme/Density/Accent/Roundness controls' behavior, or `client/src/app/features/labels/label.service.ts`/`label.model.ts` — only consume `LabelService`'s existing public interface.
- Do not add this component to any new route or change how it's opened — unaffected, already wired into `app.component.html`.
- Do not touch `client/src/app/features/board/`, `client/src/app/features/tasks/`, or `client/src/app/features/columns/`.
