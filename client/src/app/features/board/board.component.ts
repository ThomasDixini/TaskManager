import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';

import { TaskCardComponent } from './task-card.component';
import { Task } from '../tasks/task.model';
import { TaskService } from '../tasks/task.service';
import { ProjectService } from '../projects/project.service';
import { Project } from '../projects/project.model';
import { Label } from '../labels/label.model';
import { LabelService } from '../labels/label.service';
import { TaskDetailDrawerComponent, TaskDetailDrawerData } from '../tasks/task-detail-drawer.component';
import { BoardFilterState } from '../../app.component';
import { Column, columnDisplayLabel } from '../columns/column.model';
import { ColumnService } from '../columns/column.service';

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
    MatIconModule,
    MatMenuModule,
    DragDropModule,
    TaskCardComponent,
  ],
  templateUrl: './board.component.html',
  styleUrl: './board.component.scss',
})
export class BoardComponent implements OnInit {
  // Quick-add drafts keyed by column *id* (not name) so an in-progress draft
  // survives a rename, which only changes the column's name.
  readonly quickAddTitles = signal<Record<number, string>>({});

  // "+ Add column" ghost column draft.
  readonly newColumnName = signal('');
  readonly isAddingColumn = signal(false);

  // Per-column rename state: which column id (if any) is being renamed, and its draft name.
  readonly renamingColumnId = signal<number | null>(null);
  readonly renameDraft = signal('');
  readonly isSavingRename = signal(false);

  // Per-column delete-confirm state: which column id (if any) is in a confirm step.
  readonly deleteConfirmColumnId = signal<number | null>(null);
  readonly isDeletingColumn = signal(false);

  readonly columnDisplayLabel = columnDisplayLabel;

  readonly projects = computed<Project[]>(() => this.projectService.projects());

  private readonly filteredTasks = computed<Task[]>(() => {
    const all = this.taskService.tasks();
    const term = this.filterState.searchTerm().trim().toLowerCase();
    if (!term) {
      return all;
    }
    return all.filter((task) => task.title.toLowerCase().includes(term));
  });

  private readonly tasksByColumn = computed<Record<string, Task[]>>(() => {
    const all = this.filteredTasks();
    const grouped: Record<string, Task[]> = {};
    for (const column of this.columnService.columns()) {
      grouped[column.name] = [];
    }
    for (const task of all) {
      if (!grouped[task.column]) {
        grouped[task.column] = [];
      }
      grouped[task.column].push(task);
    }
    for (const key of Object.keys(grouped)) {
      grouped[key] = [...grouped[key]].sort((a, b) => a.position - b.position);
    }
    return grouped;
  });

  constructor(
    protected readonly taskService: TaskService,
    protected readonly projectService: ProjectService,
    protected readonly labelService: LabelService,
    protected readonly columnService: ColumnService,
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
    this.columnService.load();
  }

  tasksFor(columnName: string): Task[] {
    return this.tasksByColumn()[columnName] ?? [];
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

  quickAddTitleFor(columnId: number): string {
    return this.quickAddTitles()[columnId] ?? '';
  }

  setQuickAddTitle(columnId: number, value: string): void {
    this.quickAddTitles.update((current) => ({ ...current, [columnId]: value }));
  }

  async onQuickAddSubmit(column: Column): Promise<void> {
    const title = (this.quickAddTitles()[column.id] ?? '').trim();
    if (!title) {
      return;
    }
    this.setQuickAddTitle(column.id, '');
    try {
      const currentName = this.columnService.columns().find((c) => c.id === column.id)?.name ?? column.name;
      await this.taskService.create(title, currentName);
    } catch (err) {
      console.error('Failed to create task', err);
    }
  }

  onQuickAddKeydown(event: Event, column: Column): void {
    event.preventDefault();
    void this.onQuickAddSubmit(column);
  }

  cancelQuickAdd(columnId: number): void {
    this.setQuickAddTitle(columnId, '');
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
    const targetColumn = event.container.id;
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

  async onColumnDrop(event: CdkDragDrop<Column[]>): Promise<void> {
    if (event.previousIndex === event.currentIndex) {
      return;
    }
    const reordered = [...this.columnService.columns()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    const orderedIds = reordered.map((c) => c.id);
    try {
      await this.columnService.reorder(orderedIds);
    } catch (err) {
      console.error('Failed to reorder columns', err);
    }
  }

  async addColumn(): Promise<void> {
    const name = this.newColumnName().trim();
    if (!name) {
      return;
    }
    this.isAddingColumn.set(true);
    try {
      await this.columnService.create(name);
      this.newColumnName.set('');
    } catch (err) {
      console.error('Failed to create column', err);
    } finally {
      this.isAddingColumn.set(false);
    }
  }

  startRenamingColumn(column: Column): void {
    this.renamingColumnId.set(column.id);
    this.renameDraft.set(column.name);
    this.deleteConfirmColumnId.set(null);
  }

  cancelRenameColumn(): void {
    this.renamingColumnId.set(null);
    this.renameDraft.set('');
  }

  setRenameDraft(value: string): void {
    this.renameDraft.set(value);
  }

  async renameColumn(id: number): Promise<void> {
    const name = this.renameDraft().trim();
    if (!name) {
      return;
    }
    this.isSavingRename.set(true);
    try {
      await this.columnService.rename(id, name);
      this.renamingColumnId.set(null);
      this.renameDraft.set('');
      // The rename changes the column's name, which is what tasks are keyed
      // by — reload so cards keep appearing under the column's new name.
      this.taskService.load(this.filterState.selectedProjectId() ?? undefined);
    } catch (err) {
      console.error('Failed to rename column', err);
    } finally {
      this.isSavingRename.set(false);
    }
  }

  requestDeleteColumn(column: Column): void {
    this.deleteConfirmColumnId.set(column.id);
    this.renamingColumnId.set(null);
  }

  cancelDeleteColumn(): void {
    this.deleteConfirmColumnId.set(null);
  }

  async confirmDeleteColumn(id: number): Promise<void> {
    this.isDeletingColumn.set(true);
    try {
      await this.columnService.delete(id);
      this.deleteConfirmColumnId.set(null);
      // The backend has already moved this column's tasks to Backlog —
      // reload so the frontend reflects that.
      this.taskService.load(this.filterState.selectedProjectId() ?? undefined);
    } catch (err) {
      console.error('Failed to delete column', err);
    } finally {
      this.isDeletingColumn.set(false);
    }
  }
}
