import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';

import { TaskCardComponent } from './task-card.component';
import { BoardColumn, Task } from '../tasks/task.model';
import { TaskService } from '../tasks/task.service';
import { ProjectService } from '../projects/project.service';
import { Project } from '../projects/project.model';
import { Label } from '../labels/label.model';
import { LabelService } from '../labels/label.service';
import { TaskDetailDrawerComponent, TaskDetailDrawerData } from '../tasks/task-detail-drawer.component';
import { BoardFilterState } from '../../app.component';

interface ColumnDefinition {
  id: BoardColumn;
  label: string;
}

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    DragDropModule,
    TaskCardComponent,
  ],
  templateUrl: './board.component.html',
  styleUrl: './board.component.scss',
})
export class BoardComponent implements OnInit {
  readonly columns: ColumnDefinition[] = [
    { id: 'Backlog', label: 'Backlog' },
    { id: 'ToDo', label: 'To Do' },
    { id: 'InProgress', label: 'In Progress' },
    { id: 'Done', label: 'Done' },
  ];

  readonly columnIds: BoardColumn[] = this.columns.map((c) => c.id);

  readonly quickAddTitles = signal<Record<BoardColumn, string>>({
    Backlog: '',
    ToDo: '',
    InProgress: '',
    Done: '',
  });

  readonly projects = computed<Project[]>(() => this.projectService.projects());

  private readonly filteredTasks = computed<Task[]>(() => {
    const all = this.taskService.tasks();
    const term = this.filterState.searchTerm().trim().toLowerCase();
    if (!term) {
      return all;
    }
    return all.filter((task) => task.title.toLowerCase().includes(term));
  });

  private readonly tasksByColumn = computed<Record<BoardColumn, Task[]>>(() => {
    const all = this.filteredTasks();
    const grouped: Record<BoardColumn, Task[]> = {
      Backlog: [],
      ToDo: [],
      InProgress: [],
      Done: [],
    };
    for (const task of all) {
      grouped[task.column].push(task);
    }
    for (const column of this.columnIds) {
      grouped[column] = [...grouped[column]].sort((a, b) => a.position - b.position);
    }
    return grouped;
  });

  constructor(
    protected readonly taskService: TaskService,
    protected readonly projectService: ProjectService,
    protected readonly labelService: LabelService,
    protected readonly filterState: BoardFilterState,
    private readonly dialog: MatDialog
  ) {
    // Reload tasks (server-side filter) whenever the shared project filter changes.
    effect(() => {
      const projectId = this.filterState.selectedProjectId();
      this.taskService.load(projectId ?? undefined);
    });
  }

  ngOnInit(): void {
    this.projectService.load();
    this.labelService.load();
  }

  tasksFor(column: BoardColumn): Task[] {
    return this.tasksByColumn()[column];
  }

  projectNameFor(task: Task): string | null {
    if (task.projectId === null) {
      return null;
    }
    const project = this.projects().find((p) => p.id === task.projectId);
    return project ? project.name : null;
  }

  labelsFor(task: Task): Label[] {
    const all = this.labelService.labels();
    return task.labelIds
      .map((id) => all.find((label) => label.id === id))
      .filter((label): label is Label => !!label);
  }

  quickAddTitleFor(column: BoardColumn): string {
    return this.quickAddTitles()[column];
  }

  setQuickAddTitle(column: BoardColumn, value: string): void {
    this.quickAddTitles.update((current) => ({ ...current, [column]: value }));
  }

  async onQuickAddSubmit(column: BoardColumn): Promise<void> {
    const title = this.quickAddTitles()[column].trim();
    if (!title) {
      return;
    }
    this.setQuickAddTitle(column, '');
    try {
      await this.taskService.create(title, column);
    } catch (err) {
      console.error('Failed to create task', err);
    }
  }

  openEditor(task: Task): void {
    this.dialog.open(TaskDetailDrawerComponent, {
      data: { taskId: task.id } as TaskDetailDrawerData,
      panelClass: 'tm-detail-drawer-panel',
      position: { right: '0' },
      height: '100%',
      width: 'min(520px, 100vw)',
    });
  }

  async onDrop(event: CdkDragDrop<Task[]>): Promise<void> {
    const task = event.item.data as Task;
    const targetColumn = event.container.id as BoardColumn;
    const targetIndex = event.currentIndex;

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }

    try {
      await this.taskService.move(task.id, targetColumn, targetIndex);
    } catch (err) {
      console.error('Failed to move task', err);
    } finally {
      this.taskService.load(this.filterState.selectedProjectId() ?? undefined);
    }
  }
}
