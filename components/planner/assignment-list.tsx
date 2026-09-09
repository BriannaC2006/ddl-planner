'use client';
import { Search } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AssignmentRow, type ViewProps } from './views';
import { Blank, Choice } from './controls';
import { priorities, statuses } from '@/types/planner';
import type { AssignmentFilters } from '@/lib/assignment-filters';
const taskTabs = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '待完成' },
  { value: 'In Progress', label: '进行中' },
  { value: 'Completed', label: '已完成' },
];
export function AssignmentList(
  props: ViewProps & {
    filters: AssignmentFilters;
    setFilters: (f: AssignmentFilters) => void;
  },
) {
  const { filters, setFilters, assignments, courses } = props;
  const selectedTab =
    filters.status === 'Not Started' ? 'active' : filters.status;
  const emptyTitle = filters.search.trim()
    ? '没有找到相关作业。'
    : filters.status === 'Completed'
      ? '还没有完成的作业。'
      : filters.course !== 'all'
        ? '这门课程暂时没有作业。'
        : '暂时没有待完成的作业 🎉';
  return (
    <Tabs
      value={selectedTab}
      onValueChange={(v) => setFilters({ ...filters, status: String(v) })}
      className="assignment-tabs"
    >
      <TabsList aria-label="作业状态" className="task-tabs">
        {taskTabs.map((tab) => (
          <TabsTrigger value={tab.value} key={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <label className="assignment-search">
        <Search size={18} />
        <input
          aria-label="搜索作业"
          placeholder="搜索作业…"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
      </label>
      <div className="filters">
        <Choice
          label="课程"
          value={filters.course}
          onChange={(course) => setFilters({ ...filters, course })}
          options={[
            { value: 'all', label: '全部课程' },
            ...courses.map((c) => ({ value: c.id, label: c.code })),
          ]}
        />
        <Choice
          label="优先级"
          value={filters.priority}
          onChange={(priority) => setFilters({ ...filters, priority })}
          options={[{ value: 'all', label: '全部优先级' }, ...priorities]}
        />
        <Choice
          label="状态"
          value={filters.status}
          onChange={(status) => setFilters({ ...filters, status })}
          options={[
            { value: 'all', label: '全部' },
            { value: 'active', label: '待完成' },
            ...statuses,
          ]}
        />
        <Choice
          label="排序"
          value={filters.sort}
          onChange={(sort) => setFilters({ ...filters, sort })}
          options={['Deadline', 'Priority', 'Recently created']}
        />
      </div>
      <TabsContent value={selectedTab} className="panel">
        <div className="section-heading">
          <h2>
            {filters.status === 'Completed'
              ? '已完成作业'
              : filters.course === 'all'
                ? '作业列表'
                : courses.find((c) => c.id === filters.course)?.code}
            <span className="count">{assignments.length}</span>
          </h2>
        </div>
        {assignments.length ? (
          assignments.map((a) => <AssignmentRow key={a.id} a={a} {...props} />)
        ) : (
          <Blank
            title={emptyTitle}
            description={
              filters.search.trim()
                ? '换个关键词试试，也可以搜索课程名称或代码。'
                : '试试其他筛选条件，或添加一项作业。'
            }
          />
        )}
      </TabsContent>
    </Tabs>
  );
}
