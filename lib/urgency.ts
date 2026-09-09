import type { Assignment } from '@/types/planner';
export function urgency(a:Assignment,now=Date.now()){if(a.status==='Completed')return -Infinity;const hours=(new Date(a.dueDate).getTime()-now)/3600000;const remaining=a.estimatedMinutes/60*(1-a.progress/100);return (hours<0?10000+Math.min(-hours,1000):500/(hours+4))+({High:3,Medium:2,Low:1}[a.priority]*3)+Math.min(remaining,24)}
export function urgencyLabel(a:Assignment){const hours=(new Date(a.dueDate).getTime()-Date.now())/3600000;return hours<0?'Overdue':hours<24?'Urgent':hours<72?'Soon':'Upcoming'}
