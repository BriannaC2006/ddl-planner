import type { PlannerData, Assignment } from '@/types/planner';
export const STORAGE_KEY = 'ddl-planner-v1';
export function seedData(): PlannerData {
  const now = new Date().toISOString();
  const courses = [
    ['CS 60', '数据结构', '#4c73db'],
    ['MATH 55', '离散数学', '#9471d4'],
    ['PHYS 51', '物理', '#d89742'],
    ['HSA', '人文通识', '#439784'],
  ].map(([code, name, color], i) => ({
    id: `course-${i}`,
    code,
    name,
    color,
    professor: ['陈老师', '威廉姆斯老师', '帕特尔老师', '里维拉老师'][i],
    createdAt: now,
  }));
  const assignments = [
    ['计算机项目 2', 0, 1, 300, 40, 'High', 'Project'],
    ['物理作业 3', 2, 2, 120, 0, 'High', 'Homework'],
    ['数学练习 4', 1, 3, 180, 20, 'Medium', 'Homework'],
    ['人文阅读心得', 3, 4, 90, 0, 'Low', 'Reading'],
    ['物理实验报告', 2, 5, 240, 10, 'Medium', 'Lab'],
    ['图论阅读', 1, 0, 45, 100, 'Low', 'Reading'],
  ].map(([title, c, day, minutes, progress, priority, type], i) => {
    const due = new Date();
    due.setDate(due.getDate() + Number(day));
    due.setHours(23, 59, 0, 0);
    return {
      id: `assignment-${i}`,
      title,
      courseId: `course-${c}`,
      dueDate: due.toISOString(),
      estimatedMinutes: minutes,
      progress,
      priority,
      type,
      status:
        progress === 100
          ? 'Completed'
          : progress
            ? 'In Progress'
            : 'Not Started',
      createdAt: now,
      updatedAt: now,
      ...(progress === 100 ? { completedAt: now } : {}),
    } as Assignment;
  });
  return { courses, assignments };
}
export const storage = {
  load(): PlannerData {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedData();
    const data = JSON.parse(raw);
    if (!Array.isArray(data.courses) || !Array.isArray(data.assignments))
      throw Error('无法读取已保存的数据，原始数据未被覆盖。');
    return data;
  },
  save(data: PlannerData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },
};
