import { useState, useEffect } from 'react';

export const useLocalStorageState = (key, defaultValue) => {
  const [state, setState] = useState(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = window.localStorage.getItem(key);
      if (stored === null || stored === undefined) return defaultValue;
      return JSON.parse(stored);
    } catch (error) {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      if (state === undefined) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, JSON.stringify(state));
      }
    } catch (error) {
      console.warn(`Failed to persist localStorage key: ${key}`, error);
    }
  }, [key, state]);

  return [state, setState];
};
