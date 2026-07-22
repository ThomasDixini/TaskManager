import { Injectable, Signal, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Label } from './label.model';

@Injectable({ providedIn: 'root' })
export class LabelService {
  private readonly _labels = signal<Label[]>([]);

  readonly labels: Signal<Label[]> = this._labels.asReadonly();

  constructor(private readonly http: HttpClient) {}

  load(): void {
    this.http.get<Label[]>(`${environment.apiBaseUrl}/labels`).subscribe({
      next: (labels) => this._labels.set(labels),
      error: (err) => console.error('Failed to load labels', err),
    });
  }

  async create(name: string, tone: string): Promise<Label> {
    const created = await firstValueFrom(
      this.http.post<Label>(`${environment.apiBaseUrl}/labels`, { name, tone }),
    );
    this._labels.update((labels) => [...labels, created]);
    return created;
  }

  async update(id: string, name: string, tone: string): Promise<Label> {
    const updated = await firstValueFrom(
      this.http.put<Label>(`${environment.apiBaseUrl}/labels/${id}`, { name, tone }),
    );
    this._labels.update((labels) =>
      labels.map((label) => (label.id === id ? updated : label)),
    );
    return updated;
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${environment.apiBaseUrl}/labels/${id}`));
    this._labels.update((labels) => labels.filter((label) => label.id !== id));
  }
}
