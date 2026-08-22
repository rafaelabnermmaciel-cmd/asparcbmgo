import { useMemo, useState } from 'react';
import { useParlamentaresGO, useCaptacoes } from '../lib/data.js';
import ParlamentarCard from '../components/ParlamentarCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ScrollReveal from '../components/ScrollReveal.jsx';

export default function Parlamentares() {
  const { loading, parlamentares } = useParlamentaresGO();
  const { captacoes } = useCaptacoes();
  const [q, setQ] = useState('');
  const [casa, setCasa] = useState('');
  const [partido, setPartido] = useState('');

  const partidos = useMemo(() => [...new Set(parlamentares.map((p) => p.partido).filter(Boolean))].sort(), [parlamentares]);

  const parlamentaresComCaptacao = useMemo(() => new Set(captacoes.map((c) => c.parlamentarNome)), [captacoes]);

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    return parlamentares
      .filter((p) => !term || p.nome?.toLowerCase().includes(term))
      .filter((p) => !casa || p.casa === casa)
      .filter((p) => !partido || p.partido === partido)
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [parlamentares, q, casa, partido]);

  const selectClass =
    'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-red-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200';

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:px-6 lg:px-10 lg:pb-8">
      <ScrollReveal>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Parlamentares de Goiás</h1>
        <p className="mt-1 text-sm text-slate-400">
          {parlamentares.length ? `${filtrados.length} de ${parlamentares.length} parlamentares` : 'Bancada de Goiás — Câmara dos Deputados e Senado Federal'}
        </p>
      </ScrollReveal>

      <ScrollReveal delay={0.05} className="mt-5 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome..."
          className={`${selectClass} min-w-[200px] flex-1`}
        />
        <select value={casa} onChange={(e) => setCasa(e.target.value)} className={selectClass}>
          <option value="">Todas as casas</option>
          <option value="camara">Câmara dos Deputados</option>
          <option value="senado">Senado Federal</option>
        </select>
        <select value={partido} onChange={(e) => setPartido(e.target.value)} className={selectClass}>
          <option value="">Todos os partidos</option>
          {partidos.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </ScrollReveal>

      <ScrollReveal delay={0.08} className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtrados.map((p) => (
          <ParlamentarCard key={`${p.casa}-${p.id}`} p={p} tracked={parlamentaresComCaptacao.has(p.nome)} />
        ))}
      </ScrollReveal>

      {!loading && !parlamentares.length && (
        <div className="mt-8">
          <EmptyState
            title="Nenhum dado carregado ainda"
            description="Rode painel-captacao/scripts/gerar-parlamentares-go.js depois de atualizar os dados do painel-nacional."
            command="npm run sync:parlamentares-go"
          />
        </div>
      )}
      {!loading && parlamentares.length > 0 && !filtrados.length && (
        <div className="mt-8">
          <EmptyState title="Nenhum parlamentar encontrado" description="Tente ajustar a busca ou os filtros." />
        </div>
      )}
    </div>
  );
}
