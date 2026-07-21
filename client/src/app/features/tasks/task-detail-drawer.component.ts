import { Component, Inject, OnInit, computed, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule, MatButtonToggleChange } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';

import { BoardColumn, TaskDetail, TaskPriority } from './task.model';
import { TaskService } from './task.service';
import { Label } from '../labels/label.model';
import { LabelService } from '../labels/label.service';
import { ProjectService } from '../projects/project.service';
import { SubtaskListComponent } from './subtask-list.component';
import { CommentFeedComponent } from './comment-feed.component';

export interface TaskDetailDrawerData {
  taskId: number;
}

interface ColumnOption {
  value: BoardColumn;
  label: string;
}

interface PriorityOption {
  value: TaskPriority;
  label: string;
}

@Component({
  selector: 'app-task-detail-drawer',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    SubtaskListComponent,
    CommentFeedComponent,
  ],
  templateUrl: './task-detail-drawer.component.html',
  styleUrl: './task-detail-drawer.component.scss',
})
export class TaskDetailDrawerComponent implements OnInit {
  readonly columnOptions: ColumnOption[] = [
    { value: 'Backlog', label: 'Backlog' },
    { value: 'ToDo', label: 'To Do' },
    { value: 'InProgress', label: 'In Progress' },
    { value: 'Done', label: 'Done' },
  ];

  readonly priorityOptions: PriorityOption[] = [
    { value: 'Low', label: 'Low' },
    { value: 'Medium', label: 'Medium' },
    { value: 'High', label: 'High' },
  ];

  readonly detail = signal<TaskDetail | null>(null);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly isDeleting = signal(false);
  readonly showDeleteConfirm = signal(false);
  readonly selectedLabelIds = signal<string[]>([]);

  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl<string | null>(null),
    dueDate: new FormControl<string | null>(null),
  });

  readonly projectName = computed(() => {
    const detail = this.detail();
    if (!detail || detail.projectId == null) {
      return 'No project';
    }
    const project = this.projectService.projects().find((p) => p.id === detail.projectId);
    return project?.name ?? `Project #${detail.projectId}`;
  });

  constructor(
    private readonly dialogRef: MatDialogRef<TaskDetailDrawerComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: TaskDetailDrawerData,
    private readonly taskService: TaskService,
    protected readonly labelService: LabelService,
    protected readonly projectService: ProjectService
  ) {}

  async ngOnInit(): Promise<void> {
    this.labelService.load();
    this.projectService.load();

    this.isLoading.set(true);
    try {
      const detail = await this.taskService.getById(this.data.taskId);
      this.detail.set(detail);
      this.form.setValue({
        title: detail.title,
        description: detail.description,
        dueDate: detail.dueDate,
      });
      this.selectedLabelIds.set([...detail.labelIds]);
    } catch (err) {
      console.error('Failed to load task detail', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  get labels(): Label[] {
    return this.labelService.labels();
  }

  async onStatusChange(event: MatButtonToggleChange): Promise<void> {
    const column = event.value as BoardColumn;
    const detail = this.detail();
    if (!detail || detail.column === column) {
      return;
    }

    try {
      const updated = await this.taskService.move(detail.id, column, 0);
      this.detail.set({ ...detail, column: updated.column, position: updated.position });
    } catch (err) {
      console.error('Failed to move task', err);
    }
  }

  async onPriorityChange(event: MatButtonToggleChange): Promise<void> {
    const priority = event.value as TaskPriority;
    const detail = this.detail();
    if (!detail || detail.priority === priority) {
      return;
    }

    try {
      const updated = await this.taskService.update(detail.id, {
        title: detail.title,
        description: detail.description,
        projectId: detail.projectId,
        priority,
        dueDate: detail.dueDate,
        labelIds: detail.labelIds,
      });
      this.detail.set({ ...detail, priority: updated.priority });
    } catch (err) {
      console.error('Failed to update priority', err);
    }
  }

  toggleLabel(labelId: string): void {
    this.selectedLabelIds.update((current) =>
      current.includes(labelId) ? current.filter((id) => id !== labelId) : [...current, labelId]
    );
  }

  isLabelSelected(labelId: string): boolean {
    return this.selectedLabelIds().includes(labelId);
  }

  onSubtasksChanged(subtasks: TaskDetail['subtasks']): void {
    this.detail.update((current) => (current ? { ...current, subtasks } : current));
  }

  onCommentAdded(comment: TaskDetail['comments'][number]): void {
    this.detail.update((current) =>
      current ? { ...current, comments: [...current.comments, comment] } : current
    );
  }

  async save(): Promise<void> {
    const detail = this.detail();
    if (!detail || this.form.invalid || this.isSaving()) {
      return;
    }

    const value = this.form.getRawValue();
    this.isSaving.set(true);
    try {
      await this.taskService.update(detail.id, {
        title: value.title,
        description: value.description,
        projectId: detail.projectId,
        priority: detail.priority,
        dueDate: value.dueDate,
        labelIds: this.selectedLabelIds(),
      });
      this.dialogRef.close();
    } catch (err) {
      console.error('Failed to save task', err);
    } finally {
      this.isSaving.set(false);
    }
  }

  close(): void {
    this.dialogRef.close();
  }

  requestDelete(): void {
    this.showDeleteConfirm.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
  }

  async confirmDelete(): Promise<void> {
    const detail = this.detail();
    if (!detail || this.isDeleting()) {
      return;
    }

    this.isDeleting.set(true);
    try {
      await this.taskService.delete(detail.id);
      this.dialogRef.close();
    } catch (err) {
      console.error('Failed to delete task', err);
    } finally {
      this.isDeleting.set(false);
    }
  }
}
