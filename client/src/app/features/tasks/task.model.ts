export type BoardColumn = 'ToDo' | 'InProgress' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  projectId: number | null;
  priority: TaskPriority | null;
  column: BoardColumn;
  position: number;
}
