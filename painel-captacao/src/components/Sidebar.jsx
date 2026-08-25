import { NavLink } from 'react-router-dom';
import { LuHouse, LuLandmark, LuUsers, LuClipboardPlus, LuSettings } from 'react-icons/lu';
import ThemeToggle from './ThemeToggle.jsx';

export const NAV = [
  { to: '/', label: 'Dashboard', icon: LuHouse, end: true },
  { to: '/parlamentares', label: 'Parlamentares', icon: LuLandmark },
  { to: '/stakeholders', label: 'Stakeholders', icon: LuUsers },
  { to: '/cadastro', label: 'Cadastrar primeiro contato', mobileLabel: 'Cadastrar', icon: LuClipboardPlus },
  { to: '/gerenciamento', label: 'Acesso restrito', icon: LuSettings },
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
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0f1f3d]">
          <svg viewBox="0 0 100 100" className="h-6 w-6" aria-hidden="true">
            <ellipse cx="36" cy="70" rx="20" ry="7" fill="#7c3d0a" />
            <rect x="16" y="63" width="40" height="7" fill="#92450c" />
            <ellipse cx="36" cy="63" rx="20" ry="7" fill="#b45309" />
            <rect x="16" y="56" width="40" height="7" fill="#92450c" />
            <ellipse cx="36" cy="56" rx="20" ry="7" fill="#b45309" />
            <rect x="16" y="49" width="40" height="7" fill="#a2540f" />
            <ellipse cx="36" cy="49" rx="20" ry="7" fill="#d97a1a" />
            <rect x="16" y="42" width="40" height="7" fill="#b8630f" />
            <ellipse cx="36" cy="42" rx="20" ry="7" fill="#f59e0b" />
            <circle cx="66" cy="60" r="24" fill="#f59e0b" stroke="#0f1f3d" strokeWidth="3" />
            <circle cx="66" cy="60" r="18" fill="none" stroke="#b45309" strokeWidth="2" />
            <text x="66" y="69" fontSize="26" fontWeight="700" fill="#7c3d0a" textAnchor="middle">$</text>
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
