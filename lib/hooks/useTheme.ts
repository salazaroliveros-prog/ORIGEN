'use client';

import { useState, useEffect } from 'react';

export type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('constructerp_theme') as Theme;
        if (saved === 'light' || saved === 'dark') {
          setTheme(saved);
          applyTheme(saved);
        } else {
          applyTheme('dark');
        }
      } catch (e) {
        applyTheme('dark');
      }
    }
  }, []);

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

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('constructerp_theme', nextTheme);
    }
  };

  return { theme, toggleTheme };
}
