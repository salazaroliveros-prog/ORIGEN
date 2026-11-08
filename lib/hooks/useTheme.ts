'use client';

import { useState, useEffect } from 'react';

export type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('constructerp_theme') as Theme;
        if (saved === 'light' || saved === 'dark') {
          return saved;
        }
      } catch {
        // Ignore errors reading localStorage
      }
    }
    return 'dark';
  });

  const applyTheme = (newTheme: Theme) => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (newTheme === 'light') {
        root.classList.add('theme-light');
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
      } else {
        root.classList.remove('theme-light');
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      }
    }
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('constructerp_theme', nextTheme);
    }
  };

  return { theme, toggleTheme };
}
