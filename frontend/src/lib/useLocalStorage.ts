'use client';

import { useState, useEffect } from 'react';

/**
 * Works exactly like useState but the value is persisted to localStorage.
 * Safe for Next.js SSR: the server renders with initialValue, the client
 * hydrates from localStorage after mount (no hydration mismatch).
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    try {
      const item = localStorage.getItem(key);
      if (item !== null) setStoredValue(JSON.parse(item) as T);
    } catch {
      // localStorage unavailable or corrupt — stay on initialValue
    }
  }, [key]);

  function setValue(value: T | ((prev: T) => T)) {
    try {
      const next = value instanceof Function ? value(storedValue) : value;
      setStoredValue(next);
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // private browsing or storage full — update state only
      const next = value instanceof Function ? value(storedValue) : value;
      setStoredValue(next);
    }
  }

  return [storedValue, setValue];
}
