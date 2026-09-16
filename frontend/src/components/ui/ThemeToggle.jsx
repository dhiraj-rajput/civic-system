import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext.jsx";

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="flex h-9 w-9 items-center justify-center rounded-full text-ink-secondary hover:bg-hover hover:text-ink focus-visible:ring-2 focus-visible:ring-focus transition-all"
      aria-label="Toggle theme"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <div className="relative h-5 w-5">
        <Sun
          size={20}
          className={`absolute left-0 top-0 transition-transform duration-300 ease-in-out ${
            isDark ? 'scale-0 opacity-0 -rotate-90' : 'scale-100 opacity-100 rotate-0'
          }`}
        />
        <Moon
          size={20}
          className={`absolute left-0 top-0 transition-transform duration-300 ease-in-out ${
            isDark ? 'scale-100 opacity-100 rotate-0' : 'scale-0 opacity-0 rotate-90'
          }`}
        />
      </div>
    </button>
  );
}
