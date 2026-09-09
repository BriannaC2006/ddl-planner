'use client';
import { useState } from 'react';
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
}: {
  item: Partial<Assignment>;
  courses: Course[];
  close: () => void;
  save: (a: Assignment) => void;
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
  const due = new Date(item.dueDate || new Date());
  const [date, setDate] = useState(dateKey(due));
  const [time, setTime] = useState(
    item.dueDate
      ? `${String(due.getHours()).padStart(2, '0')}:${String(due.getMinutes()).padStart(2, '0')}`
      : '23:59',
  );
  const patch = (v: Partial<Assignment>) => setA((x) => ({ ...x, ...v }));
  return (
    <Dialog open onOpenChange={(v) => !v && close()}>
      <DialogContent className="editor sm:max-w-lg">
        <DialogTitle>{item.id ? '编辑作业' : '添加作业'}</DialogTitle>
        <DialogDescription>
          {item.id
            ? '更新计划，让下一步更清楚。'
            : '记下截止时间，安排好接下来的任务。'}
        </DialogDescription>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!a.title?.trim() || !a.courseId) return;
            const now = new Date().toISOString();
            save({
              ...a,
              title: a.title.trim(),
              id: item.id || crypto.randomUUID(),
              dueDate: new Date(`${date}T${time}`).toISOString(),
              createdAt: item.createdAt || now,
              updatedAt: now,
            } as Assignment);
          }}
        >
          <label className="field">
            作业名称
            <input
              required
              maxLength={180}
              placeholder="例如：数据结构项目 3"
              value={a.title || ''}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </label>
          <Choice
            label="课程"
            value={a.courseId}
            onChange={(courseId) => patch({ courseId })}
            options={courses.map((c) => ({
              value: c.id,
              label: `${c.code} — ${c.name}`,
            }))}
          />
          <div className="form-grid">
            <label className="field">
              截止日期
              <input
                required
                type="date"
                value={date}
                onInput={(e) => setDate(e.currentTarget.value)}
              />
            </label>
            <label className="field">
              截止时间
              <input
                required
                type="time"
                value={time}
                onInput={(e) => setTime(e.currentTarget.value)}
              />
            </label>
          </div>
          <>
            {item.status === 'Completed' && a.status === 'Completed' && (
              <div className="editor-completed">
                <span>✓ 已完成</span>
                <button
                  type="button"
                  className="restore-button"
                  onClick={() => restore(item as Assignment)}
                >
                  恢复任务
                </button>
              </div>
            )}
          </>
          <details open={!!item.id}>
            <summary>更多详情 · 优先级、进度与备注</summary>
            <div className="form-grid">
              <Choice
                label="优先级"
                value={a.priority}
                onChange={(v) =>
                  patch({ priority: v as Assignment['priority'] })
                }
                options={[...priorities]}
              />
              <Choice
                label="类型"
                value={a.type}
                onChange={(v) => patch({ type: v as Assignment['type'] })}
                options={[...assignmentTypes]}
              />
              <label className="field">
                预计耗时（分钟）
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
                label="状态"
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
              完成进度 · {a.progress}%
              <Slider
                aria-label="完成进度"
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
              备注
              <textarea
                rows={3}
                value={a.description || ''}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="写下要求、参考链接或下一步要做的事…"
              />
            </label>
          </details>
          <div className="form-actions">
            {item.id && (
              <button
                type="button"
                className="danger-text"
                onClick={() => remove(item as Assignment)}
              >
                删除
              </button>
            )}
            <button type="button" className="secondary-button" onClick={close}>
              取消
            </button>
            <button className="primary" disabled={!courses.length}>
              保存作业
            </button>
          </div>
          {!courses.length && <p>请先添加一门课程，再创建作业。</p>}
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
        <DialogTitle>{item.id ? '编辑课程' : '添加课程'}</DialogTitle>
        <DialogDescription>将这个学期的作业按课程整理好。</DialogDescription>
        <form
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
            课程名称
            <input
              required
              value={c.name || ''}
              onChange={(e) => setC({ ...c, name: e.target.value })}
            />
          </label>
          <div className="form-grid">
            <label className="field">
              课程代码
              <input
                required
                value={c.code || ''}
                onChange={(e) => setC({ ...c, code: e.target.value })}
              />
            </label>
            <label className="field">
              课程颜色
              <input
                aria-label="课程颜色"
                type="color"
                value={c.color}
                onChange={(e) => setC({ ...c, color: e.target.value })}
              />
            </label>
          </div>
          <label className="field">
            授课教师（选填）
            <input
              value={c.professor || ''}
              onChange={(e) => setC({ ...c, professor: e.target.value })}
            />
          </label>
          <label className="field">
            课程网站（选填）
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
                删除
              </button>
            )}
            <button type="button" className="secondary-button" onClick={close}>
              取消
            </button>
            <button className="primary">保存课程</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
