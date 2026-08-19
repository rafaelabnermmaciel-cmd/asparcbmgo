import { NavLink } from 'react-router-dom';
import { NAV } from './Sidebar.jsx';

export default function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/95">
      {NAV.map(({ to, label, icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition ${
              isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-500'
            }`
          }
        >
          <span className="text-lg leading-none">{icon}</span>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
