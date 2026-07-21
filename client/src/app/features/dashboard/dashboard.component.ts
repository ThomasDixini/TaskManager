import { CommonModule } from '@angular/common';
import { Component, OnInit, computed } from '@angular/core';
import { Router } from '@angular/router';

import { Task } from '../tasks/task.model';
import { TaskService } from '../tasks/task.service';
import { Project } from '../projects/project.model';
import { ProjectService } from '../projects/project.service';

export type FocusDueState = 'over' | 'today';

export interface FocusItem {
  task: Task;
  dueState: FocusDueState;
  dueLabel: string;
}

export interface ProjectProgress {
  project: Project;
  total: number;
  done: number;
  pct: number;
}

/**
 * Parses a "yyyy-MM-dd" date string as a local (midnight) date. Returns
 * `null` when there is no due date.
 */
function parseLocalDate(dueDate: string | null): Date | null {
  if (!dueDate) {
    return null;
  }
  const [year, month, day] = dueDate.split('-').map((part) => Number(part));
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  readonly today = new Date();

  readonly active = computed<Task[]>(() =>
    this.taskService.tasks().filter((task) => task.column !== 'Done')
  );

  readonly doing = computed<Task[]>(() =>
    this.taskService.tasks().filter((task) => task.column === 'InProgress')
  );

  readonly done = computed<Task[]>(() =>
    this.taskService.tasks().filter((task) => task.column === 'Done')
  );

  readonly todaysFocus = computed<FocusItem[]>(() => {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    const items: FocusItem[] = [];
    for (const task of this.active()) {
      const due = parseLocalDate(task.dueDate);
      if (!due || due.getTime() > todayMidnight.getTime()) {
        continue;
      }
      const isOver = due.getTime() < todayMidnight.getTime();
      items.push({
        task,
        dueState: isOver ? 'over' : 'today',
        dueLabel: isOver ? 'Overdue' : 'Today',
      });
    }

    return items.sort((a, b) => {
      const aDate = a.task.dueDate ?? '';
      const bDate = b.task.dueDate ?? '';
      return aDate.localeCompare(bDate);
    });
  });

  readonly pct = computed<number>(() => {
    const total = this.taskService.tasks().length;
    if (total === 0) {
      return 0;
    }
    return this.done().length / total;
  });

  readonly pctRounded = computed<number>(() => Math.round(this.pct() * 100));

  readonly byProject = computed<ProjectProgress[]>(() => {
    const tasks = this.taskService.tasks();
    const result: ProjectProgress[] = [];

    for (const project of this.projectService.projects()) {
      const projectTasks = tasks.filter((task) => task.projectId === project.id);
      if (projectTasks.length === 0) {
        continue;
      }
      const doneCount = projectTasks.filter((task) => task.column === 'Done').length;
      result.push({
        project,
        total: projectTasks.length,
        done: doneCount,
        pct: (doneCount / projectTasks.length) * 100,
      });
    }

    return result;
  });

  readonly ringCircumference = 2 * Math.PI * 42;

  get ringDashoffset(): number {
    return this.ringCircumference * (1 - this.pct());
  }

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Good morning';
    }
    if (hour < 18) {
      return 'Good afternoon';
    }
    return 'Good evening';
  }

  get formattedDate(): string {
    return this.today.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  constructor(
    protected readonly taskService: TaskService,
    protected readonly projectService: ProjectService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.taskService.load();
    this.projectService.load();
  }

  openBoard(): void {
    this.router.navigate(['/board']);
  }

  async markDone(task: Task): Promise<void> {
    try {
      await this.taskService.move(task.id, 'Done', 0);
    } catch (err) {
      console.error('Failed to mark task done', err);
    }
  }
}
