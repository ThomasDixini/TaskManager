import { Injectable, Signal, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BoardColumn, Task, TaskPriority } from './task.model';

export interface TaskUpdateChanges {
  title: string;
  description: string | null;
  projectId: number | null;
  priority: TaskPriority | null;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly _tasks = signal<Task[]>([]);

  readonly tasks: Signal<Task[]> = this._tasks.asReadonly();

  constructor(private readonly http: HttpClient) {}

  load(projectId?: number): void {
    let params = new HttpParams();
    if (projectId !== undefined) {
      params = params.set('projectId', projectId);
    }

    this.http.get<Task[]>(`${environment.apiBaseUrl}/tasks`, { params }).subscribe({
      next: (tasks) => this._tasks.set(tasks),
      error: (err) => console.error('Failed to load tasks', err),
    });
  }

  async create(title: string): Promise<Task> {
    const created = await firstValueFrom(
      this.http.post<Task>(`${environment.apiBaseUrl}/tasks`, { title })
    );
    this._tasks.update((current) => [...current, created]);
    return created;
  }

  async update(id: number, changes: TaskUpdateChanges): Promise<Task> {
    const updated = await firstValueFrom(
      this.http.put<Task>(`${environment.apiBaseUrl}/tasks/${id}`, changes)
    );
    this._tasks.update((current) => current.map((task) => (task.id === id ? updated : task)));
    return updated;
  }

  async delete(id: number): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${environment.apiBaseUrl}/tasks/${id}`));
    this._tasks.update((current) => current.filter((task) => task.id !== id));
  }

  async move(id: number, column: BoardColumn, position: number): Promise<Task> {
    const updated = await firstValueFrom(
      this.http.patch<Task>(`${environment.apiBaseUrl}/tasks/${id}/move`, { column, position })
    );
    this._tasks.update((current) => current.map((task) => (task.id === id ? updated : task)));
    return updated;
  }
}
