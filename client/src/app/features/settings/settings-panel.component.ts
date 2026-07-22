import { Component, OnInit, signal } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';

import { ACCENT_OPTIONS, ThemeDensity, ThemeMode, ThemeService } from '../../core/theme.service';
import { LabelService } from '../labels/label.service';
import { Label } from '../labels/label.model';

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [MatButtonToggleModule, MatSliderModule, FormsModule],
  templateUrl: './settings-panel.component.html',
  styleUrl: './settings-panel.component.scss',
})
export class SettingsPanelComponent implements OnInit {
  readonly accentOptions = ACCENT_OPTIONS;
  readonly labelTones = ['coral', 'amber', 'teal', 'violet', 'blue', 'rose', 'slate'];

  // Create-new-label form state
  readonly newLabelName = signal('');
  readonly newLabelTone = signal(this.labelTones[0]);
  readonly isCreatingLabel = signal(false);

  // Inline edit state
  readonly editingLabelId = signal<string | null>(null);
  readonly editLabelName = signal('');
  readonly editLabelTone = signal(this.labelTones[0]);
  readonly isSavingLabelEdit = signal(false);

  // Delete confirm state
  readonly deleteConfirmLabelId = signal<string | null>(null);
  readonly isDeletingLabel = signal(false);

  constructor(
    protected readonly themeService: ThemeService,
    protected readonly labelService: LabelService,
  ) {}

  ngOnInit(): void {
    this.labelService.load();
  }

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

  onNewLabelNameChange(name: string): void {
    this.newLabelName.set(name);
  }

  onNewLabelToneChange(tone: string): void {
    this.newLabelTone.set(tone);
  }

  async createLabel(): Promise<void> {
    const name = this.newLabelName().trim();
    if (!name || this.isCreatingLabel()) {
      return;
    }

    this.isCreatingLabel.set(true);
    try {
      await this.labelService.create(name, this.newLabelTone());
      this.newLabelName.set('');
      this.newLabelTone.set(this.labelTones[0]);
    } catch (err) {
      console.error('Failed to create label', err);
    } finally {
      this.isCreatingLabel.set(false);
    }
  }

  startEditingLabel(label: Label): void {
    this.editingLabelId.set(label.id);
    this.editLabelName.set(label.name);
    this.editLabelTone.set(label.tone);
  }

  onEditLabelNameChange(name: string): void {
    this.editLabelName.set(name);
  }

  onEditLabelToneChange(tone: string): void {
    this.editLabelTone.set(tone);
  }

  cancelLabelEdit(): void {
    this.editingLabelId.set(null);
    this.editLabelName.set('');
    this.editLabelTone.set(this.labelTones[0]);
  }

  async saveLabelEdit(id: string): Promise<void> {
    const name = this.editLabelName().trim();
    if (!name || this.isSavingLabelEdit()) {
      return;
    }

    this.isSavingLabelEdit.set(true);
    try {
      await this.labelService.update(id, name, this.editLabelTone());
      this.cancelLabelEdit();
    } catch (err) {
      console.error('Failed to update label', err);
    } finally {
      this.isSavingLabelEdit.set(false);
    }
  }

  requestDeleteLabel(id: string): void {
    this.deleteConfirmLabelId.set(id);
  }

  cancelDeleteLabel(): void {
    this.deleteConfirmLabelId.set(null);
  }

  async confirmDeleteLabel(id: string): Promise<void> {
    if (this.isDeletingLabel()) {
      return;
    }

    this.isDeletingLabel.set(true);
    try {
      await this.labelService.delete(id);
      this.deleteConfirmLabelId.set(null);
    } catch (err) {
      console.error('Failed to delete label', err);
    } finally {
      this.isDeletingLabel.set(false);
    }
  }
}
