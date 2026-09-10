'use client';
import { useEffect, useState } from 'react';
import {
  BookOpen,
  LayoutDashboard,
  CalendarDays,
  ListTodo,
  GraduationCap,
  Plus,
  Settings,
  ArrowUpRight,
  Library,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  Course,
  Assignment,
  PRODUCT_NAME,
  priorities,
  statuses,
} from '@/types/planner';
import { AssignmentEditor, CourseEditor } from '@/components/planner/editors';
import { Dashboard, Agenda, CalendarView } from '@/components/planner/views';
import { AssignmentList } from '@/components/planner/assignment-list';
import { Choice, Blank } from '@/components/planner/controls';
import { usePlanner } from '@/hooks/use-planner';
import {
  filterAssignments,
  type AssignmentFilters,
} from '@/lib/assignment-filters';
import { dateLabel } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/hooks/use-language';
import type { RecurrenceRule, RecurrenceScope } from '@/types/planner';
const pages = [
  'Dashboard',
  'Calendar',
  'Agenda',
  'Assignments',
  'Courses',
  'Settings',
] as const;
type Page = (typeof pages)[number];
const icons = [
  LayoutDashboard,
  CalendarDays,
  ListTodo,
  BookOpen,
  Library,
  Settings,
];
const defaultFilters: AssignmentFilters = {
  course: 'all',
  priority: 'all',
  status: 'active',
  sort: 'Deadline',
  search: '',
};
export default function Home() {
  return (
    <SidebarProvider
      style={{ '--sidebar-width': '240px' } as React.CSSProperties}
    >
      <Planner />
    </SidebarProvider>
  );
}
function Planner() {
  const { language, setLanguage } = useLanguage();
  const { setOpenMobile } = useSidebar();
  const {
    data,
    error,
    commit,
    notices,
    notify,
    dismiss,
    undo,
    completing,
    saveAssignment,
    saveRecurring,
    duplicate,
    toggleCompletion,
    deleteRecord,
    visibleAssignments,
  } = usePlanner();
  const [page, setPage] = useState<Page>('Dashboard');
  const [filters, setFilters] = useState<AssignmentFilters>(defaultFilters);
  const [calendarFilters, setCalendarFilters] =
    useState<AssignmentFilters>(defaultFilters);
  const [editing, setEditing] = useState<Partial<Assignment> | null>(null);
  const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(
    null,
  );
  const [deleting, setDeleting] = useState<{
    kind: 'course' | 'assignment';
    id: string;
    title: string;
    scope?: RecurrenceScope;
  } | null>(null);
  useEffect(() => {
    const update = () => {
      try {
        const hash = decodeURIComponent(location.hash.slice(1));
        if (pages.includes(hash as Page)) setPage(hash as Page);
      } catch {
        /* Keep the current page if the URL hash is malformed. */
      }
    };
    update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  const navigate = (p: Page) => {
    setPage(p);
    window.location.assign('#' + p);
    setOpenMobile(false);
  };
  const viewAll = () => {
    setFilters(defaultFilters);
    navigate('Assignments');
  };
  const viewCompleted = () => {
    setFilters({ ...defaultFilters, status: 'Completed' });
    navigate('Assignments');
  };
  const save = (
    a: Assignment,
    rule?: RecurrenceRule,
    scope: RecurrenceScope = 'one',
  ) => {
    if (a.recurrenceSeriesId || rule) {
      if (saveRecurring(a, rule, scope)) setEditing(null);
    } else if (saveAssignment(a)) setEditing(null);
  };
  const add = (date?: string) => {
    if (!data?.courses.length) {
      setEditingCourse({});
      setOpenMobile(false);
      notify('请先添加一门课程');
      return;
    }
    const course =
      page === 'Assignments' ? filters.course : calendarFilters.course;
    setEditing({
      courseId: course !== 'all' ? course : undefined,
      ...(date ? { dueDate: new Date(date + 'T23:59').toISOString() } : {}),
    });
  };
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (t: unknown, o: unknown) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'start_assignment_creation',
            description: t('打开添加作业表单，可预填名称；不会直接保存作业。'),
            inputSchema: {
              type: 'object',
              properties: { title: { type: 'string' } },
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false },
            execute: async (input: unknown) => {
              if (
                !input ||
                typeof input !== 'object' ||
                Object.keys(input).some((k) => k !== 'title') ||
                ('title' in input && typeof input.title !== 'string')
              )
                throw Error(t('作业名称必须为文本'));
              setEditing({ title: (input as { title?: string }).title || '' });
              return { opened: true };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, [language]);
  const courses = data?.courses ?? [];
  const filtered = filterAssignments(
    visibleAssignments,
    courses,
    page === 'Assignments' ? filters : calendarFilters,
  );
  const viewProps = {
    assignments: filtered,
    courses,
    edit: setEditing,
    complete: toggleCompletion,
    completing,
  };
  const openCourse = (id: string) => {
    setFilters({ ...defaultFilters, course: id });
    navigate('Assignments');
  };
  const subtitles = {
    Dashboard: t('理清截止时间，安心做好眼前这一项。'),
    Calendar: t('看看整个学期，为接下来的任务留出时间。'),
    Agenda: t('每天要做什么，一目了然。'),
    Assignments: t('待完成与已完成的作业，都能在这里找到。'),
    Courses: t('把这个学期的每一门课安排好。'),
    Settings: t('简单好用，专注于自己的节奏。'),
  };
  return (
    <>
      <Sidebar>
        <SidebarContent className="rail-content">
          <div className="brand">
            <GraduationCap />
            {PRODUCT_NAME}
            <span>{t('测试版')}</span>
          </div>
          <nav className="main-nav">
            {pages.slice(0, 5).map((p, i) => {
              const Icon = icons[i];
              return (
                <button
                  aria-current={page === p ? 'page' : undefined}
                  className={page === p ? 'active' : ''}
                  key={p}
                  onClick={() => navigate(p)}
                >
                  <Icon size={19} />
                  {t(p)}
                  {p === 'Assignments' && (
                    <span className="nav-count">
                      {data?.assignments.filter((a) => a.status !== 'Completed')
                        .length || 0}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
          <div className="section-heading course-heading">
            <p className="eyebrow">{t('我的课程')}</p>
            <button
              className="icon-button"
              aria-label={t('添加课程')}
              onClick={() => {
                setOpenMobile(false);
                setEditingCourse({});
              }}
            >
              <Plus size={16} />
            </button>
          </div>
          {courses.map((c) => (
            <button
              className={`course-link ${page === 'Assignments' && filters.course === c.id ? 'selected-course' : ''}`}
              key={c.id}
              onClick={() => openCourse(c.id)}
            >
              <i style={{ background: c.color }} />
              {c.code}
            </button>
          ))}
          <div className="sidebar-bottom">
            <div className="local-note">
              <CheckCircle2 size={16} />
              <div>
                {t('留一点空间，专心做事。')}
                <p>{t('一次完成一项任务。')}</p>
              </div>
            </div>
            <button
              className={page === 'Settings' ? 'active' : ''}
              onClick={() => navigate('Settings')}
            >
              <Settings size={18} />
              {t('设置')}
            </button>
            <div className="student-profile">
              <span className="avatar">{t('我')}</span>
              <div>
                {t('我的空间')}
                <p>{t('个人学习计划')}</p>
              </div>
            </div>
          </div>
        </SidebarContent>
      </Sidebar>
      <main className="workspace">
        <header>
          <div className="breadcrumb">
            <SidebarTrigger />
            <span>
              {t('我的空间')}
              <span className="slash">/</span> <b>{t(page)}</b>
            </span>
          </div>
          <span suppressHydrationWarning className="header-date">
            {dateLabel(new Date())}
          </span>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              {page === 'Dashboard' && (
                <p suppressHydrationWarning className="eyebrow">
                  {dateLabel(new Date())}
                </p>
              )}
              <h1>
                {page === 'Dashboard'
                  ? t('接下来做什么？')
                  : page === 'Agenda'
                    ? t('每天，都有条理。')
                    : page === 'Courses'
                      ? t('新学期，有条不紊。')
                      : t(page)}
              </h1>
              <p>{subtitles[page]}</p>
            </div>
            {page !== 'Settings' && (
              <button
                className="primary"
                onClick={() =>
                  page === 'Courses' ? setEditingCourse({}) : add()
                }
              >
                <Plus size={18} />
                {page === 'Courses' ? t('添加课程') : t('添加作业')}
              </button>
            )}
          </div>
          {error && (
            <div role="alert" className="error-banner">
              {t(error)}
            </div>
          )}
          {!data ? (
            <Blank
              title={error ? t('暂时无法读取计划') : t('正在打开你的计划…')}
              description={
                error
                  ? t('原始数据已保留。请检查浏览器的存储设置后重试。')
                  : t('请稍等。')
              }
            />
          ) : (
            <>
              {page === 'Dashboard' && (
                <Dashboard
                  assignments={visibleAssignments}
                  completedAssignments={data.assignments.filter(
                    (a) => a.status === 'Completed',
                  )}
                  courses={courses}
                  edit={setEditing}
                  complete={toggleCompletion}
                  completing={completing}
                  viewAll={viewAll}
                  viewCompleted={viewCompleted}
                />
              )}
              {['Calendar', 'Agenda'].includes(page) && (
                <div className="filters">
                  <Choice
                    label={t('课程')}
                    value={calendarFilters.course}
                    onChange={(course) =>
                      setCalendarFilters({ ...calendarFilters, course })
                    }
                    options={[
                      { value: 'all', label: t('全部课程') },
                      ...courses.map((c) => ({ value: c.id, label: c.code })),
                    ]}
                  />
                  <Choice
                    label={t('优先级')}
                    value={calendarFilters.priority}
                    onChange={(priority) =>
                      setCalendarFilters({ ...calendarFilters, priority })
                    }
                    options={[
                      { value: 'all', label: t('全部优先级') },
                      ...priorities,
                    ]}
                  />
                  <Choice
                    label={t('状态')}
                    value={calendarFilters.status}
                    onChange={(status) =>
                      setCalendarFilters({ ...calendarFilters, status })
                    }
                    options={[
                      { value: 'active', label: t('待完成') },
                      { value: 'all', label: t('全部') },
                      ...statuses,
                    ]}
                  />
                </div>
              )}
              {page === 'Assignments' && (
                <AssignmentList
                  {...viewProps}
                  filters={filters}
                  setFilters={setFilters}
                />
              )}
              {page === 'Agenda' && <Agenda {...viewProps} />}
              {page === 'Calendar' && <CalendarView {...viewProps} add={add} />}
              {page === 'Courses' &&
                (courses.length ? (
                  <div className="course-grid">
                    {courses.map((c) => (
                      <section
                        className="panel course-card"
                        style={{ borderTopColor: c.color }}
                        key={c.id}
                      >
                        <div className="section-heading">
                          <span
                            className="course-code"
                            style={{
                              color: c.color,
                              background: `${c.color}15`,
                            }}
                          >
                            {c.code}
                          </span>
                          <button
                            className="text-button"
                            aria-label={t('编辑课程「{0}」', { '0': c.code })}
                            onClick={() => setEditingCourse(c)}
                          >
                            {t('编辑')}
                            <ArrowUpRight size={15} />
                          </button>
                        </div>
                        <h2>{c.name}</h2>
                        <p>{c.professor || t('尚未填写授课教师')}</p>
                        <div className="course-card-foot">
                          <button
                            className="text-button"
                            onClick={() => openCourse(c.id)}
                          >
                            {
                              data.assignments.filter(
                                (a) =>
                                  a.courseId === c.id &&
                                  a.status !== 'Completed',
                              ).length
                            }{' '}
                            {t('项待完成作业')}
                            <ArrowUpRight size={15} />
                          </button>
                          {c.website && /^https?:\/\//i.test(c.website) && (
                            <a
                              href={c.website}
                              target="_blank"
                              rel="noreferrer"
                              className="text-button"
                            >
                              {t('课程网站 ↗')}
                            </a>
                          )}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <Blank
                    title={t('从第一门课程开始')}
                    description={t('添加课程，让这个学期更有条理。')}
                  />
                ))}
              {page === 'Settings' && (
                <section className="panel settings-panel">
                  <h2>{t('你的计划，随时在这里')}</h2>
                  <div className="setting-row">
                    <div>
                      <h3>{t('语言')}</h3>
                      <p>{t('语言说明')}</p>
                    </div>
                    <Choice
                      label={t('语言')}
                      value={language}
                      onChange={(v) => setLanguage(v as 'en' | 'zh-CN')}
                      options={[
                        { value: 'zh-CN', label: '中文' },
                        { value: 'en', label: 'English' },
                      ]}
                    />
                  </div>
                  <p>
                    {t(
                      '课程与作业会自动保存在当前设备的浏览器中，无需注册账号。',
                    )}
                  </p>
                  <div className="setting-row">
                    <div>
                      <h3>{t('外观')}</h3>
                      <p>{t('清爽、明亮的学习空间。')}</p>
                    </div>
                    <span className="badge">{t('浅色模式')}</span>
                  </div>
                  <div className="setting-row">
                    <div>
                      <h3>{t('下一项推荐任务')}</h3>
                      <p>
                        {t(
                          '综合截止时间、优先级和剩余工作量，帮你选择下一项任务。已逾期且未完成的作业优先显示。',
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="setting-row">
                    <div>
                      <h3>{t('完成与恢复')}</h3>
                      <p>
                        {t(
                          '勾选后可以立即撤销，也可以随时到“作业 → 已完成”恢复任务。完成前的状态与进度会保留。',
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="setting-row">
                    <div>
                      <h3>{t('本地存储')}</h3>
                      <p>
                        {t(
                          '数据不会在不同浏览器或设备间同步。清除此网站的浏览器数据会移除你的计划。',
                        )}
                      </p>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
      {editing && data && (
        <AssignmentEditor
          key={editing.id || editing.dueDate || 'new'}
          item={editing}
          series={data.recurrenceSeries?.find(
            (s) => s.id === editing.recurrenceSeriesId,
          )}
          courses={courses}
          close={() => setEditing(null)}
          save={save}
          duplicate={(a) => {
            if (duplicate(a)) setEditing(null);
          }}
          restore={(a) => {
            toggleCompletion(a);
            setEditing(null);
          }}
          remove={(a) =>
            setDeleting({ kind: 'assignment', id: a.id, title: a.title })
          }
        />
      )}
      {editingCourse && data && (
        <CourseEditor
          key={editingCourse.id || 'new'}
          item={editingCourse}
          close={() => setEditingCourse(null)}
          save={(c) => {
            if (
              commit({
                ...data,
                courses: courses.some((x) => x.id === c.id)
                  ? courses.map((x) => (x.id === c.id ? c : x))
                  : [...courses, c],
              })
            ) {
              setEditingCourse(null);
              notify('课程已保存');
            }
          }}
          remove={(c) =>
            setDeleting({ kind: 'course', id: c.id, title: c.code })
          }
        />
      )}
      <AlertDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>
            {deleting?.kind === 'course'
              ? t('确定要删除这门课程吗？')
              : t('确定要删除这个作业吗？')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            「{deleting?.title}」
            {deleting?.kind === 'course'
              ? t('及其 {0} 项作业将被删除。', {
                  '0':
                    data?.assignments.filter((a) => a.courseId === deleting.id)
                      .length || 0,
                })
              : ''}
            {t('删除后将无法恢复。')}
          </AlertDialogDescription>
          {deleting?.kind === 'assignment' &&
            data?.assignments.find((a) => a.id === deleting.id)
              ?.recurrenceSeriesId && (
              <Choice
                label={t('你想删除哪些作业？')}
                value={deleting.scope ?? 'one'}
                onChange={(v) =>
                  setDeleting({ ...deleting, scope: v as RecurrenceScope })
                }
                options={[
                  { value: 'one', label: t('仅删除这一次') },
                  { value: 'future', label: t('删除这次及之后') },
                  { value: 'all', label: t('删除整个系列') },
                ]}
              />
            )}
          <div className="form-actions">
            <AlertDialogCancel>{t('取消')}</AlertDialogCancel>
            <button
              className="danger-button"
              onClick={() => {
                if (
                  !deleting ||
                  !deleteRecord(deleting.kind, deleting.id, deleting.scope)
                )
                  return;
                if (filters.course === deleting.id)
                  setFilters({ ...filters, course: 'all' });
                if (calendarFilters.course === deleting.id)
                  setCalendarFilters({ ...calendarFilters, course: 'all' });
                setDeleting(null);
                setEditing(null);
                setEditingCourse(null);
              }}
            >
              {t('删除')}
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      <div className="notice-stack" aria-label={t('操作提示')}>
        {notices.map((notice) => (
          <div className="save-notice" key={notice.id}>
            <output>✓ {t(notice.message, notice.params)}</output>
            {notice.assignmentId && (
              <button className="undo-button" onClick={() => undo(notice)}>
                {t('撤销')}
              </button>
            )}
            <button
              className="notice-close"
              aria-label={t('关闭提示')}
              onClick={() => dismiss(notice.id)}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
