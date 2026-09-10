'use client';
import { t } from '@/lib/i18n';
import { useState } from 'react';
import { RecurrenceControls } from './recurrence-controls';
import { generateOccurrences, shiftedSeriesStart } from '@/lib/recurrence';
import type {
  RecurrenceRule,
  RecurrenceScope,
  RecurrenceSeries,
} from '@/types/planner';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import {
  Assignment,
  Course,
  priorities,
  statuses,
  assignmentTypes,
} from '@/types/planner';
import { Choice } from './controls';
import { dateKey } from '@/lib/dates';
import { changeStatus, completeAssignment } from '@/lib/completion';
export function AssignmentEditor({
  item,
  courses,
  close,
  save,
  restore,
  remove,
  duplicate,
  series,
}: {
  item: Partial<Assignment>;
  series?: RecurrenceSeries;
  courses: Course[];
  close: () => void;
  save: (a: Assignment, rule?: RecurrenceRule, scope?: RecurrenceScope) => void;
  duplicate: (a: Assignment) => void;
  restore: (a: Assignment) => void;
  remove: (a: Assignment) => void;
}) {
  const [a, setA] = useState({
    ...item,
    courseId: item.courseId || courses[0]?.id || '',
    priority: item.priority || 'Medium',
    type: item.type || 'Homework',
    progress: item.progress || 0,
    status: item.status || 'Not Started',
    estimatedMinutes: item.estimatedMinutes ?? 60,
  });
  const [rule, setRule] = useState<RecurrenceRule | undefined>(
    series?.rule ?? item.recurrenceRule,
  );
  const [scope, setScope] = useState<RecurrenceScope>('one');
  const [validation, setValidation] = useState('');
  const due = new Date(item.dueDate || new Date());
  const [date, setDate] = useState(dateKey(due));
  const [time, setTime] = useState(
    item.dueDate
      ? `${String(due.getHours()).padStart(2, '0')}:${String(due.getMinutes()).padStart(2, '0')}`
      : '23:59',
  );
  const baseRule = series?.rule ?? item.recurrenceRule;
  const recurrenceStart =
    scope === 'all' && series && item.dueDate && date && time
      ? shiftedSeriesStart(
          series.startDate,
          item.dueDate,
          new Date(`${date}T${time}`).toISOString(),
        )
      : `${date}T${time}`;
  const patch = (v: Partial<Assignment>) => setA((x) => ({ ...x, ...v }));
  return (
    <Dialog open onOpenChange={(v) => !v && close()}>
      <DialogContent className="editor sm:max-w-lg">
        <DialogTitle>{item.id ? t('编辑作业') : t('添加作业')}</DialogTitle>
        <DialogDescription>
          {item.id
            ? t('更新计划，让下一步更清楚。')
            : t('记下截止时间，安排好接下来的任务。')}
        </DialogDescription>
        <form
          onInvalidCapture={(e) => {
            const field = e.target as HTMLInputElement;
            field.setCustomValidity(t('必填'));
          }}
          onInputCapture={(e) => {
            const field = e.target as HTMLInputElement;
            field.setCustomValidity?.('');
          }}
          onSubmit={(e) => {
            e.preventDefault();
            if (!a.title?.trim() || !a.courseId) {
              setValidation('请输入作业名称并选择课程');
              return;
            }
            if (!Number.isFinite(new Date(`${date}T${time}`).getTime())) {
              setValidation('请填写有效的截止日期和时间');
              return;
            }
            if (rule && (!item.recurrenceSeriesId || scope !== 'one')) {
              try {
                generateOccurrences(recurrenceStart, rule);
              } catch (e) {
                setValidation((e as Error).message);
                return;
              }
            }
            setValidation('');
            const now = new Date().toISOString();
            save(
              {
                ...a,
                title: a.title.trim(),
                id: item.id || crypto.randomUUID(),
                dueDate: new Date(`${date}T${time}`).toISOString(),
                createdAt: item.createdAt || now,
                updatedAt: now,
              } as Assignment,
              rule,
              scope,
            );
          }}
        >
          {item.recurrenceSeriesId && (
            <div className="series-scope">
              <Choice
                label={t('你想修改哪些作业？')}
                value={scope}
                onChange={(v) => {
                  setScope(v as RecurrenceScope);
                  setRule(
                    baseRule
                      ? {
                          ...baseRule,
                          ...(v === 'future' && baseRule.count
                            ? {
                                count: Math.max(
                                  1,
                                  baseRule.count - (item.occurrenceIndex ?? 0),
                                ),
                              }
                            : {}),
                        }
                      : undefined,
                  );
                }}
                options={[
                  { value: 'one', label: t('仅修改这一次') },
                  { value: 'future', label: t('修改这次及之后') },
                  { value: 'all', label: t('修改整个系列') },
                ]}
              />
              <p className="recurrence-help">
                {t(scope === 'one' ? '仅本次重复说明' : '系列编辑说明')}
              </p>
            </div>
          )}
          {validation && (
            <p role="alert" className="error-banner">
              {t(validation)}
            </p>
          )}
          <label className="field">
            {t('作业名称')}
            <input
              required
              maxLength={180}
              placeholder={t('例如：数据结构项目 3')}
              value={a.title || ''}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </label>
          <Choice
            label={t('课程')}
            value={a.courseId}
            onChange={(courseId) => patch({ courseId })}
            options={courses.map((c) => ({
              value: c.id,
              label: `${c.code} — ${c.name}`,
            }))}
          />
          <div className="form-grid">
            <label className="field">
              {t('截止日期')}
              <input
                required
                type="date"
                value={date}
                onInput={(e) => setDate(e.currentTarget.value)}
              />
            </label>
            <label className="field">
              {t('截止时间')}
              <input
                required
                type="time"
                value={time}
                onInput={(e) => setTime(e.currentTarget.value)}
              />
            </label>
          </div>
          {(!item.recurrenceSeriesId || scope !== 'one') && (
            <RecurrenceControls
              rule={rule}
              change={setRule}
              start={recurrenceStart}
            />
          )}
          <>
            {item.status === 'Completed' && a.status === 'Completed' && (
              <div className="editor-completed">
                <span>{t('✓ 已完成')}</span>
                <button
                  type="button"
                  className="restore-button"
                  onClick={() => restore(item as Assignment)}
                >
                  {t('恢复任务')}
                </button>
              </div>
            )}
          </>
          <details open={!!item.id}>
            <summary>{t('更多详情 · 优先级、进度与备注')}</summary>
            <div className="form-grid">
              <Choice
                label={t('优先级')}
                value={a.priority}
                onChange={(v) =>
                  patch({ priority: v as Assignment['priority'] })
                }
                options={[...priorities]}
              />
              <Choice
                label={t('类型')}
                value={a.type}
                onChange={(v) => patch({ type: v as Assignment['type'] })}
                options={[...assignmentTypes]}
              />
              <label className="field">
                {t('预计耗时（分钟）')}
                <input
                  type="number"
                  min="0"
                  max="100000"
                  value={a.estimatedMinutes}
                  onChange={(e) =>
                    patch({ estimatedMinutes: Number(e.target.value) })
                  }
                />
              </label>
              <Choice
                label={t('状态')}
                value={a.status}
                onChange={(v) =>
                  setA((x) =>
                    changeStatus(x as Assignment, v as Assignment['status']),
                  )
                }
                options={[...statuses]}
              />
            </div>
            <label className="field">
              {t('完成进度 ·')}
              {a.progress}%
              <Slider
                aria-label={t('完成进度')}
                value={[a.progress]}
                onValueChange={(v) => {
                  const n = Array.isArray(v) ? v[0] : v;
                  setA((x) =>
                    n === 100
                      ? completeAssignment(x as Assignment)
                      : {
                          ...changeStatus(
                            x as Assignment,
                            n ? 'In Progress' : 'Not Started',
                          ),
                          progress: n,
                        },
                  );
                }}
                min={0}
                max={100}
                step={5}
              />
            </label>
            <label className="field">
              {t('备注')}
              <textarea
                rows={3}
                value={a.description || ''}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder={t('写下要求、参考链接或下一步要做的事…')}
              />
            </label>
          </details>
          {item.id && (
            <button
              type="button"
              className="text-button duplicate-action"
              onClick={() => duplicate(item as Assignment)}
            >
              {t('复制到下周')}
            </button>
          )}
          <div className="form-actions">
            {item.id && (
              <button
                type="button"
                className="danger-text"
                onClick={() => remove(item as Assignment)}
              >
                {t('删除')}
              </button>
            )}
            <button type="button" className="secondary-button" onClick={close}>
              {t('取消')}
            </button>
            <button className="primary" disabled={!courses.length}>
              {t('保存作业')}
            </button>
          </div>
          {!courses.length && <p>{t('请先添加一门课程，再创建作业。')}</p>}
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function CourseEditor({
  item,
  close,
  save,
  remove,
}: {
  item: Partial<Course>;
  close: () => void;
  save: (c: Course) => void;
  remove: (c: Course) => void;
}) {
  const [c, setC] = useState({ ...item, color: item.color || '#4c73db' });
  return (
    <Dialog open onOpenChange={(v) => !v && close()}>
      <DialogContent className="editor sm:max-w-lg">
        <DialogTitle>{item.id ? t('编辑课程') : t('添加课程')}</DialogTitle>
        <DialogDescription>
          {t('将这个学期的作业按课程整理好。')}
        </DialogDescription>
        <form
          onInvalidCapture={(e) => {
            const field = e.target as HTMLInputElement;
            field.setCustomValidity(t('必填'));
          }}
          onInputCapture={(e) => {
            const field = e.target as HTMLInputElement;
            field.setCustomValidity?.('');
          }}
          onSubmit={(e) => {
            e.preventDefault();
            if (!c.name?.trim() || !c.code?.trim()) return;
            save({
              ...c,
              name: c.name.trim(),
              code: c.code.trim(),
              id: item.id || crypto.randomUUID(),
              createdAt: item.createdAt || new Date().toISOString(),
            } as Course);
          }}
        >
          <label className="field">
            {t('课程名称')}
            <input
              required
              value={c.name || ''}
              onChange={(e) => setC({ ...c, name: e.target.value })}
            />
          </label>
          <div className="form-grid">
            <label className="field">
              {t('课程代码')}
              <input
                required
                value={c.code || ''}
                onChange={(e) => setC({ ...c, code: e.target.value })}
              />
            </label>
            <label className="field">
              {t('课程颜色')}
              <input
                aria-label={t('课程颜色')}
                type="color"
                value={c.color}
                onChange={(e) => setC({ ...c, color: e.target.value })}
              />
            </label>
          </div>
          <label className="field">
            {t('授课教师（选填）')}
            <input
              value={c.professor || ''}
              onChange={(e) => setC({ ...c, professor: e.target.value })}
            />
          </label>
          <label className="field">
            {t('课程网站（选填）')}
            <input
              type="url"
              pattern="https?://.*"
              placeholder="https://…"
              value={c.website || ''}
              onChange={(e) => setC({ ...c, website: e.target.value })}
            />
          </label>
          <div className="form-actions">
            {item.id && (
              <button
                type="button"
                className="danger-text"
                onClick={() => remove(item as Course)}
              >
                {t('删除')}
              </button>
            )}
            <button type="button" className="secondary-button" onClick={close}>
              {t('取消')}
            </button>
            <button className="primary">{t('保存课程')}</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
