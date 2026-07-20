import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
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
import {
  TaskEditorDialogComponent,
  TaskEditorDialogData,
} from '../tasks/task-editor-dialog.component';

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
    { id: 'ToDo', label: 'To Do' },
    { id: 'InProgress', label: 'In Progress' },
    { id: 'Done', label: 'Done' },
  ];

  readonly columnIds: BoardColumn[] = this.columns.map((c) => c.id);

  readonly selectedProjectId = signal<number | null>(null);
  readonly quickAddTitle = signal('');

  readonly projects = computed<Project[]>(() => this.projectService.projects());

  private readonly tasksByColumn = computed<Record<BoardColumn, Task[]>>(() => {
    const all = this.taskService.tasks();
    const grouped: Record<BoardColumn, Task[]> = {
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
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.taskService.load();
    this.projectService.load();
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

  onFilterChange(): void {
    this.taskService.load(this.selectedProjectId() ?? undefined);
  }

  async onQuickAddSubmit(): Promise<void> {
    const title = this.quickAddTitle().trim();
    if (!title) {
      return;
    }
    this.quickAddTitle.set('');
    try {
      await this.taskService.create(title);
    } catch (err) {
      console.error('Failed to create task', err);
    }
  }

  openEditor(task: Task): void {
    this.dialog.open(TaskEditorDialogComponent, {
      data: { task } as TaskEditorDialogData,
      width: '480px',
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
      this.taskService.load(this.selectedProjectId() ?? undefined);
    }
  }
}
