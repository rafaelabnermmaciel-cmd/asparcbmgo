import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { LuTriangleAlert } from 'react-icons/lu';
import Sidebar from './components/Sidebar.jsx';
import MobileNav from './components/MobileNav.jsx';
import { supabaseConfigurado } from './lib/supabase.js';

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Parlamentares = lazy(() => import('./pages/Parlamentares.jsx'));
const ParlamentarPerfil = lazy(() => import('./pages/ParlamentarPerfil.jsx'));
const Stakeholders = lazy(() => import('./pages/Stakeholders.jsx'));
const Cadastro = lazy(() => import('./pages/Cadastro.jsx'));
const Gerenciamento = lazy(() => import('./pages/Gerenciamento.jsx'));

function AvisoNaoConfigurado() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <LuTriangleAlert className="mx-auto h-10 w-10 text-amber-500" />
      <h1 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">Site ainda não configurado</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Falta preencher a URL e a chave do projeto Supabase em <code className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">src/lib/supabase-config.js</code>.
        Siga o passo a passo em <code className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">SETUP.md</code>.
      </p>
    </div>
  );
}

export default function App() {
  if (!supabaseConfigurado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <AvisoNaoConfigurado />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/parlamentares" element={<Parlamentares />} />
            <Route path="/parlamentares/:casa/:id" element={<ParlamentarPerfil />} />
            <Route path="/stakeholders" element={<Stakeholders />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/gerenciamento" element={<Gerenciamento />} />
          </Routes>
        </Suspense>
      </main>
      <MobileNav />
    </div>
  );
}
