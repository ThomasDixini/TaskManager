import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Comment } from './comment.model';

@Injectable({ providedIn: 'root' })
export class CommentService {
  constructor(private readonly http: HttpClient) {}

  create(taskId: number, text: string): Promise<Comment> {
    return firstValueFrom(
      this.http.post<Comment>(`${environment.apiBaseUrl}/tasks/${taskId}/comments`, { text })
    );
  }
}
