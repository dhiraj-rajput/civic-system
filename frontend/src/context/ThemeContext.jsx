import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('civic_theme') || 'light';
  });

  const applyThemeToDom = useCallback((newTheme) => {
    const root = document.documentElement;
    const favicon = document.getElementById('app-favicon') || document.querySelector("link[rel*='icon']");
    if (newTheme === 'dark') {
      root.classList.add('dark');
      if (favicon && favicon.getAttribute('href') !== '/favicon-dark.svg') {
        favicon.href = '/favicon-dark.svg';
      }
    } else {
      root.classList.remove('dark');
      if (favicon && favicon.getAttribute('href') !== '/favicon-light.svg') {
        favicon.href = '/favicon-light.svg';
      }
    }
    localStorage.setItem('civic_theme', newTheme);
  }, []);

  // Sync DOM on initial mount
  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme, applyThemeToDom]);

  const toggleTheme = useCallback((e) => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';

    // If startViewTransition is NOT supported or user prefers reduced motion, update immediately
    if (
      !document.startViewTransition ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      applyThemeToDom(nextTheme);
      setTheme(nextTheme);
      return;
    }

    // Capture origin coordinates of click event for circular expand/shrink ripple
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    if (e && typeof e.clientX === 'number' && typeof e.clientY === 'number') {
      x = e.clientX;
      y = e.clientY;
    } else if (e?.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect?.();
      if (rect) {
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      }
    }

    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    try {
      const transition = document.startViewTransition(() => {
        applyThemeToDom(nextTheme);
        setTheme(nextTheme);
      });

      transition.ready.then(() => {
        const clipPath = [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`
        ];

        // Animate circular clip-path: expanding on dark, shrinking reveal on light
        document.documentElement.animate(
          {
            clipPath: nextTheme === 'dark' ? clipPath : [...clipPath].reverse()
          },
          {
            duration: 320,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            pseudoElement: nextTheme === 'dark' ? '::view-transition-new(root)' : '::view-transition-old(root)'
          }
        );
      }).catch(() => {
        applyThemeToDom(nextTheme);
        setTheme(nextTheme);
      });
    } catch {
      applyThemeToDom(nextTheme);
      setTheme(nextTheme);
    }
  }, [theme, applyThemeToDom]);

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

