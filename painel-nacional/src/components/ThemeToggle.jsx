import { LuMoon, LuSun } from 'react-icons/lu';
import { useTheme } from '../lib/theme.jsx';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white"
    >
      {isDark ? <LuMoon className="h-4 w-4" /> : <LuSun className="h-4 w-4" />}
      {isDark ? 'Escuro' : 'Claro'}
    </button>
  );
}
