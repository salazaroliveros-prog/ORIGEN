'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon, Contrast } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type Theme = 'dark' | 'light' | 'high-contrast';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    // Load theme from localStorage or system preference
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;

    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const html = document.documentElement;
    html.classList.remove('theme-dark', 'theme-light', 'theme-high-contrast');

    if (newTheme === 'high-contrast') {
      html.classList.add('theme-high-contrast');
    } else {
      html.classList.add(`theme-${newTheme}`);
    }

    localStorage.setItem('theme', newTheme);
  };

  const toggleTheme = () => {
    const themes: Theme[] = ['dark', 'light', 'high-contrast'];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];

    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  const getIcon = () => {
    switch (theme) {
      case 'dark':
        return <Moon className="h-5 w-5" aria-hidden="true" />;
      case 'light':
        return <Sun className="h-5 w-5" aria-hidden="true" />;
      case 'high-contrast':
        return <Contrast className="h-5 w-5" aria-hidden="true" />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'dark':
        return 'Modo oscuro';
      case 'light':
        return 'Modo claro';
      case 'high-contrast':
        return 'Alto contraste';
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={`Cambiar tema (actual: ${getLabel()})`}
      title={getLabel()}
      className="relative"
    >
      {getIcon()}
      {theme === 'high-contrast' && (
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand-400" />
      )}
    </Button>
  );
}
