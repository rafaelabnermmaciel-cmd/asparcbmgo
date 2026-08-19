import { NavLink } from 'react-router-dom';
import ThemeToggle from './ThemeToggle.jsx';

const NAV = [
  { to: '/', label: 'Visão Geral', icon: '🏠', end: true },
  { to: '/parlamentares', label: 'Parlamentares', icon: '🏛️' },
  { to: '/aniversarios', label: 'Aniversários', icon: '🎂' },
  { to: '/agenda', label: 'Agenda', icon: '📅' },
  { to: '/legislativo', label: 'Legislativo', icon: '📄' },
  { to: '/captacao', label: 'Captação', icon: '💰' },
  { to: '/relatorios', label: 'Relatórios', icon: '📊' },
  { to: '/gerenciamento', label: 'Gerenciamento', icon: '⚙️' },
];

function NavItem({ to, label, icon, end }) {
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
      <span className="text-base leading-none">{icon}</span>
      {label}
    </NavLink>
  );
}

export default function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white/80 px-4 py-6 backdrop-blur lg:flex dark:border-slate-800 dark:bg-slate-950/80 print:hidden">
      <div className="mb-8 flex items-center gap-2.5 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-base font-bold text-white">
          🇧🇷
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
