// C:/KULIAH/iot/DashboardGpS/dashboard1/src/hooks/useTheme.js
import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'dark' ? 'light' : 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return [theme, toggleTheme];
}