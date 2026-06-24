import { useState, useEffect } from 'react';

export const useTheme = () => {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('souldex-theme');
    if (savedTheme) return savedTheme;

    // Default to dark theme
    return 'dark';
  });

  // Apply theme to document
  useEffect(() => {
    const htmlElement = document.documentElement;

    if (theme === 'light') {
      htmlElement.classList.add('light-theme');
    } else {
      htmlElement.classList.remove('light-theme');
    }

    // Save preference
    localStorage.setItem('souldex-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  return { theme, toggleTheme };
};
