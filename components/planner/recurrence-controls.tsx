'use client';
import type { RecurrenceRule } from '@/types/planner';
import { t } from '@/lib/i18n';
import { Choice } from './controls';
import { Checkbox } from '@/components/ui/checkbox';
import { generateOccurrences } from '@/lib/recurrence';
import { dateLabel } from '@/lib/dates';
export function RecurrenceControls({
  rule,
  change,
  start,
  disabled = false,
}: {
  rule?: RecurrenceRule;
  change: (r: RecurrenceRule | undefined) => void;
  start: string;
  disabled?: boolean;
}) {
  const patch = (p: Partial<RecurrenceRule>) =>
    rule && change({ ...rule, ...p });
  let preview = '';
  if (rule) {
    try {
      const dates = generateOccurrences(start, rule);
      preview = t('recurrence.preview', {
        count: dates.length,
        first: dateLabel(dates[0]),
        last: dateLabel(dates[dates.length - 1]),
      });
    } catch (e) {
      preview = t((e as Error).message);
    }
  }
  return (
    <fieldset className="recurrence-controls" disabled={disabled}>
      <Choice
        label={t('重复')}
        value={rule?.frequency ?? 'none'}
        onChange={(v) => {
          if (disabled) return;
          if (v === 'none') {
            change(undefined);
            return;
          }
          change({
            ...rule,
            frequency: v as RecurrenceRule['frequency'],
            unit: v === 'daily' ? 'day' : 'week',
            interval: v === 'biweekly' ? 2 : 1,
            weekdays: rule?.weekdays.length
              ? rule.weekdays
              : [new Date(start).getDay()],
            ...(rule?.endDate
              ? { endDate: rule.endDate }
              : { count: rule?.count ?? 6 }),
          });
        }}
        options={[
          { value: 'none', label: t('不重复') },
          { value: 'daily', label: t('每天') },
          { value: 'weekly', label: t('每周') },
          { value: 'biweekly', label: t('每两周') },
          { value: 'custom', label: t('自定义') },
        ]}
      />
      {rule && (
        <>
          {rule.frequency === 'custom' && (
            <div className="form-grid">
              <label className="field">
                {t('重复间隔')}
                <input
                  required
                  type="number"
                  min="1"
                  max="365"
                  value={rule.interval}
                  onChange={(e) => patch({ interval: Number(e.target.value) })}
                />
              </label>
              <Choice
                label={t('重复')}
                value={rule.unit}
                onChange={(unit) => patch({ unit: unit as 'day' | 'week' })}
                options={[
                  { value: 'day', label: t('天') },
                  { value: 'week', label: t('周') },
                ]}
              />
            </div>
          )}
          {rule.unit === 'week' && (
            <fieldset className="weekday-choices">
              <legend>{t('星期')}</legend>
              {[1, 2, 3, 4, 5, 6, 0].map((day, i) => (
                <label key={day}>
                  <Checkbox
                    checked={rule.weekdays.includes(day)}
                    onCheckedChange={(checked) =>
                      patch({
                        weekdays: checked
                          ? [...rule.weekdays, day].sort((a, b) => a - b)
                          : rule.weekdays.filter((d) => d !== day),
                      })
                    }
                  />
                  {t(
                    ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][i],
                  )}
                </label>
              ))}
            </fieldset>
          )}
          <div className="form-grid">
            <Choice
              label={t('结束方式')}
              value={rule.endDate !== undefined ? 'date' : 'count'}
              onChange={(v) =>
                change({
                  ...rule,
                  endDate: v === 'date' ? start.slice(0, 10) : undefined,
                  count: v === 'count' ? 6 : undefined,
                })
              }
              options={[
                { value: 'date', label: t('结束日期') },
                { value: 'count', label: t('重复次数') },
              ]}
            />
            {rule.endDate !== undefined ? (
              <label className="field">
                {t('结束日期')}
                <input
                  type="date"
                  required
                  value={rule.endDate}
                  onChange={(e) => patch({ endDate: e.target.value })}
                />
              </label>
            ) : (
              <label className="field">
                {t('重复次数')}
                <input
                  type="number"
                  min="1"
                  max="366"
                  required
                  value={rule.count ?? 6}
                  onChange={(e) => patch({ count: Number(e.target.value) })}
                />
              </label>
            )}
          </div>
          <p className="recurrence-help">{t('重复说明')}</p>
          <output className="recurrence-preview">{preview}</output>
        </>
      )}
    </fieldset>
  );
}
