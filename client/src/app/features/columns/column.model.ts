export interface Column {
  id: number;
  name: string;
  hint: string | null;
  position: number;
  isDefault: boolean;
}

/**
 * The 4 default columns' `name` is the exact machine-form string the wire
 * contract has always used ("ToDo", "InProgress") — required for backward
 * compatibility with every existing `task.column` comparison and API call.
 * This maps those specific 4 names to the friendly, spaced display labels
 * the UI has always shown ("To Do", "In Progress") — a display-only concern.
 * Custom columns have no such distinction (the user's typed name IS the
 * display label), so anything not in this map falls back to `name` itself.
 */
export function columnDisplayLabel(name: string): string {
  const knownDefaults: Record<string, string> = {
    Backlog: 'Backlog',
    ToDo: 'To Do',
    InProgress: 'In Progress',
    Done: 'Done',
  };
  return knownDefaults[name] ?? name;
}
