import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts';
import { useStore, STATUS_DESTINACAO } from '../lib/store.jsx';
import { useAdmin } from '../lib/admin.jsx';
import { useParlamentares } from '../lib/data.js';
import { useTheme } from '../lib/theme.jsx';
import ScrollReveal from '../components/ScrollReveal.jsx';
import EtapasTracker from '../components/EtapasTracker.jsx';
import EmptyState from '../components/EmptyState.jsx';

function fmtR(v) {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}
function fmtRCompact(v) {
  if (!v) return 'R$0';
  if (v >= 1e6) return `R$${(v / 1e6).toFixed(1)}Mi`;
  if (v >= 1e3) return `R$${(v / 1e3).toFixed(0)}mil`;
  return fmtR(v);
}

// Paleta categórica validada (dataviz skill, references/palette.md) — ordem fixa, nunca ciclada.
const CATEGORICO = [
  { light: '#2a78d6', dark: '#3987e5' }, // blue
  { light: '#eb6834', dark: '#d95926' }, // orange
  { light: '#1baf7a', dark: '#199e70' }, // aqua
  { light: '#eda100', dark: '#c98500' }, // yellow
  { light: '#e87ba4', dark: '#d55181' }, // magenta
  { light: '#008300', dark: '#008300' }, // green
  { light: '#4a3aa7', dark: '#9085e9' }, // violet
  { light: '#e34948', dark: '#e66767' }, // red
];
const AZUL = CATEGORICO[0];
const GRUPOS_ANDAMENTO = [
  { key: 'Planejamento', cor: CATEGORICO[0] },
  { key: 'Em execução', cor: CATEGORICO[1] },
  { key: 'Entregue', cor: CATEGORICO[2] },
];

function grupoDoStatus(status) {
  if (status === 'Entregue') return 'Entregue';
  if (status === 'Em articulação' || status === 'Indicado') return 'Planejamento';
  return 'Em execução';
}

function ChartCard({ title, sub, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      {children}
    </div>
  );
}

// Rótulo no fim da barra — leitura direta sem depender de hover (essencial no celular).
function EndLabel(valueFmt) {
  return ({ x, y, width, height, value }) => (
    <text x={x + width + 6} y={y + height / 2} dy={4} fontSize={11} className="fill-slate-500 dark:fill-slate-400">
      {valueFmt(value)}
    </text>
  );
}

function BarCard({ data, valueFmt, height, color, tooltipStyle }) {
  return (
    <div style={{ height: height ?? Math.max(140, data.length * 34 + 20) }} className="mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 48 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-slate-100 dark:stroke-slate-800" />
          <XAxis type="number" domain={[0, (max) => Math.ceil(max * 1.2)]} tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-400" tickFormatter={valueFmt} />
          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-500" />
          <Tooltip cursor={{ fill: 'rgba(42,120,214,0.08)' }} formatter={(v) => valueFmt(v)} contentStyle={tooltipStyle} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={18} fill={color}>
            <LabelList dataKey="value" content={EndLabel(valueFmt)} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Parte-do-todo (status/andamento): uma única barra horizontal empilhada, em vez de donut —
// lê melhor com várias categorias e nomes longos (ex: "Aprovado em Comissão"), e a legenda
// abaixo já carrega o valor direto, sem depender só do tooltip.
function StackedBarCard({ segments, valueLabel, tooltipStyle }) {
  const row = segments.reduce((acc, s) => ({ ...acc, [s.name]: s.value }), { name: '' });
  return (
    <div className="mt-4">
      <div style={{ height: 40 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[row]} layout="vertical" margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip cursor={{ fill: 'transparent' }} formatter={(v, name) => [`${v} ${valueLabel}`, name]} contentStyle={tooltipStyle} />
            {segments.map((s, i) => (
              <Bar
                key={s.name}
                dataKey={s.name}
                stackId="a"
                fill={s.cor}
                radius={[i === 0 ? 6 : 0, i === segments.length - 1 ? 6 : 0, i === segments.length - 1 ? 6 : 0, i === 0 ? 6 : 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        {segments.map((s) => (
          <div key={s.name} className="flex items-center gap-1.5 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.cor }} />
            <span className="text-slate-500 dark:text-slate-400">{s.name}</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Captacao() {
  const store = useStore();
  const { admin } = useAdmin();
  const { parlamentares } = useParlamentares();
  const { theme } = useTheme();
  const [searchParams] = useSearchParams();
  const anoParam = searchParams.get('ano');
  const [ano, setAno] = useState(anoParam ? parseInt(anoParam) : 'todos');
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    if (anoParam) setAno(parseInt(anoParam));
  }, [anoParam]);

  const anos = useMemo(() => [...new Set(store.destinacoes.map((d) => d.ano))].sort((a, b) => a - b), [store.destinacoes]);

  const filtradas = useMemo(
    () => (ano === 'todos' ? store.destinacoes : store.destinacoes.filter((d) => d.ano === ano)),
    [store.destinacoes, ano]
  );

  const totalPrevisto = filtradas.reduce((s, d) => s + (d.valorPrevisto || 0), 0);

  const ranking = useMemo(() => {
    const porParl = new Map();
    filtradas.forEach((d) => {
      const nome = d.parlamentarNome || 'Não identificado';
      const atual = porParl.get(nome) || { nome, previsto: 0, confirmado: 0, qtd: 0 };
      atual.previsto += d.valorPrevisto || 0;
      atual.confirmado += d.valorConfirmado || 0;
      atual.qtd += 1;
      porParl.set(nome, atual);
    });
    return [...porParl.values()].sort((a, b) => b.previsto - a.previsto);
  }, [filtradas]);

  const rankingChart = useMemo(
    () => ranking.slice(0, 8).map((r) => ({ name: r.nome.length > 18 ? `${r.nome.slice(0, 17)}…` : r.nome, value: r.previsto })),
    [ranking]
  );

  const statusChart = useMemo(() => {
    const contagem = {};
    filtradas.forEach((d) => { contagem[d.status] = (contagem[d.status] || 0) + 1; });
    return STATUS_DESTINACAO.map((s, i) => ({ name: s, value: contagem[s] || 0, cor: CATEGORICO[i % CATEGORICO.length][theme] })).filter((s) => s.value > 0);
  }, [filtradas, theme]);

  const andamentoChart = useMemo(() => {
    const contagem = { Planejamento: 0, 'Em execução': 0, Entregue: 0 };
    filtradas.forEach((d) => { contagem[grupoDoStatus(d.status)] += 1; });
    return GRUPOS_ANDAMENTO.map((g) => ({ name: g.key, value: contagem[g.key], cor: g.cor[theme] })).filter((g) => g.value > 0);
  }, [filtradas, theme]);

  const porAnoChart = useMemo(() => {
    if (ano !== 'todos') return [];
    const porAno = new Map();
    store.destinacoes.forEach((d) => porAno.set(d.ano, (porAno.get(d.ano) || 0) + (d.valorPrevisto || 0)));
    return [...porAno.entries()].sort((a, b) => a[0] - b[0]).map(([a, v]) => ({ name: String(a), value: v }));
  }, [store.destinacoes, ano]);

  const municipiosChart = useMemo(() => {
    const porMun = new Map();
    filtradas.forEach((d) => {
      const m = d.municipio || 'Não informado';
      porMun.set(m, (porMun.get(m) || 0) + (d.valorPrevisto || 0));
    });
    return [...porMun.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name: name.length > 20 ? `${name.slice(0, 19)}…` : name, value }));
  }, [filtradas]);

  function findParlamentar(nome) {
    return parlamentares.find((p) => p.nome === nome);
  }

  if (store.loading) return null;

  const corAzul = AZUL[theme];
  const tooltipStyle = { borderRadius: 12, border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0', fontSize: 12, background: theme === 'dark' ? '#0f172a' : '#fff', color: theme === 'dark' ? '#e2e8f0' : '#0f172a' };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-24 sm:px-6 lg:px-10 lg:pb-8">
      <ScrollReveal className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">💰 Captação de Recursos</h1>
          <p className="mt-1 text-sm text-slate-400">{filtradas.length} destinações · {fmtR(totalPrevisto)} previsto{ano !== 'todos' ? ` em ${ano}` : ''}</p>
        </div>
        <Link to="/" className="text-xs text-slate-400 hover:text-indigo-600">← Resumo geral</Link>
      </ScrollReveal>

      <ScrollReveal delay={0.05} className="mt-5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setAno('todos')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${ano === 'todos' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
        >
          Todos
        </button>
        {anos.map((a) => (
          <button
            key={a}
            onClick={() => setAno(a)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${ano === a ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
          >
            {a}
          </button>
        ))}
      </ScrollReveal>

      {admin && (
        <ScrollReveal delay={0.07} className="mt-4 flex justify-end">
          <Link to="/gerenciamento" className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700">
            + Nova destinação →
          </Link>
        </ScrollReveal>
      )}

      {filtradas.length === 0 && (
        <ScrollReveal delay={0.1} className="mt-5">
          <EmptyState title="Nenhuma destinação neste ano" description="Ajuste o filtro de ano ou cadastre uma nova em Gerenciamento." />
        </ScrollReveal>
      )}

      {filtradas.length > 0 && (
        <ScrollReveal delay={0.1} className="mt-5 grid gap-4 sm:grid-cols-2">
          <ChartCard title="Quem mais destinou" sub={`${ano === 'todos' ? 'Todos os anos' : ano} · valor previsto${ranking.length > 8 ? ` · top 8 de ${ranking.length}` : ''}`}>
            <BarCard data={rankingChart} valueFmt={fmtRCompact} color={corAzul} tooltipStyle={tooltipStyle} />
          </ChartCard>

          <ChartCard title={ano === 'todos' ? 'Status das destinações' : `Andamento em ${ano}`} sub={ano === 'todos' ? 'Por etapa atual' : 'Destinações por etapa'}>
            <StackedBarCard segments={ano === 'todos' ? statusChart : andamentoChart} valueLabel="destinações" tooltipStyle={tooltipStyle} />
          </ChartCard>

          {ano === 'todos' && porAnoChart.length > 1 && (
            <ChartCard title="Captação por ano" sub="Valor previsto total">
              <BarCard data={porAnoChart} valueFmt={fmtRCompact} height={140} color={corAzul} tooltipStyle={tooltipStyle} />
            </ChartCard>
          )}

          {municipiosChart.length > 0 && (
            <ChartCard title="Top municípios / unidades" sub={`${ano === 'todos' ? 'Todos os anos' : ano} · valor previsto`}>
              <BarCard data={municipiosChart} valueFmt={fmtRCompact} color={corAzul} tooltipStyle={tooltipStyle} />
            </ChartCard>
          )}
        </ScrollReveal>
      )}

      {filtradas.length > 0 && ano === 'todos' && (
        <ScrollReveal delay={0.18} className="mt-5">
          <button onClick={() => setShowTable((v) => !v)} className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            {showTable ? '− Ocultar tabela completa' : `+ Ver todas as ${filtradas.length} destinações em tabela`}
          </button>
          {showTable && (
            <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Parlamentar</th>
                    <th className="px-3 py-2 font-medium">Município / Unidade</th>
                    <th className="px-3 py-2 font-medium">Ano</th>
                    <th className="px-3 py-2 text-right font-medium">Valor previsto</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtradas
                    .slice()
                    .sort((a, b) => (b.valorPrevisto || 0) - (a.valorPrevisto || 0))
                    .map((d) => (
                      <tr key={d.id} className="text-slate-600 dark:text-slate-300">
                        <td className="whitespace-nowrap px-3 py-2">{d.parlamentarNome || '—'}</td>
                        <td className="px-3 py-2">{d.municipio}</td>
                        <td className="px-3 py-2">{d.ano}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">{fmtR(d.valorPrevisto)}</td>
                        <td className="whitespace-nowrap px-3 py-2">{d.status}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </ScrollReveal>
      )}

      {filtradas.length > 0 && ano !== 'todos' && (
        <ScrollReveal delay={0.18} className="mt-5 flex flex-col gap-2">
          {filtradas
            .slice()
            .sort((a, b) => (b.valorPrevisto || 0) - (a.valorPrevisto || 0))
            .map((d) => {
              const parl = findParlamentar(d.parlamentarNome);
              return (
                <details key={d.id} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm open:shadow-md dark:border-slate-800 dark:bg-slate-900">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                        {d.parlamentarNome || '—'} <span className="font-normal text-slate-400">· {d.municipio}</span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{d.objeto} · {fmtRCompact(d.valorPrevisto)}{d.valorConfirmado ? ` · ${fmtRCompact(d.valorConfirmado)} conf.` : ''}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{d.status}</span>
                  </summary>
                  <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{d.ano}</span>
                      {d.sei && (
                        <>
                          <span>·</span>
                          <span>SEI: {d.sei}</span>
                        </>
                      )}
                      {parl && (
                        <>
                          <span>·</span>
                          <Link to={`/parlamentares/${parl.casa}/${parl.id}`} className="text-indigo-600 hover:underline dark:text-indigo-400">Ver perfil →</Link>
                        </>
                      )}
                    </div>
                    <EtapasTracker etapas={d.etapas} editable={admin} onToggle={(key) => store.toggleDestinacaoEtapa(d.id, key)} />
                    {d.observacoes && <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{d.observacoes}</p>}
                  </div>
                </details>
              );
            })}
        </ScrollReveal>
      )}
    </div>
  );
}
