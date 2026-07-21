import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Subtask } from './subtask.model';
import { SubtaskService } from './subtask.service';

@Component({
  selector: 'app-subtask-list',
  standalone: true,
  imports: [FormsModule, MatCheckboxModule, MatFormFieldModule, MatInputModule],
  templateUrl: './subtask-list.component.html',
  styleUrl: './subtask-list.component.scss',
})
export class SubtaskListComponent implements OnInit, OnChanges {
  @Input({ required: true }) taskId!: number;
  @Input({ required: true }) subtasks!: Subtask[];
  @Output() subtasksChanged = new EventEmitter<Subtask[]>();

  readonly items = signal<Subtask[]>([]);
  readonly isAdding = signal(false);

  newSubtaskText = '';

  private readonly togglingIds = signal<Set<number>>(new Set());
  private initialized = false;

  readonly doneCount = computed(() => this.items().filter((s) => s.done).length);
  readonly totalCount = computed(() => this.items().length);
  readonly progressPercent = computed(() => {
    const total = this.totalCount();
    return total === 0 ? 0 : Math.round((this.doneCount() / total) * 100);
  });

  constructor(private readonly subtaskService: SubtaskService) {}

  ngOnInit(): void {
    this.items.set([...(this.subtasks ?? [])]);
    this.initialized = true;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['subtasks'] && this.initialized) {
      this.items.set([...(this.subtasks ?? [])]);
    }
  }

  isToggling(id: number): boolean {
    return this.togglingIds().has(id);
  }

  async onToggle(subtask: Subtask, event: MatCheckboxChange): Promise<void> {
    const done = event.checked;
    this.setToggling(subtask.id, true);
    try {
      const updated = await this.subtaskService.toggle(this.taskId, subtask.id, done);
      this.items.update((current) => current.map((s) => (s.id === updated.id ? updated : s)));
      this.subtasksChanged.emit(this.items());
    } catch (err) {
      console.error('Failed to toggle subtask', err);
    } finally {
      this.setToggling(subtask.id, false);
    }
  }

  async addSubtask(): Promise<void> {
    const text = this.newSubtaskText.trim();
    if (!text || this.isAdding()) {
      return;
    }

    this.isAdding.set(true);
    try {
      const created = await this.subtaskService.create(this.taskId, text);
      this.items.update((current) => [...current, created]);
      this.newSubtaskText = '';
      this.subtasksChanged.emit(this.items());
    } catch (err) {
      console.error('Failed to create subtask', err);
    } finally {
      this.isAdding.set(false);
    }
  }

  private setToggling(id: number, active: boolean): void {
    this.togglingIds.update((current) => {
      const next = new Set(current);
      if (active) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }
}
