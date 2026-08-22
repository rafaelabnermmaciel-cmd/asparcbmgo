import { NavLink } from 'react-router-dom';
import { LuHouse, LuLandmark, LuClipboardPlus } from 'react-icons/lu';
import ThemeToggle from './ThemeToggle.jsx';

export const NAV = [
  { to: '/', label: 'Dashboard', icon: LuHouse, end: true },
  { to: '/parlamentares', label: 'Parlamentares', icon: LuLandmark },
  { to: '/cadastro', label: 'Cadastrar captação', icon: LuClipboardPlus },
];

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
          isActive
            ? 'bg-red-600 text-white shadow-sm shadow-red-600/20'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white'
        }`
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {label}
    </NavLink>
  );
}

export default function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white/80 px-4 py-6 backdrop-blur lg:flex dark:border-slate-800 dark:bg-slate-950/80 print:hidden">
      <div className="mb-8 flex items-center gap-2.5 px-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white">
          <svg viewBox="0 0 100 100" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="7" aria-hidden="true">
            <path d="M50 16 L74 30 V52 C74 68 63 78 50 84 C37 78 26 68 26 52 V30 Z" />
            <path d="M50 38 L50 62 M39 50 L61 50" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Captação CBM-GO</p>
          <p className="text-[11px] text-slate-400">Quartéis · Goiás</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-3 px-2">
        <ThemeToggle />
        <p className="text-[11px] leading-relaxed text-slate-400">
          Corpo de Bombeiros Militar do Estado de Goiás — captação de recursos junto ao Congresso Nacional.
        </p>
      </div>
    </aside>
  );
}
