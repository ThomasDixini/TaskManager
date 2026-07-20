import { Injectable, Signal, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Project } from './project.model';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly _projects = signal<Project[]>([]);

  readonly projects: Signal<Project[]> = this._projects.asReadonly();

  constructor(private readonly http: HttpClient) {}

  load(): void {
    this.http.get<Project[]>(`${environment.apiBaseUrl}/projects`).subscribe({
      next: (projects) => this._projects.set(projects),
      error: (err) => console.error('Failed to load projects', err),
    });
  }

  async create(name: string): Promise<Project> {
    const created = await firstValueFrom(
      this.http.post<Project>(`${environment.apiBaseUrl}/projects`, { name })
    );
    this._projects.update((current) => [...current, created]);
    return created;
  }
}
