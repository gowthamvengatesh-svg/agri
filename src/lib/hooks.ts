import { useEffect, useMemo, useState } from 'react';
import { liveQuery } from 'dexie';

export function useLiveQuery<T>(factory: () => Promise<T>, fallback: T, deps: unknown[] = []) {
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    const subscription = liveQuery(factory).subscribe({
      next: setValue,
      error: console.error
    });
    return () => subscription.unsubscribe();
  }, deps);
  return value;
}

export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

export function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);
  return useMemo(() => now, [now]);
}
