import { NavLink } from 'react-router-dom';
import { NAV } from './Sidebar.jsx';

function ItemNav({ to, label, mobileLabel, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition ${
          isActive ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-500'
        }`
      }
    >
      <Icon className="h-5 w-5" />
      {mobileLabel || label}
    </NavLink>
  );
}

// As seções cabem todas na barra inferior, sem precisar de um menu "Mais".
export default function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/95 print:hidden">
      {NAV.map((item) => (
        <ItemNav key={item.to} {...item} />
      ))}
    </nav>
  );
}
