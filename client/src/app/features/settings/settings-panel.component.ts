import { Component } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';

import { ACCENT_OPTIONS, ThemeDensity, ThemeMode, ThemeService } from '../../core/theme.service';

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

  onThemeChange(theme: ThemeMode): void {
    this.themeService.setTheme(theme);
  }

  onDensityChange(density: ThemeDensity): void {
    this.themeService.setDensity(density);
  }

  onAccentChange(accent: string): void {
    this.themeService.setAccent(accent);
  }

  onRoundnessChange(roundness: number): void {
    this.themeService.setRoundness(roundness);
  }
}
