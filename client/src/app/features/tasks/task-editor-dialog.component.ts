import { Component, Inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Task, TaskPriority } from './task.model';
import { TaskService } from './task.service';
import { Project } from '../projects/project.model';
import { ProjectService } from '../projects/project.service';

export interface TaskEditorDialogData {
  task: Task;
}

const ADD_NEW_PROJECT = '__add_new_project__';

interface PriorityOption {
  value: TaskPriority | null;
  label: string;
}

@Component({
  selector: 'app-task-editor-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './task-editor-dialog.component.html',
  styleUrl: './task-editor-dialog.component.scss',
})
export class TaskEditorDialogComponent implements OnInit {
  readonly addNewProjectValue = ADD_NEW_PROJECT;

  readonly priorityOptions: PriorityOption[] = [
    { value: null, label: 'None' },
    { value: 'Low', label: 'Low' },
    { value: 'Medium', label: 'Medium' },
    { value: 'High', label: 'High' },
  ];

  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl<string | null>(null),
    projectId: new FormControl<number | typeof ADD_NEW_PROJECT | null>(null),
    priority: new FormControl<TaskPriority | null>(null),
  });

  readonly showDeleteConfirm = signal(false);
  readonly showAddProject = signal(false);
  readonly newProjectName = signal('');
  readonly isSaving = signal(false);
  readonly isDeleting = signal(false);
  readonly isCreatingProject = signal(false);

  constructor(
    private readonly dialogRef: MatDialogRef<TaskEditorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: TaskEditorDialogData,
    private readonly taskService: TaskService,
    protected readonly projectService: ProjectService
  ) {}

  ngOnInit(): void {
    this.projectService.load();

    const task = this.data.task;
    this.form.setValue({
      title: task.title,
      description: task.description,
      projectId: task.projectId,
      priority: task.priority,
    });
  }

  get projects(): Project[] {
    return this.projectService.projects();
  }

  onProjectSelectionChange(value: number | typeof ADD_NEW_PROJECT | null): void {
    if (value === ADD_NEW_PROJECT) {
      this.showAddProject.set(true);
      this.newProjectName.set('');
      // Revert the select's underlying value until the new project is created.
      this.form.controls.projectId.setValue(this.data.task.projectId, { emitEvent: false });
    } else {
      this.showAddProject.set(false);
    }
  }

  cancelAddProject(): void {
    this.showAddProject.set(false);
    this.newProjectName.set('');
  }

  async confirmAddProject(): Promise<void> {
    const name = this.newProjectName().trim();
    if (!name) {
      return;
    }

    this.isCreatingProject.set(true);
    try {
      const created = await this.projectService.create(name);
      this.form.controls.projectId.setValue(created.id);
      this.showAddProject.set(false);
      this.newProjectName.set('');
    } catch (err) {
      console.error('Failed to create project', err);
    } finally {
      this.isCreatingProject.set(false);
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.isSaving()) {
      return;
    }

    const value = this.form.getRawValue();
    const projectId = value.projectId === ADD_NEW_PROJECT ? null : value.projectId;
    this.isSaving.set(true);
    try {
      await this.taskService.update(this.data.task.id, {
        title: value.title,
        description: value.description,
        projectId,
        priority: value.priority,
        dueDate: this.data.task.dueDate,
        labelIds: this.data.task.labelIds,
      });
      this.dialogRef.close();
    } catch (err) {
      console.error('Failed to save task', err);
    } finally {
      this.isSaving.set(false);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }

  requestDelete(): void {
    this.showDeleteConfirm.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
  }

  async confirmDelete(): Promise<void> {
    if (this.isDeleting()) {
      return;
    }

    this.isDeleting.set(true);
    try {
      await this.taskService.delete(this.data.task.id);
      this.dialogRef.close();
    } catch (err) {
      console.error('Failed to delete task', err);
    } finally {
      this.isDeleting.set(false);
    }
  }
}
