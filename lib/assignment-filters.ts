import type { Assignment, Course } from '../types/planner';
export interface AssignmentFilters {
  course: string;
  priority: string;
  status: string;
  sort: string;
  search: string;
}
export function filterAssignments(
  assignments: Assignment[],
  courses: Course[],
  filters: AssignmentFilters,
) {
  const query = filters.search.trim().normalize('NFKC').toLocaleLowerCase();
  return assignments
    .filter((a) => {
      const c = courses.find((c) => c.id === a.courseId);
      const matchesStatus =
        filters.status === 'all' ||
        (filters.status === 'active'
          ? a.status !== 'Completed'
          : a.status === filters.status);
      const text = `${a.title} ${c?.name ?? ''} ${c?.code ?? ''}`
        .normalize('NFKC')
        .toLocaleLowerCase();
      return (
        matchesStatus &&
        (filters.course === 'all' || a.courseId === filters.course) &&
        (filters.priority === 'all' || a.priority === filters.priority) &&
        (!query || text.includes(query))
      );
    })
    .sort((a, b) => {
      if (filters.sort === 'Priority') {
        const rank = { High: 0, Medium: 1, Low: 2 };
        return (
          rank[a.priority] - rank[b.priority] ||
          a.dueDate.localeCompare(b.dueDate)
        );
      }
      if (filters.sort === 'Recently created')
        return b.createdAt.localeCompare(a.createdAt);
      return a.dueDate.localeCompare(b.dueDate);
    });
}
