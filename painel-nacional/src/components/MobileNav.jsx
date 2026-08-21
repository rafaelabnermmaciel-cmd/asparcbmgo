import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LuEllipsis, LuX } from 'react-icons/lu';
import { NAV } from './Sidebar.jsx';

// 8 itens não cabem numa barra inferior de celular sem espremer/embaralhar o texto — os 4
// mais usados no dia a dia ficam fixos, o resto entra num menu "Mais" que abre por cima.
const PRINCIPAIS = ['/', '/parlamentares', '/captacao', '/agenda'];

function ItemNav({ to, label, icon: Icon, end, onClick, className }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `${className} ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-500'}`
      }
    >
      <Icon className="h-5 w-5" />
      {label}
    </NavLink>
  );
}

export default function MobileNav() {
  const [aberto, setAberto] = useState(false);
  const location = useLocation();

  const principais = NAV.filter((n) => PRINCIPAIS.includes(n.to));
  const outros = NAV.filter((n) => !PRINCIPAIS.includes(n.to));
  const outroAtivo = outros.some((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)));

  return (
    <>
      <AnimatePresence>
        {aberto && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAberto(false)}
              className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-0 bottom-16 z-40 rounded-t-2xl border-t border-slate-200 bg-white p-3 shadow-2xl lg:hidden dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="grid grid-cols-4 gap-2">
                {outros.map(({ to, label, icon, end }) => (
                  <ItemNav
                    key={to}
                    to={to}
                    label={label}
                    icon={icon}
                    end={end}
                    onClick={() => setAberto(false)}
                    className="flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-center text-[11px] font-medium transition"
                  />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/95 print:hidden">
        {principais.map(({ to, label, icon, end }) => (
          <ItemNav
            key={to}
            to={to}
            label={label}
            icon={icon}
            end={end}
            onClick={() => setAberto(false)}
            className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition"
          />
        ))}
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition ${
            aberto || outroAtivo ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-500'
          }`}
        >
          {aberto ? <LuX className="h-5 w-5" /> : <LuEllipsis className="h-5 w-5" />}
          Mais
        </button>
      </nav>
    </>
  );
}
