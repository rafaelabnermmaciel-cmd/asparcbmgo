import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { useParlamentares, proximosAniversarios, initials } from '../lib/data.js';
import { useStore, diasSemContatoItem, nivelGargalo, destinacaoAtiva, projetoAtivo } from '../lib/store.jsx';
import StatCard from '../components/StatCard.jsx';
import ScrollReveal from '../components/ScrollReveal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ParlamentarCard from '../components/ParlamentarCard.jsx';

function fmtR(v) {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

const GARGALO_ESTILO = {
  vermelho: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  amarelo: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
};

function AcoesCard({ icone, titulo, children, vazio }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{icone} {titulo}</p>
      {children || <p className="mt-3 text-xs text-slate-400">{vazio}</p>}
    </div>
  );
}

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
  const store = useStore();

  const deputados = useMemo(() => parlamentares.filter((p) => p.casa === 'camara'), [parlamentares]);
  const senadores = useMemo(() => parlamentares.filter((p) => p.casa === 'senado'), [parlamentares]);
  const porPartido = useMemo(() => groupCount(parlamentares, 'partido').slice(0, 10), [parlamentares]);
  const porUf = useMemo(() => groupCount(parlamentares, 'uf').slice(0, 10), [parlamentares]);
  const recentes = useMemo(() => parlamentares.slice(0, 8), [parlamentares]);

  const totalPrevisto = store.destinacoes.reduce((s, d) => s + (d.valorPrevisto || 0), 0);
  const anosCaptacao = useMemo(() => [...new Set(store.destinacoes.map((d) => d.ano))].sort((a, b) => b - a), [store.destinacoes]);
  const mediaUltimos3Anos = useMemo(() => {
    const ultimos3 = anosCaptacao.slice(0, 3);
    if (!ultimos3.length) return 0;
    const total = store.destinacoes.filter((d) => ultimos3.includes(d.ano)).reduce((s, d) => s + (d.valorPrevisto || 0), 0);
    return total / ultimos3.length;
  }, [anosCaptacao, store.destinacoes]);
  const topParlamentar = useMemo(() => {
    const porParl = new Map();
    store.destinacoes.forEach((d) => {
      const nome = d.parlamentarNome || 'Não identificado';
      porParl.set(nome, (porParl.get(nome) || 0) + (d.valorPrevisto || 0));
    });
    const ordenado = [...porParl.entries()].sort((a, b) => b[1] - a[1]);
    return ordenado[0] ? { nome: ordenado[0][0], valor: ordenado[0][1] } : null;
  }, [store.destinacoes]);

  function findParlamentar(nome) {
    return parlamentares.find((p) => p.nome === nome);
  }

  const proximosPassos = useMemo(
    () =>
      store.destinacoes
        .filter((d) => d.proximoPasso?.trim() && d.status !== 'Entregue')
        .slice()
        .sort((a, b) => (a.parlamentarNome || '').localeCompare(b.parlamentarNome || ''))
        .slice(0, 6),
    [store.destinacoes]
  );

  const gargalos = useMemo(() => {
    const itensDest = store.destinacoes
      .filter(destinacaoAtiva)
      .map((d) => ({ tipo: 'destinacao', id: d.id, nome: d.parlamentarNome, label: `${d.municipio} — ${d.objeto}` }));
    const itensProj = store.projetos
      .filter(projetoAtivo)
      .map((p) => ({ tipo: 'projeto', id: p.id, nome: p.parlamentarNome, label: `${p.tipo} ${p.numero}` }));
    const candidatos = [...itensDest, ...itensProj]
      .filter((it) => it.nome)
      .map((it) => {
        const dias = diasSemContatoItem(it.tipo, it.id, store.eventos);
        const nivel = nivelGargalo(dias);
        return nivel ? { ...it, dias, nivel, parl: findParlamentar(it.nome) } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.dias - a.dias);
    return candidatos.slice(0, 8);
  }, [store.destinacoes, store.projetos, store.eventos, parlamentares]);

  const aniversariosProximos = useMemo(() => proximosAniversarios(parlamentares, 14).slice(0, 6), [parlamentares]);

  const totalAcoes = proximosPassos.length + gargalos.length + aniversariosProximos.length;

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

      {!store.loading && totalAcoes > 0 && (
        <ScrollReveal delay={0.07} className="mt-6">
          <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">✅ Central de ações — o que fazer agora</p>
          <div className="grid gap-4 lg:grid-cols-3">
            <AcoesCard icone="👉" titulo="Próximo passo pendente" vazio="Nenhuma destinação com próximo passo em aberto.">
              {proximosPassos.length > 0 && (
                <div className="mt-3 flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                  {proximosPassos.map((d) => (
                    <div key={d.id} className="py-2 text-xs">
                      <p className="font-medium text-slate-700 dark:text-slate-200">{d.parlamentarNome || '—'} <span className="font-normal text-slate-400">· {d.municipio}</span></p>
                      <p className="mt-0.5 text-slate-500 dark:text-slate-400">{d.proximoPasso}</p>
                    </div>
                  ))}
                </div>
              )}
            </AcoesCard>

            <AcoesCard icone="📵" titulo="Contato esfriando" vazio="Nenhuma tarefa em acompanhamento esfriando no momento.">
              {gargalos.length > 0 && (
                <div className="mt-3 flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                  {gargalos.map((g) => (
                    <Link key={`${g.tipo}-${g.id}`} to={g.parl ? `/parlamentares/${g.parl.casa}/${g.parl.id}` : '#'} className="flex items-center justify-between gap-2 py-2 text-xs hover:text-indigo-600">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-slate-700 dark:text-slate-200">{g.nome}</span>
                        <span className="block truncate text-slate-400">{g.label}</span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${GARGALO_ESTILO[g.nivel]}`}>{g.dias}d sem contato</span>
                    </Link>
                  ))}
                </div>
              )}
            </AcoesCard>

            <AcoesCard icone="🎂" titulo="Aniversários (14 dias)" vazio="Nenhum aniversário nos próximos 14 dias.">
              {aniversariosProximos.length > 0 && (
                <div className="mt-3 flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                  {aniversariosProximos.map((p) => (
                    <Link key={`${p.casa}-${p.id}`} to={`/parlamentares/${p.casa}/${p.id}`} className="flex items-center gap-2 py-2 text-xs hover:text-indigo-600">
                      {p.foto ? <img src={p.foto} alt={p.nome} className="h-6 w-6 shrink-0 rounded-full object-cover" /> : <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[9px] font-bold text-amber-700">{initials(p.nome)}</span>}
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-700 dark:text-slate-200">{p.nome}</span>
                      <span className="shrink-0 text-slate-400">{p.diffDias === 0 ? 'hoje' : `em ${p.diffDias}d`}</span>
                    </Link>
                  ))}
                </div>
              )}
            </AcoesCard>
          </div>
        </ScrollReveal>
      )}

      {!store.loading && store.destinacoes.length > 0 && (
        <ScrollReveal delay={0.08} className="mt-6 rounded-2xl border border-red-100 bg-red-50/40 p-6 dark:border-red-900/40 dark:bg-red-500/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">💰 Captação de Recursos — CBM-GO</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Destinações de recursos ao Corpo de Bombeiros Militar de Goiás</p>
            </div>
            <Link to="/captacao" className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700">
              Ver tudo →
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Total captado (previsto)</p>
              <p className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-white">{fmtR(totalPrevisto)}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Média últimos {Math.min(3, anosCaptacao.length)} anos</p>
              <p className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-white">{fmtR(mediaUltimos3Anos)}</p>
            </div>
            {topParlamentar && (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Quem mais destinou</p>
                <p className="mt-0.5 truncate text-lg font-semibold text-slate-900 dark:text-white">{topParlamentar.nome}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{fmtR(topParlamentar.valor)}</p>
              </div>
            )}
          </div>
          {anosCaptacao.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {anosCaptacao.slice().sort((a, b) => a - b).map((a) => (
                <Link key={a} to={`/captacao?ano=${a}`} className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-600 hover:text-white dark:border-red-900 dark:bg-slate-900 dark:text-red-300">
                  {a}
                </Link>
              ))}
            </div>
          )}
        </ScrollReveal>
      )}

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
