'use client';
import { useState } from 'react';
import { useNow } from '@/hooks/use-now';
import {
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Sparkles,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { t } from '@/lib/i18n';
import { Progress } from '@/components/ui/progress';
import { Assignment, Course } from '@/types/planner';
import {
  dateKey,
  relativeDate,
  exactDate,
  compactDate,
  dateLabel,
  hours,
} from '@/lib/dates';
import { urgency, urgencyLabel } from '@/lib/urgency';
import { Blank } from './controls';
export type ViewProps = {
  assignments: Assignment[];
  courses: Course[];
  edit: (a: Assignment) => void;
  complete: (a: Assignment) => void;
  completing?: Record<string, Assignment>;
};
export function AssignmentRow({
  a,
  courses,
  edit,
  complete,
  completing = {},
}: Omit<ViewProps, 'assignments'> & { a: Assignment }) {
  const c = courses.find((c) => c.id === a.courseId);
  const pending = !!completing[a.id];
  const done = a.status === 'Completed' || pending;
  return (
    <div
      data-assignment-id={a.id}
      className={`assignment-row ${done ? 'completed' : ''} ${pending ? 'is-completing' : ''}`}
    >
      <button
        className="row-details-target"
        aria-label={t('查看作业「{0}」', { '0': a.title })}
        onClick={() => edit(a)}
      />
      <Checkbox
        className="complete-button"
        checked={done}
        aria-label={t('{0}「{1}」', {
          '0': done ? t('恢复任务') : t('标记完成'),
          '1': a.title,
        })}
        onClick={(e) => e.stopPropagation()}
        onCheckedChange={() => complete(a)}
      />
      <div className="assignment-title">
        <h3>{a.title}</h3>
        <p>
          <i className="course-dot" style={{ background: c?.color }} />
          {c?.code} <span>· {t(a.type)}</span>
          {a.recurrenceSeriesId && (
            <span
              className="repeat-badge"
              title={t(a.recurrenceException ? '单次例外' : '循环')}
            >
              {' '}
              ↻{' '}
              {t(
                a.recurrenceRule?.frequency === 'daily'
                  ? '每天'
                  : a.recurrenceRule?.frequency === 'biweekly'
                    ? '每两周'
                    : a.recurrenceRule?.frequency === 'custom'
                      ? '自定义'
                      : '每周',
              )}
            </span>
          )}
        </p>
      </div>
      <div className="row-deadline">
        <span
          className={urgencyLabel(a) === 'Overdue' && !done ? 'overdue' : ''}
        >
          {done ? t('已完成') : relativeDate(a.dueDate)}
        </span>
        <small title={exactDate(a.dueDate)}>
          {t('截止：')}
          {compactDate(a.dueDate)}
        </small>
      </div>
      <span className={`badge priority-${a.priority.toLowerCase()}`}>
        ● {t('priority.label', { priority: t(a.priority) })}
      </span>
      <span className="row-hours">
        <Clock3 size={14} />
        {hours(a.estimatedMinutes)}
      </span>
      <span className="row-status">{done ? t('已完成') : t(a.status)}</span>
      {done ? (
        <button
          className="restore-button"
          onClick={(e) => {
            e.stopPropagation();
            complete(a);
          }}
          aria-label={t('恢复任务「{0}」', { '0': a.title })}
        >
          {t('恢复任务')}
        </button>
      ) : (
        <button
          className="icon-button"
          aria-label={t('编辑作业「{0}」', { '0': a.title })}
          onClick={(e) => {
            e.stopPropagation();
            edit(a);
          }}
        >
          <ArrowUpRight size={17} />
        </button>
      )}
    </div>
  );
}
export function Dashboard(
  props: ViewProps & {
    viewAll: () => void;
    completedAssignments: Assignment[];
    viewCompleted: () => void;
  },
) {
  const now = useNow();
  const active = props.assignments
    .filter((a) => a.status !== 'Completed')
    .sort((a, b) => urgency(b) - urgency(a));
  const focus = active[0];
  const todayCompleted = props.completedAssignments
    .filter(
      (a) =>
        a.completedAt &&
        dateKey(a.completedAt) === dateKey(new Date()) &&
        !props.completing?.[a.id],
    )
    .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
  const course = props.courses.find((c) => c.id === focus?.courseId);
  const start = new Date();
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return {
      date: d,
      h: active
        .filter((a) => dateKey(a.dueDate) === dateKey(d))
        .reduce(
          (n, a) => n + (a.estimatedMinutes / 60) * (1 - a.progress / 100),
          0,
        ),
    };
  });
  const total = days.reduce((n, d) => n + d.h, 0);
  const dueSoon = active.filter(
    (a) => new Date(a.dueDate).getTime() - now < 7 * 86400000,
  ).length;
  return (
    <>
      <div className="stats-strip">
        <span>
          <span className="stat-icon">
            <ListIcon />
          </span>
          <b>{dueSoon}</b>
          {t('项本周截止')}
        </span>
        <span>
          <Clock3 size={18} />
          <b>{hours(total * 60)}</b>
          {t('本周剩余')}
        </span>
        <span>
          <CheckCheck size={18} />
          <b>{props.completedAssignments.length}</b>
          {t('项已完成')}
        </span>
      </div>
      <div className="dashboard-grid">
        {focus ? (
          <section
            className={`focus ${props.completing?.[focus.id] ? 'is-completing' : ''}`}
          >
            <div className="section-label">
              <Sparkles size={18} />
              {t('接下来做什么？')}
              <span>{t(urgencyLabel(focus))}</span>
            </div>
            <p className="course-tag">
              <i className="course-dot" style={{ background: course?.color }} />
              {course?.code} · {course?.name}
            </p>
            <button className="focus-title" onClick={() => props.edit(focus)}>
              <h2>{focus.title}</h2>
            </button>
            <p className={urgencyLabel(focus) === 'Overdue' ? 'overdue' : ''}>
              {props.completing?.[focus.id]
                ? t('已完成')
                : relativeDate(focus.dueDate)}
            </p>
            <p className="exact-focus">{exactDate(focus.dueDate)}</p>
            <div className="focus-meta">
              <span>
                {t('priority.label', { priority: t(focus.priority) })}
              </span>
              <span>
                {t('◷ 预计')}
                {hours(focus.estimatedMinutes)}
              </span>
              <span>
                {props.completing?.[focus.id] ? t('已完成') : t(focus.status)}
              </span>
            </div>
            <div className="progress-label">
              <span>{t('完成进度')}</span>
              <b>{props.completing?.[focus.id] ? 100 : focus.progress}%</b>
            </div>
            <Progress
              value={props.completing?.[focus.id] ? 100 : focus.progress}
              aria-label={t('{0} 完成进度', { '0': focus.title })}
            />
            <div className="focus-actions">
              <button
                className="white-button"
                onClick={() => props.edit(focus)}
              >
                {t('继续作业')}
                <ArrowUpRight size={17} />
              </button>
              <button
                className="focus-complete"
                onClick={() => props.complete(focus)}
              >
                <Check size={16} />
                {props.completing?.[focus.id] ? t('恢复任务') : t('标记完成')}
              </button>
            </div>
          </section>
        ) : (
          <section className="focus">
            <Blank
              title={t('暂时没有待完成的作业 🎉')}
              description={t('手头的任务都完成了，给自己一点休息时间。')}
            />
          </section>
        )}
        <section className="panel workload">
          <div className="section-heading">
            <h2>{t('本周任务量')}</h2>
            <span className="week-label">
              {dateLabel(start, { month: 'numeric', day: 'numeric' })} –{' '}
              {days[6].date.getDate()}
            </span>
          </div>
          <p>{t('按截止日期统计剩余耗时（小时）')}</p>
          <div className="bars">
            {days.map(({ date, h }) => (
              <div
                key={dateKey(date)}
                className={
                  dateKey(date) === dateKey(new Date()) ? 'today-bar' : ''
                }
              >
                <b>{Math.round(h * 10) / 10}</b>
                <i
                  style={{
                    height: Math.max(
                      4,
                      (h / Math.max(...days.map((d) => d.h), 1)) * 105,
                    ),
                  }}
                />
                <span>{dateLabel(date, { weekday: 'short' })}</span>
              </div>
            ))}
          </div>
          <p className="workload-foot">
            <span className="course-dot" />
            {t('workload.pace', { duration: hours(total * 60) })}
          </p>
        </section>
      </div>
      <section className="panel upcoming">
        <div className="section-heading">
          <h2>
            {t('近期截止')}
            <span className="count">{active.length}</span>
          </h2>
          <button className="text-button" onClick={props.viewAll}>
            {t('查看全部作业')}
            <ArrowUpRight size={15} />
          </button>
        </div>
        {active.length ? (
          active
            .slice(0, 5)
            .map((a) => <AssignmentRow key={a.id} a={a} {...props} />)
        ) : (
          <Blank
            title={t('近期没有要截止的作业 🎉')}
            description={t('有新任务时，记得添加到这里。')}
          />
        )}
      </section>
      <Collapsible className="panel completed-today">
        <div className="section-heading">
          <CollapsibleTrigger className="completed-toggle">
            {t('completed.today', { count: todayCompleted.length })}
            <ChevronDown size={17} />
          </CollapsibleTrigger>
          <button className="text-button" onClick={props.viewCompleted}>
            {t('查看全部已完成')}
            <ArrowUpRight size={15} />
          </button>
        </div>
        <CollapsibleContent>
          {todayCompleted.length ? (
            todayCompleted.map((a) => (
              <AssignmentRow key={a.id} a={a} {...props} />
            ))
          ) : (
            <Blank
              title={t('今天还没有完成的作业。')}
              description={t('完成一项后，会记录在这里。')}
            />
          )}
        </CollapsibleContent>
      </Collapsible>
      <p className="dashboard-note">{t('一次专注一项，慢慢也能走很远。')}</p>
    </>
  );
}
function ListIcon() {
  return <Check size={17} />;
}
export function Agenda(props: ViewProps) {
  const now = useNow();
  const sorted = [...props.assignments].sort((a, b) =>
    a.dueDate.localeCompare(b.dueDate),
  );
  const groups = Map.groupBy(sorted, (a) => dateKey(a.dueDate));
  return sorted.length ? (
    <div className="agenda">
      {Array.from(groups).map(([date, items]) => (
        <section key={date}>
          <div className="agenda-date">
            <span>{new Date(date + 'T12:00').getDate()}</span>
            <div>
              <b>
                {date === dateKey(new Date())
                  ? t('今天')
                  : date === dateKey(new Date(now + 86400000))
                    ? t('明天')
                    : dateLabel(date + 'T12:00', { weekday: 'short' })}
              </b>
              <p>
                {dateLabel(date + 'T12:00', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="panel">
            {items.map((a) => (
              <AssignmentRow key={a.id} a={a} {...props} />
            ))}
          </div>
        </section>
      ))}
    </div>
  ) : (
    <Blank
      title={t('暂时没有待完成的作业 🎉')}
      description={t('试试其他筛选条件，或添加下一项作业。')}
    />
  );
}
export function CalendarView({
  assignments,
  courses,
  edit,
  add,
}: {
  assignments: Assignment[];
  courses: Course[];
  edit: (a: Assignment) => void;
  add: (date: string) => void;
}) {
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const offset = (month.getDay() + 6) % 7;
  const dates = Array.from(
    {
      length:
        Math.ceil(
          (offset +
            new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) /
            7,
        ) * 7,
    },
    (_, i) => new Date(month.getFullYear(), month.getMonth(), i - offset + 1),
  );
  return (
    <section className="panel calendar-panel">
      <div className="section-heading">
        <h2>{dateLabel(month, { month: 'long', year: 'numeric' })}</h2>
        <div className="calendar-controls">
          <button
            className="secondary-button"
            onClick={() =>
              setMonth(
                new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              )
            }
          >
            {t('今天')}
          </button>
          <button
            className="icon-button"
            aria-label={t('上个月')}
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="icon-button"
            aria-label={t('下个月')}
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="calendar-scroll">
        <div className="month-grid">
          {[
            t('周一'),
            t('周二'),
            t('周三'),
            t('周四'),
            t('周五'),
            t('周六'),
            t('周日'),
          ].map((d) => (
            <div className="day-heading" key={d}>
              {d}
            </div>
          ))}
          {dates.map((d) => (
            <div
              key={dateKey(d)}
              className={`day-cell ${d.getMonth() !== month.getMonth() ? 'outside' : ''}`}
            >
              <button
                className={`date-button ${dateKey(d) === dateKey(new Date()) ? 'today-date' : ''}`}
                aria-label={t('在 {0} 添加作业', { '0': dateLabel(d) })}
                onClick={() => add(dateKey(d))}
              >
                {d.getDate()}
                <span>+</span>
              </button>
              {assignments
                .filter((a) => dateKey(a.dueDate) === dateKey(d))
                .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                .map((a) => {
                  const c = courses.find((c) => c.id === a.courseId);
                  return (
                    <button
                      key={a.id}
                      className={`calendar-event ${a.status === 'Completed' ? 'completed' : ''}`}
                      style={{
                        borderLeftColor: c?.color,
                        background: `${c?.color}15`,
                      }}
                      onClick={() => edit(a)}
                      title={`${a.title} · ${exactDate(a.dueDate)}`}
                    >
                      <b>{c?.code}</b>
                      <span>{a.title}</span>
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
      <p className="calendar-hint">
        {t('点击日期添加作业，点击作业查看或编辑详情。')}
      </p>
    </section>
  );
}
