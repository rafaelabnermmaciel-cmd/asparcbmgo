import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import MobileNav from './components/MobileNav.jsx';

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Parlamentares = lazy(() => import('./pages/Parlamentares.jsx'));
const ParlamentarPerfil = lazy(() => import('./pages/ParlamentarPerfil.jsx'));
const Cadastro = lazy(() => import('./pages/Cadastro.jsx'));

export default function App() {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/parlamentares" element={<Parlamentares />} />
            <Route path="/parlamentares/:casa/:id" element={<ParlamentarPerfil />} />
            <Route path="/cadastro" element={<Cadastro />} />
          </Routes>
        </Suspense>
      </main>
      <MobileNav />
    </div>
  );
}
