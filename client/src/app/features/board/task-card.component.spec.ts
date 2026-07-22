import { computeDueBadge } from './task-card.component';

function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

describe('computeDueBadge', () => {
  it('returns null when there is no due date', () => {
    expect(computeDueBadge(null)).toBeNull();
  });

  it('returns "Today" with state "today" for the current date', () => {
    expect(computeDueBadge(isoDaysFromToday(0))).toEqual({ text: 'Today', state: 'today' });
  });

  it('returns "Tomorrow" with state "soon" for +1 day', () => {
    expect(computeDueBadge(isoDaysFromToday(1))).toEqual({ text: 'Tomorrow', state: 'soon' });
  });

  it('returns "Nd" with state "soon" for 2-6 days out', () => {
    expect(computeDueBadge(isoDaysFromToday(3))).toEqual({ text: '3d', state: 'soon' });
    expect(computeDueBadge(isoDaysFromToday(6))).toEqual({ text: '6d', state: 'soon' });
  });

  it('returns a formatted date with state "far" beyond 6 days', () => {
    const badge = computeDueBadge(isoDaysFromToday(7));
    expect(badge?.state).toBe('far');
    expect(badge?.text).not.toMatch(/^\d+d$/);
  });

  it('returns "Yesterday" with state "over" for -1 day', () => {
    expect(computeDueBadge(isoDaysFromToday(-1))).toEqual({ text: 'Yesterday', state: 'over' });
  });

  it('returns "Nd overdue" with state "over" for further-past dates', () => {
    expect(computeDueBadge(isoDaysFromToday(-4))).toEqual({ text: '4d overdue', state: 'over' });
  });
});
