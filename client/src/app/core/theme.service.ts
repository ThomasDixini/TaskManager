import { Injectable, Signal, signal } from '@angular/core';

export type ThemeMode = 'cream' | 'dusk';
export type ThemeDensity = 'compact' | 'regular' | 'comfy';

export interface ThemePrefs {
  theme: ThemeMode;
  density: ThemeDensity;
  accent: string; // hex color, one of ACCENT_OPTIONS
  roundness: number; // px, 4-26
}

export const ACCENT_OPTIONS: string[] = ['#E8674C', '#E0982F', '#3F9E86', '#7B6CC9', '#D06B92'];

const STORAGE_KEY = 'sprout-theme-prefs';

const DEFAULT_PREFS: ThemePrefs = {
  theme: 'cream',
  density: 'regular',
  accent: '#E8674C',
  roundness: 18,
};

function isValidPrefs(value: unknown): value is ThemePrefs {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const prefs = value as Partial<ThemePrefs>;
  return (
    (prefs.theme === 'cream' || prefs.theme === 'dusk') &&
    (prefs.density === 'compact' || prefs.density === 'regular' || prefs.density === 'comfy') &&
    typeof prefs.accent === 'string' &&
    typeof prefs.roundness === 'number'
  );
}

function loadPrefs(): ThemePrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_PREFS };
    }
    const parsed = JSON.parse(raw);
    if (isValidPrefs(parsed)) {
      return parsed;
    }
    return { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _prefs = signal<ThemePrefs>(loadPrefs());
  readonly prefs: Signal<ThemePrefs> = this._prefs.asReadonly();

  constructor() {
    this.applyToDom(this._prefs());
  }

  setTheme(theme: ThemeMode): void {
    this.update({ theme });
  }

  setDensity(density: ThemeDensity): void {
    this.update({ density });
  }

  setAccent(accent: string): void {
    this.update({ accent });
  }

  setRoundness(roundness: number): void {
    this.update({ roundness });
  }

  private update(partial: Partial<ThemePrefs>): void {
    const next: ThemePrefs = { ...this._prefs(), ...partial };
    this._prefs.set(next);
    this.applyToDom(next);
    this.persist(next);
  }

  private applyToDom(prefs: ThemePrefs): void {
    const root = document.documentElement;
    root.setAttribute('data-theme', prefs.theme);
    root.setAttribute('data-density', prefs.density);
    root.style.setProperty('--accent', prefs.accent);
    root.style.setProperty('--radius', prefs.roundness + 'px');
  }

  private persist(prefs: ThemePrefs): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore storage errors (e.g. private browsing quota).
    }
  }
}
