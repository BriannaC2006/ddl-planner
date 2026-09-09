'use client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { t } from '@/lib/i18n';
import { Empty, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
export function Choice({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: (string | { value: string; label: string })[];
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <Select value={value} onValueChange={(v) => v !== null && onChange(v)}>
        <SelectTrigger aria-label={label} className="w-full h-10">
          <SelectValue>
            {options
              .map((o) =>
                typeof o === 'string' ? { value: o, label: t(o) } : o,
              )
              .find((o) => o.value === value)?.label || '请选择课程'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => {
            const item = typeof o === 'string' ? { value: o, label: t(o) } : o;
            return (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </label>
  );
}
export function Blank({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Empty className="empty-state">
      <EmptyTitle>{title}</EmptyTitle>
      <EmptyDescription>{description}</EmptyDescription>
    </Empty>
  );
}
