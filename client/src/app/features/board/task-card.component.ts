import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Task } from '../tasks/task.model';

export type DueBadgeState = 'over' | 'today' | 'soon' | 'far';

export interface DueBadge {
  text: string;
  state: DueBadgeState;
}

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-card.component.html',
  styleUrl: './task-card.component.scss',
})
export class TaskCardComponent {
  @Input({ required: true }) task!: Task;
  @Input() projectName: string | null = null;
  @Input() labels: { id: string; name: string; tone: string }[] = [];

  @Output() cardClick = new EventEmitter<Task>();

  onCardClick(): void {
    this.cardClick.emit(this.task);
  }

  get priorityClass(): string {
    switch (this.task.priority) {
      case 'Low':
        return 'priority-low';
      case 'Medium':
        return 'priority-medium';
      case 'High':
        return 'priority-high';
      default:
        return '';
    }
  }

  get dueBadge(): DueBadge | null {
    return computeDueBadge(this.task.dueDate);
  }

  get subtaskProgressPct(): number {
    if (!this.task.subtaskTotal) {
      return 0;
    }
    return (this.task.subtaskDone / this.task.subtaskTotal) * 100;
  }

  toneBackground(tone: string): string {
    return `color-mix(in oklab, var(--tone-${tone}) 15%, var(--surface))`;
  }

  toneColor(tone: string): string {
    return `color-mix(in oklab, var(--tone-${tone}) 68%, var(--ink))`;
  }
}

/**
 * Parses a "yyyy-MM-dd" date string as a local (midnight) date, compares it
 * against today, and returns the badge text/state to render — or `null`
 * when there is no due date.
 */
export function computeDueBadge(dueDate: string | null): DueBadge | null {
  if (!dueDate) {
    return null;
  }

  const [year, month, day] = dueDate.split('-').map((part) => Number(part));
  const due = new Date(year, month - 1, day);
  due.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = Math.round((due.getTime() - today.getTime()) / msPerDay);

  if (diff < 0) {
    return {
      text: diff === -1 ? 'Yesterday' : `${-diff}d overdue`,
      state: 'over',
    };
  }

  if (diff === 0) {
    return { text: 'Today', state: 'today' };
  }

  if (diff === 1) {
    return { text: 'Tomorrow', state: 'soon' };
  }

  if (diff <= 6) {
    return { text: `${diff}d`, state: 'soon' };
  }

  return {
    text: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    state: 'far',
  };
}
