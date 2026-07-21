export type BoardColumn = 'Backlog' | 'ToDo' | 'InProgress' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  projectId: number | null;
  priority: TaskPriority | null;
  column: BoardColumn;
  position: number;
  dueDate: string | null;
  labelIds: string[];
  subtaskTotal: number;
  subtaskDone: number;
  commentCount: number;
}

export interface Subtask {
  id: number;
  text: string;
  done: boolean;
  position: number;
}

export interface Comment {
  id: number;
  text: string;
  createdAt: string;
}

export interface TaskDetail extends Task {
  subtasks: Subtask[];
  comments: Comment[];
}
