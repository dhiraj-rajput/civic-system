import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('civic_theme') || 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    const favicon = document.getElementById('app-favicon') || document.querySelector("link[rel*='icon']");
    if (theme === 'dark') {
      root.classList.add('dark');
      if (favicon) {
        favicon.href = `/favicon-dark.svg?v=${Date.now()}`;
      }
    } else {
      root.classList.remove('dark');
      if (favicon) {
        favicon.href = `/favicon-light.svg?v=${Date.now()}`;
      }
    }
    localStorage.setItem('civic_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
