import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Comment } from './comment.model';
import { CommentService } from './comment.service';

@Component({
  selector: 'app-comment-feed',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './comment-feed.component.html',
  styleUrl: './comment-feed.component.scss',
})
export class CommentFeedComponent implements OnInit, OnChanges {
  @Input({ required: true }) taskId!: number;
  @Input({ required: true }) comments!: Comment[];
  @Output() commentAdded = new EventEmitter<Comment>();

  readonly items = signal<Comment[]>([]);
  readonly submitting = signal(false);

  draft = '';

  constructor(private readonly commentService: CommentService) {}

  ngOnInit(): void {
    this.items.set(this.comments ?? []);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['comments'] && !changes['comments'].firstChange) {
      this.items.set(this.comments ?? []);
    }
  }

  formatTimestamp(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return iso;
    }
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  async submitComment(): Promise<void> {
    const text = this.draft.trim();
    if (!text || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    try {
      const created = await this.commentService.create(this.taskId, text);
      this.items.set([...this.items(), created]);
      this.draft = '';
      this.commentAdded.emit(created);
    } finally {
      this.submitting.set(false);
    }
  }
}
