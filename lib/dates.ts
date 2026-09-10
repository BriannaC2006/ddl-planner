import { getLanguage, t } from './i18n.ts';
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
    .toLocaleDateString(getLanguage(), {
      ...options,
      ...(options.month
        ? {
            month:
              getLanguage() === 'en'
                ? options.month === 'long'
                  ? 'long'
                  : 'short'
                : 'long',
          }
        : {}),
    })
    .replace(/(日)(周)/, '$1 $2');
export const timeLabel = (d: Date | string) =>
  new Date(d).toLocaleTimeString(getLanguage(), {
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
  if (due < now)
    return days < 0
      ? t('date.overdue', { count: Math.abs(days) })
      : t('date.overdueToday');
  if (days === 0)
    return hours <= 3
      ? t('date.hours', { count: Math.max(1, hours) })
      : t('date.today', { time: timeLabel(d) });
  if (days === 1) return t('date.tomorrow', { time: timeLabel(d) });
  return t('date.days', { count: days });
}
export const hours = (minutes: number) =>
  t('date.duration', { count: Math.round(minutes / 6) / 10 });
