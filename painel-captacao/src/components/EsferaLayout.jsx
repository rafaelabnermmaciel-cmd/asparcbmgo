import { useEffect } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
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
        <Outlet />
      </main>
      <MobileNav esfera={esfera} />
    </div>
  );
}
