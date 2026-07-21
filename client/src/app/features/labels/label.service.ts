import { Injectable, Signal, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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
}
