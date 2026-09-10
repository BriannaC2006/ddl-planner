import { completeAssignment, changeStatus } from './completion.ts';
import type {
  Assignment,
  PlannerData,
  RecurrenceRule,
  RecurrenceScope,
  RecurrenceSeries,
} from '../types/planner.ts';
export const MAX_OCCURRENCES = 366;
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayNumber = (d: Date) =>
  Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;
export function generateOccurrences(
  start: string,
  rule: RecurrenceRule,
): string[] {
  const first = new Date(start);
  if (
    !Number.isFinite(first.getTime()) ||
    !Number.isInteger(rule.interval) ||
    rule.interval < 1 ||
    rule.interval > 365
  )
    throw Error('重复间隔必须是 1–365 的整数');
  if (!rule.endDate && !rule.count) throw Error('请选择结束日期或重复次数');
  if (
    rule.count !== undefined &&
    (!Number.isInteger(rule.count) ||
      rule.count < 1 ||
      rule.count > MAX_OCCURRENCES)
  )
    throw Error('重复次数必须是 1–366 的整数');
  if (
    rule.endDate &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(rule.endDate) ||
      dayKey(new Date(rule.endDate + 'T12:00')) !== rule.endDate ||
      rule.endDate < dayKey(first))
  )
    throw Error('结束日期不能早于首次截止日期');
  const weekly = rule.unit === 'week';
  if (
    weekly &&
    (!rule.weekdays.length ||
      rule.weekdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6))
  )
    throw Error('请至少选择一个星期');
  const result: string[] = [];
  const monday = dayNumber(first) - ((first.getDay() + 6) % 7);
  // Iterate local calendar days, preserving the chosen wall-clock time over DST.
  for (let offset = 0; offset <= 366 * 365; offset++) {
    const d = new Date(first);
    d.setDate(first.getDate() + offset);
    if (rule.endDate && dayKey(d) > rule.endDate) break;
    const match = weekly
      ? Math.floor((dayNumber(d) - monday) / 7) % rule.interval === 0 &&
        rule.weekdays.includes(d.getDay())
      : offset % rule.interval === 0;
    if (match) {
      result.push(d.toISOString());
      if (result.length > MAX_OCCURRENCES)
        throw Error('最多生成 366 次，请缩短重复范围');
      if (rule.count && result.length >= rule.count) break;
    }
  }
  if (!result.length) throw Error('结束日期前没有符合条件的日期');
  return result;
}
export function duplicateNextWeek(
  a: Assignment,
  id = crypto.randomUUID(),
): Assignment {
  const date = new Date(a.dueDate);
  date.setDate(date.getDate() + 7);
  const {
    recurrenceSeriesId,
    occurrenceIndex,
    originalOccurrenceDate,
    recurrenceException,
    recurrenceRule,
    previousStatus,
    previousProgress,
    completedAt,
    ...content
  } = a;
  void recurrenceSeriesId;
  void occurrenceIndex;
  void originalOccurrenceDate;
  void recurrenceException;
  void recurrenceRule;
  void previousStatus;
  void previousProgress;
  void completedAt;
  const now = new Date().toISOString();
  return {
    ...content,
    id,
    dueDate: date.toISOString(),
    status: 'Not Started',
    progress: 0,
    createdAt: now,
    updatedAt: now,
  };
}
const fresh = (a: Assignment): Assignment => ({
  ...a,
  status: 'Not Started',
  progress: 0,
  previousStatus: undefined,
  previousProgress: undefined,
  completedAt: undefined,
  recurrenceException: false,
});
export function createSeries(
  data: PlannerData,
  a: Assignment,
  rule: RecurrenceRule,
  id = crypto.randomUUID(),
): PlannerData {
  const dates = generateOccurrences(a.dueDate, rule);
  const series: RecurrenceSeries = {
    id,
    rule,
    startDate: a.dueDate,
    template: fresh(a),
    excludedIndices: [],
  };
  const existing = data.assignments.find((x) => x.id === a.id);
  const assignments = dates.map((dueDate, i) => ({
    ...(i === 0 && existing ? a : fresh(a)),
    id: i === 0 && existing ? a.id : `${id}:${i}`,
    dueDate,
    recurrenceSeriesId: id,
    occurrenceIndex: i,
    originalOccurrenceDate: dueDate,
    recurrenceRule: rule,
  }));
  return {
    ...data,
    recurrenceSeries: [...(data.recurrenceSeries ?? []), series],
    assignments: [
      ...data.assignments.filter((x) => x.id !== a.id),
      ...assignments,
    ],
  };
}
export function updateSeries(
  data: PlannerData,
  draft: Assignment,
  scope: RecurrenceScope,
  rule: RecurrenceRule | undefined,
  now = new Date(),
): PlannerData {
  const old = data.assignments.find((a) => a.id === draft.id);
  if (!old) throw Error('找不到作业');
  if (scope === 'one' || !old.recurrenceSeriesId)
    return {
      ...data,
      assignments: data.assignments.map((a) =>
        a.id === draft.id
          ? {
              ...draft,
              recurrenceSeriesId: old.recurrenceSeriesId,
              occurrenceIndex: old.occurrenceIndex,
              originalOccurrenceDate: old.originalOccurrenceDate,
              recurrenceRule: old.recurrenceRule,
              recurrenceException: !!old.recurrenceSeriesId,
            }
          : a,
      ),
    };
  const series = data.recurrenceSeries?.find(
    (s) => s.id === old.recurrenceSeriesId,
  );
  if (!series) throw Error('找不到重复系列');
  const firstIndex = scope === 'future' ? (old.occurrenceIndex ?? 0) : 0;
  const members = data.assignments
    .filter(
      (a) =>
        a.recurrenceSeriesId === series.id &&
        (a.occurrenceIndex ?? 0) >= firstIndex,
    )
    .sort((a, b) => (a.occurrenceIndex ?? 0) - (b.occurrenceIndex ?? 0));
  const sameRule = JSON.stringify(rule) === JSON.stringify(series.rule);
  const sameDate = draft.dueDate === old.dueDate;
  const sharedKeys = [
    'title',
    'description',
    'courseId',
    'priority',
    'estimatedMinutes',
    'type',
  ] as const;
  const changes: Partial<Assignment> = {};
  for (const k of sharedKeys)
    if (draft[k] !== old[k]) Object.assign(changes, { [k]: draft[k] });
  const applyState = (a: Assignment) => {
    let result = a;
    if (draft.status !== old.status)
      result =
        draft.status === 'Completed'
          ? completeAssignment(a)
          : changeStatus(a, draft.status);
    if (draft.progress !== old.progress && result.status !== 'Completed')
      result = { ...result, progress: draft.progress };
    return result;
  };
  const protectedState = (a: Assignment) =>
    a.status === 'Completed' || new Date(a.dueDate) < now;
  if (sameRule && sameDate) {
    return {
      ...data,
      assignments: data.assignments.map((a) =>
        members.includes(a)
          ? {
              ...a,
              ...changes,
              ...(!protectedState(a) ? applyState(a) : {}),
              ...changes,
              updatedAt: draft.updatedAt,
            }
          : a,
      ),
      recurrenceSeries: data.recurrenceSeries?.map((s) =>
        s.id === series.id
          ? { ...s, template: { ...s.template, ...changes } }
          : s,
      ),
    };
  }
  // A future edit splits the rule. Earlier occurrences and all their fields stay intact.
  const newId = scope === 'future' ? crypto.randomUUID() : series.id;
  const newRule = rule;
  let start = draft.dueDate;
  if (scope === 'all') {
    start = shiftedSeriesStart(series.startDate, old.dueDate, draft.dueDate);
  }
  const dates = newRule
    ? generateOccurrences(start, newRule)
    : members.map((a) => a.dueDate);
  const protectedMembers = members.filter(protectedState);
  const excluded = [
    ...new Set([
      ...series.excludedIndices
        .filter((i) => i >= firstIndex)
        .map((i) => i - firstIndex),
      ...(scope === 'future'
        ? protectedMembers.map((a) => (a.occurrenceIndex ?? 0) - firstIndex)
        : []),
    ]),
  ];
  const generated: Assignment[] = [];
  dates.forEach((dueDate, i) => {
    const slot = i + firstIndex;
    const existing = members.find((a) => a.occurrenceIndex === slot);
    if (excluded.includes(i) || (existing && protectedState(existing))) return;
    // Never silently resurrect deleted slots or create new historical work.
    if (!existing && new Date(dueDate) < now) return;
    const content = existing
      ? { ...applyState(existing), ...changes }
      : fresh({ ...draft, ...changes });
    generated.push({
      ...content,
      id: existing?.id ?? crypto.randomUUID(),
      dueDate,
      updatedAt: draft.updatedAt,
      recurrenceSeriesId: newRule ? newId : undefined,
      recurrenceRule: newRule,
      occurrenceIndex: newRule ? i : undefined,
      originalOccurrenceDate: newRule ? dueDate : undefined,
      recurrenceException: false,
    });
  });
  // Preserve completed and historical occurrences even if a shorter rule excludes their dates.
  const protectedUpdates = protectedMembers.map((a) => ({
    ...a,
    ...changes,
    recurrenceException: !!newRule,
    ...(!newRule
      ? {
          recurrenceSeriesId: undefined,
          recurrenceRule: undefined,
          occurrenceIndex: undefined,
          originalOccurrenceDate: undefined,
        }
      : {}),
  }));
  const remaining = data.assignments.filter((a) => !members.includes(a));
  const definitions = (data.recurrenceSeries ?? []).filter(
    (s) => s.id !== series.id,
  );
  if (scope === 'future')
    definitions.push({
      ...series,
      rule: { ...series.rule, count: firstIndex || 1 },
      excludedIndices: series.excludedIndices.filter((i) => i < firstIndex),
    });
  if (newRule)
    definitions.push({
      id: newId,
      rule: newRule,
      startDate: start,
      template: fresh(draft),
      excludedIndices: excluded,
    });
  return {
    ...data,
    recurrenceSeries: definitions,
    assignments: [...remaining, ...protectedUpdates, ...generated],
  };
}
export function deleteOccurrences(
  data: PlannerData,
  a: Assignment,
  scope: RecurrenceScope,
): PlannerData {
  const affected = (x: Assignment) =>
    x.id === a.id ||
    (!!a.recurrenceSeriesId &&
      x.recurrenceSeriesId === a.recurrenceSeriesId &&
      (scope === 'all' ||
        (scope === 'future' &&
          (x.occurrenceIndex ?? 0) >= (a.occurrenceIndex ?? 0))));
  const removed = data.assignments.filter(affected);
  return {
    ...data,
    assignments: data.assignments.filter((x) => !affected(x)),
    recurrenceSeries: data.recurrenceSeries
      ?.filter((s) => !(scope === 'all' && s.id === a.recurrenceSeriesId))
      .map((s) =>
        s.id === a.recurrenceSeriesId
          ? {
              ...s,
              excludedIndices: [
                ...new Set([
                  ...s.excludedIndices,
                  ...removed.map((x) => x.occurrenceIndex ?? 0),
                ]),
              ],
            }
          : s,
      ),
  };
}

export function shiftedSeriesStart(
  start: string,
  original: string,
  edited: string,
) {
  const d = new Date(start),
    o = new Date(original),
    n = new Date(edited);
  d.setDate(d.getDate() + dayNumber(n) - dayNumber(o));
  d.setHours(n.getHours(), n.getMinutes(), 0, 0);
  return d.toISOString();
}
