'use client';
import { useEffect, useRef, useState } from 'react';
import type { Assignment, PlannerData } from '@/types/planner';
import { storage, STORAGE_KEY } from '@/lib/storage';
import {
  completeAssignment,
  restoreAssignment,
  COMPLETION_DELAY,
  UNDO_DURATION,
} from '@/lib/completion';

export type Notice = {
  id: string;
  message: string;
  assignmentId?: string;
  completedAt?: string;
};
export function usePlanner() {
  const [data, setData] = useState<PlannerData | null>(null);
  const dataRef = useRef<PlannerData | null>(null);
  const [error, setError] = useState('');
  const [notices, setNotices] = useState<Notice[]>([]);
  // Retain active snapshots briefly for the completion animation. Persisted data is saved immediately.
  const [completing, setCompleting] = useState<Record<string, Assignment>>({});
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const noticeTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    let cancelled = false;
    const completionTimers = timers.current;
    const notificationTimers = noticeTimers.current;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const d = storage.load();
        dataRef.current = d;
        setData(d);
        // Optional fields need no destructive migration or rewrite at load time.
        if (!localStorage.getItem(STORAGE_KEY)) storage.save(d);
      } catch {
        setError(
          '无法读取或保存本地数据。原始数据未被覆盖，请检查浏览器的存储设置。',
        );
      }
    });
    return () => {
      cancelled = true;
      completionTimers.forEach(clearTimeout);
      notificationTimers.forEach(clearTimeout);
    };
  }, []);
  function commit(next: PlannerData) {
    try {
      storage.save(next);
      dataRef.current = next;
      setData(next);
      setError('');
      return true;
    } catch {
      setError('未能保存更改，请检查浏览器可用存储空间后重试。');
      return false;
    }
  }
  function dismiss(id: string) {
    clearTimeout(noticeTimers.current.get(id));
    noticeTimers.current.delete(id);
    setNotices((n) => n.filter((x) => x.id !== id));
  }
  function notify(message: string, assignment?: Assignment) {
    const notice: Notice = {
      id: crypto.randomUUID(),
      message,
      assignmentId: assignment?.id,
      completedAt: assignment?.completedAt,
    };
    setNotices((n) => [
      ...n.filter((x) => !assignment || x.assignmentId !== assignment.id),
      notice,
    ]);
    noticeTimers.current.set(
      notice.id,
      setTimeout(() => dismiss(notice.id), assignment ? UNDO_DURATION : 4000),
    );
  }
  function stopAnimation(id: string) {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setCompleting((p) => {
      const next = { ...p };
      delete next[id];
      return next;
    });
  }
  function showCompletion(previous: Assignment, next: Assignment) {
    setCompleting((p) => ({ ...p, [next.id]: previous }));
    clearTimeout(timers.current.get(next.id));
    timers.current.set(
      next.id,
      setTimeout(() => stopAnimation(next.id), COMPLETION_DELAY),
    );
    notify(`已完成「${next.title}」`, next);
  }
  function saveAssignment(draft: Assignment) {
    const d = dataRef.current;
    if (!d) return false;
    const old = d.assignments.find((x) => x.id === draft.id);
    let next = draft;
    if (draft.status === 'Completed' && old?.status !== 'Completed') {
      // Draft metadata also captures unsaved progress immediately before completing in the editor.
      next = {
        ...completeAssignment(
          old ?? { ...draft, status: 'Not Started', progress: 0 },
        ),
        ...draft,
        completedAt: draft.completedAt ?? new Date().toISOString(),
        previousStatus:
          draft.previousStatus ??
          (old?.status as Assignment['previousStatus']) ??
          'Not Started',
        previousProgress: draft.previousProgress ?? old?.progress ?? 0,
        progress: 100,
      };
    }
    if (
      !commit({
        ...d,
        assignments: old
          ? d.assignments.map((x) => (x.id === next.id ? next : x))
          : [...d.assignments, next],
      })
    )
      return false;
    if (next.status === 'Completed' && old?.status !== 'Completed')
      showCompletion(
        old ?? {
          ...next,
          status: next.previousStatus ?? 'Not Started',
          progress: next.previousProgress ?? 0,
        },
        next,
      );
    else {
      stopAnimation(next.id);
      notify('作业已保存');
    }
    return true;
  }
  function toggleCompletion(a: Assignment) {
    const d = dataRef.current;
    const current = d?.assignments.find((x) => x.id === a.id);
    if (!d || !current) return;
    const next =
      current.status === 'Completed'
        ? restoreAssignment(current)
        : completeAssignment(current);
    if (
      !commit({
        ...d,
        assignments: d.assignments.map((x) => (x.id === next.id ? next : x)),
      })
    )
      return;
    if (next.status === 'Completed') showCompletion(current, next);
    else {
      stopAnimation(next.id);
      setNotices((n) => n.filter((x) => x.assignmentId !== next.id));
      notify(`已恢复「${next.title}」`);
    }
  }
  function undo(notice: Notice) {
    const a = dataRef.current?.assignments.find(
      (x) => x.id === notice.assignmentId,
    );
    if (a?.status === 'Completed' && a.completedAt === notice.completedAt)
      toggleCompletion(a);
    dismiss(notice.id);
  }
  function deleteRecord(kind: 'course' | 'assignment', id: string) {
    const d = dataRef.current;
    if (!d) return false;
    const removed = d.assignments
      .filter((a) => (kind === 'course' ? a.courseId === id : a.id === id))
      .map((a) => a.id);
    const next = {
      ...d,
      courses:
        kind === 'course' ? d.courses.filter((c) => c.id !== id) : d.courses,
      assignments: d.assignments.filter((a) => !removed.includes(a.id)),
    };
    if (!commit(next)) return false;
    removed.forEach(stopAnimation);
    setNotices((n) => n.filter((x) => !removed.includes(x.assignmentId ?? '')));
    notify('已删除');
    return true;
  }
  return {
    data,
    error,
    commit,
    notices,
    notify,
    dismiss,
    undo,
    completing,
    saveAssignment,
    toggleCompletion,
    deleteRecord,
    visibleAssignments:
      data?.assignments.map((a) => completing[a.id] ?? a) ?? [],
  };
}
