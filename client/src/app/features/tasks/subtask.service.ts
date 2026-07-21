import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Subtask } from './subtask.model';

@Injectable({ providedIn: 'root' })
export class SubtaskService {
  constructor(private readonly http: HttpClient) {}

  async create(taskId: number, text: string): Promise<Subtask> {
    return firstValueFrom(
      this.http.post<Subtask>(`${environment.apiBaseUrl}/tasks/${taskId}/subtasks`, { text })
    );
  }

  async toggle(taskId: number, subtaskId: number, done: boolean): Promise<Subtask> {
    return firstValueFrom(
      this.http.patch<Subtask>(
        `${environment.apiBaseUrl}/tasks/${taskId}/subtasks/${subtaskId}`,
        { done }
      )
    );
  }
}
