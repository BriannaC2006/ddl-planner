import type { Assignment } from '../types/planner';
export const COMPLETION_DELAY = 420;
export const UNDO_DURATION = 8000;

export function completeAssignment(
  a: Assignment,
  now = new Date().toISOString(),
): Assignment {
  if (a.status === 'Completed') return a;
  return {
    ...a,
    previousStatus: a.status,
    previousProgress: a.progress,
    status: 'Completed',
    progress: 100,
    completedAt: now,
    updatedAt: now,
  };
}

export function restoreAssignment(
  a: Assignment,
  now = new Date().toISOString(),
): Assignment {
  if (a.status !== 'Completed') return a;
  const status =
    a.previousStatus === 'In Progress' ? 'In Progress' : 'Not Started';
  const progress =
    typeof a.previousProgress === 'number'
      ? Math.max(0, Math.min(99, a.previousProgress))
      : 0;
  return {
    ...a,
    status,
    progress: status === 'Not Started' ? 0 : progress,
    completedAt: undefined,
    updatedAt: now,
  };
}

// Used by the editor as well as checkbox actions, so every completion is reversible.
export function changeStatus(
  a: Assignment,
  status: Assignment['status'],
): Assignment {
  if (status === a.status) return a;
  if (status === 'Completed') return completeAssignment(a);
  const restored = a.status === 'Completed' ? restoreAssignment(a) : a;
  return {
    ...restored,
    status,
    progress: status === 'Not Started' ? 0 : restored.progress,
    completedAt: undefined,
  };
}
