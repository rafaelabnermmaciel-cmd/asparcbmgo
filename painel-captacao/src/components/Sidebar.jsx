import { NavLink, Link } from 'react-router-dom';
import { LuHouse, LuLandmark, LuUsers, LuClipboardPlus, LuClock, LuSettings, LuArrowLeftRight } from 'react-icons/lu';
import ThemeToggle from './ThemeToggle.jsx';
import brasaoCbmgo from '../assets/brasao-cbmgo.png';

const TITULO_ESFERA = {
  federal: 'Captação Federal',
  estadual: 'Captação Estadual',
};

export function buildNav(esfera) {
  const base = `/${esfera}`;
  return [
    { to: base, label: 'Dashboard', icon: LuHouse, end: true },
    { to: `${base}/parlamentares`, label: 'Parlamentares', icon: LuLandmark },
    { to: `${base}/stakeholders`, label: 'Stakeholders', icon: LuUsers },
    { to: `${base}/cadastro`, label: 'Cadastrar primeiro contato', mobileLabel: 'Cadastrar', icon: LuClipboardPlus },
    { to: `${base}/andamentos`, label: 'Adicionar andamento', mobileLabel: 'Andamento', icon: LuClock },
    { to: `${base}/gerenciamento`, label: 'Acesso restrito', icon: LuSettings },
  ];
}

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

export default function Sidebar({ esfera }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white/80 px-4 py-6 backdrop-blur lg:flex dark:border-slate-800 dark:bg-slate-950/80 print:hidden">
      <div className="mb-8 flex items-center gap-2.5 px-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0f1f3d]">
          <img src={brasaoCbmgo} alt="Brasão do CBM-GO" className="h-9 w-9 object-contain" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{TITULO_ESFERA[esfera] || 'Captação'} - CBMGO</p>
          <p className="text-[11px] text-slate-400">Quartéis · Goiás</p>
        </div>
      </div>
      <Link to="/" className="mb-5 flex items-center gap-1.5 px-2 text-xs font-medium text-slate-400 hover:text-red-600 dark:hover:text-red-400">
        <LuArrowLeftRight className="h-3.5 w-3.5" /> Trocar esfera
      </Link>
      <nav className="flex flex-1 flex-col gap-1">
        {buildNav(esfera).map((item) => (
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
