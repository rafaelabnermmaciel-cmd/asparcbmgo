import { NavLink } from 'react-router-dom';
import { LuHouse, LuLandmark, LuCake, LuCalendarDays, LuFileText, LuBanknote, LuChartColumn, LuSettings } from 'react-icons/lu';
import ThemeToggle from './ThemeToggle.jsx';

const NAV = [
  { to: '/', label: 'Visão Geral', icon: LuHouse, end: true },
  { to: '/parlamentares', label: 'Parlamentares', icon: LuLandmark },
  { to: '/aniversarios', label: 'Aniversários', icon: LuCake },
  { to: '/agenda', label: 'Agenda', icon: LuCalendarDays },
  { to: '/projetos-lei', label: 'Projetos de Lei', icon: LuFileText },
  { to: '/captacao', label: 'Captação', icon: LuBanknote },
  { to: '/relatorios', label: 'Relatórios', icon: LuChartColumn },
  { to: '/gerenciamento', label: 'Gerenciamento', icon: LuSettings },
];

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
          isActive
            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
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
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <svg viewBox="0 0 100 100" className="h-6 w-6" fill="currentColor" aria-hidden="true">
            <rect x="6" y="70" width="88" height="6" rx="3" />
            <rect x="19" y="54" width="8" height="16" />
            <path d="M8 54 A15 15 0 0 1 38 54 Z" />
            <rect x="44" y="18" width="7" height="52" rx="1.5" />
            <rect x="55" y="18" width="7" height="52" rx="1.5" />
            <rect x="78" y="54" width="8" height="16" />
            <ellipse cx="82" cy="48" rx="14" ry="6" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Painel Parlamentar</p>
          <p className="text-[11px] text-slate-400">594 parlamentares · Brasil</p>
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
          Dados: Câmara dos Deputados, Senado Federal e TSE — código aberto em Dados Abertos.
        </p>
      </div>
    </aside>
  );
}

export { NAV };
