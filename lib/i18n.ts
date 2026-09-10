import translations from './translations.json' with { type: 'json' };
export type Language = 'zh-CN' | 'en';
export type Params = Record<string, string | number | undefined>;
export const LANGUAGE_KEY = 'ddl-planner-language';
let language: Language = 'zh-CN';
const listeners = new Set<() => void>();
export const getLanguage = () => language;
export const subscribeLanguage = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export function setLanguage(next: Language) {
  try {
    localStorage.setItem(LANGUAGE_KEY, next);
  } catch {
    /* Keep the in-session preference when storage is unavailable. */
  }
  language = next;
  if (typeof document !== 'undefined') document.documentElement.lang = next;
  listeners.forEach((listener) => listener());
}
export function initializeLanguage() {
  let next: Language = 'zh-CN';
  try {
    if (localStorage.getItem(LANGUAGE_KEY) === 'en') next = 'en';
  } catch {}
  language = next;
  document.documentElement.lang = next;
  listeners.forEach((listener) => listener());
}
const labels: Record<string, string> = {
  Dashboard: '首页',
  Calendar: '日历',
  Agenda: '日程',
  Assignments: '作业',
  Courses: '课程',
  Settings: '设置',
  High: '高',
  Medium: '中',
  Low: '低',
  'Not Started': '未开始',
  'In Progress': '进行中',
  Completed: '已完成',
  Homework: '作业',
  Project: '项目',
  Lab: '实验',
  Reading: '阅读',
  Essay: '论文',
  Quiz: '小测',
  Exam: '考试',
  Other: '其他',
  Deadline: '截止时间',
  Priority: '优先级',
  'Recently created': '最近创建',
  Urgency: '紧急程度',
  Overdue: '已逾期',
  Urgent: '紧急',
  Soon: '即将截止',
  Upcoming: '即将截止',
};

const zh: Record<string, string> = {
  'workload.pace': '{duration}，按自己的节奏推进',
  重复说明: '每个系列最多 366 次，每次作业都有独立状态与进度。',
  语言说明: '选择界面语言，课程名称和作业内容保持不变。',
  系列编辑说明:
    '过去与已完成的作业保留原有进度和完成记录；调整日期时会作为例外保留。',
  仅本次重复说明:
    '修改重复规则时请选择系列范围。仅修改这一次会保留与系列的关联。',
  'date.today': '今天截止 · {time}',
  'date.tomorrow': '明天截止 · {time}',
  'date.days': '还有 {count} 天',
  'date.overdue': '已逾期 {count} 天',
  'date.overdueToday': '已逾期',
  'date.hours': '{count} 小时后截止',
  'date.duration': '{count} 小时',
  'priority.label': '{priority}优先级',
  'completed.today': '今天已完成 {count} 项',
  'recurrence.preview': '{count} 次 · {first} – {last}',
  'recurrence.customLabel': '每 {count} {unit}',
};
export function t(key: string, params: Params = {}): string {
  const resolvedKey =
    language === 'en' &&
    params.count === 1 &&
    (translations as Record<string, string>)[key + '.one']
      ? key + '.one'
      : key;
  const text =
    language === 'en'
      ? ((translations as Record<string, string>)[resolvedKey] ?? key)
      : (zh[key] ?? labels[resolvedKey] ?? key);
  return text.replace(/\{([^}]+)\}/g, (_, name) => String(params[name] ?? ''));
}
