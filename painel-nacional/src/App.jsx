import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { LuTriangleAlert } from 'react-icons/lu';
import Sidebar from './components/Sidebar.jsx';
import MobileNav from './components/MobileNav.jsx';
import { supabaseConfigurado } from './lib/supabase.js';

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Parlamentares = lazy(() => import('./pages/Parlamentares.jsx'));
const ParlamentarPerfil = lazy(() => import('./pages/ParlamentarPerfil.jsx'));
const ProjetosLei = lazy(() => import('./pages/ProjetosLei.jsx'));
const Captacao = lazy(() => import('./pages/Captacao.jsx'));
const Aniversarios = lazy(() => import('./pages/Aniversarios.jsx'));
const Agenda = lazy(() => import('./pages/Agenda.jsx'));
const Relatorios = lazy(() => import('./pages/Relatorios.jsx'));
const Gerenciamento = lazy(() => import('./pages/Gerenciamento.jsx'));

export default function App() {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <main className="min-w-0 flex-1">
        {!supabaseConfigurado && (
          <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            <LuTriangleAlert className="h-3.5 w-3.5 shrink-0" />
            Banco de dados não configurado — Captação, Acompanhamento Legislativo, Agenda e
            Gerenciamento ficam vazios até preencher <code className="rounded bg-amber-100 px-1 dark:bg-amber-500/20">src/lib/supabase-config.js</code>.
          </div>
        )}
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/parlamentares" element={<Parlamentares />} />
            <Route path="/parlamentares/:casa/:id" element={<ParlamentarPerfil />} />
            <Route path="/projetos-lei" element={<ProjetosLei />} />
            <Route path="/captacao" element={<Captacao />} />
            <Route path="/aniversarios" element={<Aniversarios />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/gerenciamento" element={<Gerenciamento />} />
          </Routes>
        </Suspense>
      </main>
      <MobileNav />
    </div>
  );
}
