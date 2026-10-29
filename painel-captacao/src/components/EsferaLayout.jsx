import { useEffect } from 'react';
import { Navigate, Outlet, Link, useParams } from 'react-router-dom';
import { LuArrowLeftRight } from 'react-icons/lu';
import { ESFERAS } from '../lib/data.js';
import Sidebar from './Sidebar.jsx';
import MobileNav from './MobileNav.jsx';

const TITULO_ESFERA = {
  federal: 'Captação Federal',
  estadual: 'Captação Estadual',
};

// Casca comum de todas as páginas de uma esfera (federal ou estadual) — valida a esfera na URL
// (um link quebrado ou editado à mão pra algo diferente de "federal"/"estadual" volta pro
// seletor em vez de quebrar a tela) e troca o título da aba do navegador.
export default function EsferaLayout() {
  const { esfera } = useParams();

  useEffect(() => {
    if (ESFERAS.includes(esfera)) {
      document.title = `${TITULO_ESFERA[esfera]} — CBMGO`;
    }
  }, [esfera]);

  if (!ESFERAS.includes(esfera)) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar esfera={esfera} />
      <main className="min-w-0 flex-1">
        {/* No desktop o "Trocar esfera" já fica na Sidebar — essa barra só existe pra quem usa
            o site no celular, que não tem Sidebar visível (ver MobileNav.jsx). */}
        <div className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/95 print:hidden">
          <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">{TITULO_ESFERA[esfera]}</span>
          <Link to="/" className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-red-700 dark:hover:text-red-400">
            <LuArrowLeftRight className="h-3.5 w-3.5" /> Trocar esfera
          </Link>
        </div>
        <Outlet />
      </main>
      <MobileNav esfera={esfera} />
    </div>
  );
}
