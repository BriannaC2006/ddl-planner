'use client';
import { useEffect, useState } from 'react';
// Keep deadline labels current in a planner that is left open throughout the day.
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
