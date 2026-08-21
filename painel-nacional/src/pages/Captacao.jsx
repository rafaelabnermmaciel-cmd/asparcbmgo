import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts';
import { LuBanknote, LuTrendingUp, LuTrophy, LuUsers, LuMapPin, LuHandshake, LuGauge } from 'react-icons/lu';
import { useStore, STATUS_DESTINACAO, destinacaoConfirmada } from '../lib/store.jsx';
import { useAdmin } from '../lib/admin.jsx';
import { useParlamentares } from '../lib/data.js';
import { useTheme } from '../lib/theme.jsx';
import { CATEGORICO } from '../lib/palette.js';
import ScrollReveal from '../components/ScrollReveal.jsx';
import EtapasTracker from '../components/EtapasTracker.jsx';
import EmptyState from '../components/EmptyState.jsx';
import StatCard from '../components/StatCard.jsx';
import RadialGauge from '../components/RadialGauge.jsx';

function fmtR(v) {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}
function fmtRCompact(v) {
  if (!v) return 'R$0';
  if (v >= 1e6) return `R$${(v / 1e6).toFixed(1)}Mi`;
  if (v >= 1e3) return `R$${(v / 1e3).toFixed(0)}mil`;
  return fmtR(v);
}

const AZUL = CATEGORICO[0];
const AQUA = CATEGORICO[2];

// As 5 etapas do funil que o usuário acompanha passo a passo por captação — panorama
// simplificado (fora Acordo Verbal, Confirmado e Contratado, que ficam só no detalhe de
// cada item) pra não confundir com números demais na visão geral.
const PAINEL_STATUSES = ['Em articulação', 'Indicado', 'Empenhado', 'Em licitação', 'Entregue'];

function ChartCard({ title, sub, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
          {sub && <p className="truncate text-xs text-slate-400">{sub}</p>}
        </div>
      </div>
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

// Barra com gradiente (um hue só, claro→sólido — leitura de magnitude, não identidade) e
// "track" claro atrás de cada barra — o toque que dá o ar de dashboard moderno sem virar
// arco-íris por barra (que aqui seriam apenas ranks, não categorias com identidade própria).
function BarCard({ data, valueFmt, height, color, trackColor, gradId, tooltipStyle }) {
  return (
    <div style={{ height: height ?? Math.max(140, data.length * 34 + 20) }} className="mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 48 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-slate-100 dark:stroke-slate-800" />
          <XAxis type="number" domain={[0, (max) => Math.ceil(max * 1.2)]} tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-400" tickFormatter={valueFmt} />
          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-500" />
          <Tooltip cursor={{ fill: 'rgba(42,120,214,0.08)' }} formatter={(v) => valueFmt(v)} contentStyle={tooltipStyle} />
          <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={20} fill={`url(#${gradId})`} background={{ fill: trackColor, radius: [0, 8, 8, 0] }}>
            <LabelList dataKey="value" content={EndLabel(valueFmt)} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
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

  // Anos aparecem todos, sem exceção — inclusive o que só tem acordo verbal (ex: 2027) — pra
  // dar pra navegar e ver a previsão daquele ano. "Acordo Verbal" é só o primeiro estágio do
  // fluxo normal, não uma categoria à parte (ver STATUS_DESTINACAO e destinacaoConfirmada).
  const anos = useMemo(() => [...new Set(store.destinacoes.map((d) => d.ano))].sort((a, b) => a - b), [store.destinacoes]);

  // Visão "Todos" soma o pipeline já formalizado (fora acordo verbal) — dinâmico pelo status
  // atual de cada item. Um ano específico mostra o retrato completo daquele ano, sem filtrar.
  const filtradas = useMemo(() => {
    if (ano === 'todos') return store.destinacoes.filter(destinacaoConfirmada);
    return store.destinacoes.filter((d) => d.ano === ano);
  }, [store.destinacoes, ano]);

  const totalPrevisto = filtradas.reduce((s, d) => s + (d.valorPrevisto || 0), 0);

  // Total captado por ano (sem filtrar por status) — sempre visível como número, inclusive
  // pra anos só com acordo verbal, como 2027 — não escondido dentro de um gráfico.
  const totaisPorAno = useMemo(() => {
    const porAno = new Map();
    store.destinacoes.forEach((d) => porAno.set(d.ano, (porAno.get(d.ano) || 0) + (d.valorPrevisto || 0)));
    return [...porAno.entries()].sort((a, b) => a[0] - b[0]);
  }, [store.destinacoes]);

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

  const statusContagem = useMemo(() => {
    const contagem = {};
    STATUS_DESTINACAO.forEach((s) => { contagem[s] = 0; });
    filtradas.forEach((d) => { contagem[d.status] = (contagem[d.status] || 0) + 1; });
    return contagem;
  }, [filtradas]);

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

  // Denominador da média: só anos com algo além de acordo verbal — 2027 (ainda 100% promessa)
  // não deve "diluir" a média dos anos com pipeline já formalizado.
  const anosComPipelineFormal = useMemo(
    () => [...new Set(store.destinacoes.filter(destinacaoConfirmada).map((d) => d.ano))],
    [store.destinacoes]
  );

  function findParlamentar(nome) {
    return parlamentares.find((p) => p.nome === nome);
  }

  if (store.loading) return null;

  const corAzul = AZUL[theme];
  const corAqua = AQUA[theme];
  const trackColor = theme === 'dark' ? '#1e293b' : '#f1f5f9';
  const tooltipStyle = { borderRadius: 12, border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0', fontSize: 12, background: theme === 'dark' ? '#0f172a' : '#fff', color: theme === 'dark' ? '#e2e8f0' : '#0f172a' };

  const anoLabel = ano === 'todos' ? 'Todos os anos' : String(ano);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-24 sm:px-6 lg:px-10 lg:pb-8">
      <ScrollReveal className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-semibold text-slate-900 dark:text-white">
            <LuBanknote className="h-6 w-6 text-red-500" /> Captação de Recursos
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {filtradas.length} destinações · {fmtR(totalPrevisto)} captado{ano !== 'todos' ? ` em ${ano}` : ''}
          </p>
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

      {filtradas.length > 0 && (
        <ScrollReveal delay={0.07} className={`mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 ${ano === 'todos' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
          <StatCard valueSize="text-2xl" label="Total captado" value={fmtRCompact(totalPrevisto)} icon={<LuBanknote />} accent="indigo" />
          <StatCard valueSize="text-2xl" label="Destinações" value={filtradas.length} icon={<LuUsers />} accent="amber" />
          {ano === 'todos' && (
            <StatCard valueSize="text-2xl" label="Média por ano" value={fmtRCompact(totalPrevisto / (anosComPipelineFormal.length || 1))} icon={<LuTrendingUp />} accent="emerald" />
          )}
          <StatCard valueSize="text-xl" label="Quem mais destinou" value={ranking[0]?.nome || '—'} sub={ranking[0] ? fmtRCompact(ranking[0].previsto) : undefined} icon={<LuTrophy />} accent="rose" />
        </ScrollReveal>
      )}

      {ano === 'todos' && totaisPorAno.length > 0 && (
        <ScrollReveal delay={0.09} className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {totaisPorAno.map(([a, v]) => (
            <button
              key={a}
              onClick={() => setAno(a)}
              className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-red-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total captado {a}</p>
              <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{fmtRCompact(v)}</p>
            </button>
          ))}
        </ScrollReveal>
      )}

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
        <ScrollReveal delay={0.1} className="mt-5">
          <ChartCard icon={LuGauge} title="Panorama do período" sub={`${anoLabel} · ${filtradas.length} destinações · % em cada etapa`}>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
              {PAINEL_STATUSES.map((s) => (
                <RadialGauge
                  key={s}
                  value={filtradas.length ? (statusContagem[s] / filtradas.length) * 100 : 0}
                  label={s}
                  sub={`${statusContagem[s]} destinaç${statusContagem[s] === 1 ? 'ão' : 'ões'}`}
                  color={CATEGORICO[STATUS_DESTINACAO.indexOf(s) % CATEGORICO.length][theme]}
                />
              ))}
            </div>
          </ChartCard>
        </ScrollReveal>
      )}

      {filtradas.length > 0 && (
        <ScrollReveal delay={0.12} className="mt-4 grid gap-4 sm:grid-cols-2">
          <ChartCard icon={LuTrophy} title="Quem mais destinou" sub={`${anoLabel} · valor captado${ranking.length > 8 ? ` · top 8 de ${ranking.length}` : ''}`}>
            <BarCard data={rankingChart} valueFmt={fmtRCompact} color={corAzul} trackColor={trackColor} gradId="gradRanking" tooltipStyle={tooltipStyle} />
          </ChartCard>

          {municipiosChart.length > 0 && (
            <ChartCard icon={LuMapPin} title="Top municípios / unidades" sub={`${anoLabel} · valor captado`}>
              <BarCard data={municipiosChart} valueFmt={fmtRCompact} color={corAqua} trackColor={trackColor} gradId="gradMunicipios" tooltipStyle={tooltipStyle} />
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
                    <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${d.status === 'Acordo Verbal' ? 'border border-dashed border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>
                      {d.status === 'Acordo Verbal' && <LuHandshake className="h-3 w-3" />} {d.status}
                    </span>
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
