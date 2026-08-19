import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { useParlamentares } from '../lib/data.js';
import StatCard from '../components/StatCard.jsx';
import ScrollReveal from '../components/ScrollReveal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ParlamentarCard from '../components/ParlamentarCard.jsx';

const PARTY_COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#14b8a6'];

function groupCount(list, key) {
  const map = new Map();
  for (const item of list) {
    const k = item[key] || '—';
    map.set(k, (map.get(k) || 0) + 1);
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function ChartCard({ title, sub, data, height = 260 }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
      <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
      {data.length ? (
        <div style={{ height }} className="mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 4, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-slate-100 dark:stroke-slate-800" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-400" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={56} tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-500" />
              <Tooltip
                cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={18}>
                {data.map((_, i) => (
                  <Cell key={i} fill={PARTY_COLORS[i % PARTY_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-6 text-center text-xs text-slate-400">Sem dados ainda.</p>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { loading, parlamentares } = useParlamentares();

  const deputados = useMemo(() => parlamentares.filter((p) => p.casa === 'camara'), [parlamentares]);
  const senadores = useMemo(() => parlamentares.filter((p) => p.casa === 'senado'), [parlamentares]);
  const porPartido = useMemo(() => groupCount(parlamentares, 'partido').slice(0, 10), [parlamentares]);
  const porUf = useMemo(() => groupCount(parlamentares, 'uf').slice(0, 10), [parlamentares]);
  const recentes = useMemo(() => parlamentares.slice(0, 8), [parlamentares]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
      <ScrollReveal>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Visão Geral</h1>
        <p className="mt-1 text-sm text-slate-400">Congresso Nacional do Brasil — Câmara dos Deputados e Senado Federal.</p>
      </ScrollReveal>

      <ScrollReveal delay={0.05} className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Parlamentares" value={parlamentares.length || '—'} sub="Total em exercício" />
        <StatCard label="Deputados Federais" value={deputados.length || '—'} sub="Câmara dos Deputados" accent="emerald" />
        <StatCard label="Senadores" value={senadores.length || '—'} sub="Senado Federal" accent="amber" />
        <StatCard label="Partidos" value={porPartido.length || '—'} sub="Representados" accent="rose" />
      </ScrollReveal>

      {!loading && !parlamentares.length && (
        <ScrollReveal delay={0.1} className="mt-8">
          <EmptyState
            title="Nenhum dado carregado ainda"
            description="Rode o script de coleta para popular /public/data com os dados reais da Câmara e do Senado."
            command="npm run fetch:parlamentares"
          />
        </ScrollReveal>
      )}

      {parlamentares.length > 0 && (
        <>
          <ScrollReveal delay={0.1} className="mt-6 grid gap-4 lg:grid-cols-2">
            <ChartCard title="Por Partido" sub="Top 10 bancadas" data={porPartido} />
            <ChartCard title="Por Estado (UF)" sub="Top 10 delegações" data={porUf} />
          </ScrollReveal>

          <ScrollReveal delay={0.15} className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Parlamentares</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {recentes.map((p) => (
                <ParlamentarCard key={`${p.casa}-${p.id}`} p={p} />
              ))}
            </div>
          </ScrollReveal>
        </>
      )}
    </div>
  );
}
