import { Injectable, Signal, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Column } from './column.model';

@Injectable({ providedIn: 'root' })
export class ColumnService {
  private readonly _columns = signal<Column[]>([]);

  readonly columns: Signal<Column[]> = this._columns.asReadonly();

  constructor(private readonly http: HttpClient) {}

  load(): void {
    this.http.get<Column[]>(`${environment.apiBaseUrl}/columns`).subscribe({
      next: (columns) => this._columns.set(columns),
      error: (err) => console.error('Failed to load columns', err),
    });
  }

  async create(name: string): Promise<Column> {
    const created = await firstValueFrom(
      this.http.post<Column>(`${environment.apiBaseUrl}/columns`, { name })
    );
    this._columns.update((current) => [...current, created]);
    return created;
  }

  async rename(id: number, name: string): Promise<Column> {
    const updated = await firstValueFrom(
      this.http.put<Column>(`${environment.apiBaseUrl}/columns/${id}`, { name })
    );
    this._columns.update((current) =>
      current.map((column) => (column.id === id ? updated : column))
    );
    return updated;
  }

  async delete(id: number): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${environment.apiBaseUrl}/columns/${id}`));
    this._columns.update((current) => current.filter((column) => column.id !== id));
  }

  async reorder(orderedIds: number[]): Promise<Column[]> {
    const updated = await firstValueFrom(
      this.http.patch<Column[]>(`${environment.apiBaseUrl}/columns/reorder`, { orderedIds })
    );
    this._columns.set(updated);
    return updated;
  }
}
