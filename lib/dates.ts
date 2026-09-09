export const dateKey = (d: Date | string) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
export const dateLabel = (
  d: Date | string,
  options: Intl.DateTimeFormatOptions = {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  },
) =>
  new Date(d)
    .toLocaleDateString('zh-CN', {
      ...options,
      ...(options.month ? { month: 'long' } : {}),
    })
    .replace(/(日)(周)/, '$1 $2');
export const timeLabel = (d: Date | string) =>
  new Date(d).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
export const exactDate = (d: string) =>
  `${dateLabel(d, { year: 'numeric', month: 'numeric', day: 'numeric' })} ${timeLabel(d)}`;
export const compactDate = (d: string) =>
  `${dateLabel(d, { month: 'numeric', day: 'numeric' })} ${timeLabel(d)}`;
export function relativeDate(d: string, now = new Date()) {
  const due = new Date(d);
  const days = Math.round(
    (new Date(dateKey(due) + 'T00:00').getTime() -
      new Date(dateKey(now) + 'T00:00').getTime()) /
      86400000,
  );
  const hours = Math.ceil((due.getTime() - now.getTime()) / 3600000);
  if (due < now) return '已逾期';
  if (days === 0)
    return hours <= 3
      ? `${Math.max(1, hours)} 小时后截止`
      : `今天 ${timeLabel(d)}`;
  if (days === 1) return `明天 ${timeLabel(d)}`;
  return `还有 ${days} 天`;
}
export const hours = (minutes: number) =>
  `${Math.round(minutes / 6) / 10} 小时`;
