'use client';
import { useEffect, useSyncExternalStore } from 'react';
import {
  getLanguage,
  initializeLanguage,
  subscribeLanguage,
  setLanguage,
  t,
} from '@/lib/i18n';
export function useLanguage() {
  const language = useSyncExternalStore(
    subscribeLanguage,
    getLanguage,
    () => 'zh-CN' as const,
  );
  useEffect(initializeLanguage, []);
  return { language, setLanguage, t };
}
