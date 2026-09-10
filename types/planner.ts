export const PRODUCT_NAME = 'DDL Planner';
export const priorities = ['High', 'Medium', 'Low'] as const;
export const statuses = ['Not Started', 'In Progress', 'Completed'] as const;
export const assignmentTypes = [
  'Homework',
  'Project',
  'Lab',
  'Reading',
  'Essay',
  'Quiz',
  'Exam',
  'Other',
] as const;
export interface Course {
  id: string;
  name: string;
  code: string;
  color: string;
  professor?: string;
  website?: string;
  createdAt: string;
}
export interface Assignment {
  recurrenceSeriesId?: string;
  occurrenceIndex?: number;
  originalOccurrenceDate?: string;
  recurrenceException?: boolean;
  recurrenceRule?: RecurrenceRule;
  id: string;
  title: string;
  description?: string;
  courseId: string;
  dueDate: string;
  priority: (typeof priorities)[number];
  estimatedMinutes: number;
  type: (typeof assignmentTypes)[number];
  progress: number;
  status: (typeof statuses)[number];
  createdAt: string;
  updatedAt: string;
  previousStatus?: 'Not Started' | 'In Progress';
  previousProgress?: number;
  completedAt?: string;
}
export interface PlannerData {
  recurrenceSeries?: RecurrenceSeries[];
  courses: Course[];
  assignments: Assignment[];
}

export type RecurrenceScope = 'one' | 'future' | 'all';
export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'custom';
  interval: number;
  unit: 'day' | 'week';
  weekdays: number[];
  endDate?: string;
  count?: number;
}
export interface RecurrenceSeries {
  id: string;
  rule: RecurrenceRule;
  startDate: string;
  template: Assignment;
  excludedIndices: number[];
}
