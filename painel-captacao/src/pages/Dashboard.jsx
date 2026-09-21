import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts';
import { LuBanknote, LuHandshake, LuTrophy, LuTriangleAlert, LuUsers, LuCalendarCheck, LuFlag, LuFlame } from 'react-icons/lu';
import { useCaptacoes, useQuarteis, useEventos, STATUS_TERMINAL } from '../lib/data.js';
import { computeQuartelRanking, rankPorCaptacao, rankPorArticulacao } from '../lib/ranking.js';
import { useTheme } from '../lib/theme.jsx';
import { CATEGORICO } from '../lib/palette.js';
import { statusBadgeClass } from '../components/CaptacaoForm.jsx';
import { AlertaParado, diasSemAndamento } from '../components/CaptacaoTimeline.jsx';
import ScrollReveal from '../components/ScrollReveal.jsx';
import StatCard from '../components/StatCard.jsx';
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

function anoDe(dataIso) {
  return dataIso ? dataIso.slice(0, 4) : null;
}

function ChartCard({ title, sub, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
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

function EndLabel(valueFmt) {
  return ({ x, y, width, height, value }) => (
    <text x={x + width + 6} y={y + height / 2} dy={4} fontSize={11} className="fill-slate-500 dark:fill-slate-400">
      {valueFmt(value)}
    </text>
  );
}

function BarCard({ data, valueFmt, color, trackColor, gradId, tooltipStyle, allowDecimals = true }) {
  return (
    <div style={{ height: Math.max(140, data.length * 34 + 20) }} className="mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 56 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-slate-100 dark:stroke-slate-800" />
          <XAxis type="number" allowDecimals={allowDecimals} domain={[0, (max) => Math.ceil((max || 1) * 1.2)]} tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-400" tickFormatter={valueFmt} />
          <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-500" />
          <Tooltip cursor={{ fill: 'rgba(220,38,38,0.06)' }} formatter={(v) => valueFmt(v)} contentStyle={tooltipStyle} />
          <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={20} fill={`url(#${gradId})`} background={{ fill: trackColor, radius: [0, 8, 8, 0] }}>
            <LabelList dataKey="value" content={EndLabel(valueFmt)} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Dashboard() {
  const { loading, captacoes } = useCaptacoes();
  const { loading: loadingQuarteis, quarteis } = useQuarteis();
  const { eventos } = useEventos();
  const { theme } = useTheme();

  const [anoSelecionado, setAnoSelecionado] = useState('todos');

  // Anos pra filtrar sempre incluem o atual + os 2 seguintes (pra já dar pra escolher um ano
  // futuro mesmo sem nenhuma captação lançada nele ainda), mais qualquer ano que já tenha
  // captação cadastrada (ex: anos anteriores).
  const anosDisponiveis = useMemo(() => {
    const anoAtual = new Date().getFullYear();
    const anos = new Set([anoAtual, anoAtual + 1, anoAtual + 2]);
    captacoes.forEach((c) => {
      const ano = anoDe(c.criadoEm);
      if (ano) anos.add(Number(ano));
    });
    return [...anos].sort((a, b) => a - b);
  }, [captacoes]);

  const captacoesDoAno = useMemo(
    () => (anoSelecionado === 'todos' ? captacoes : captacoes.filter((c) => anoDe(c.criadoEm) === anoSelecionado)),
    [captacoes, anoSelecionado]
  );

  const ranking = useMemo(() => computeQuartelRanking(captacoesDoAno, quarteis, eventos), [captacoesDoAno, quarteis, eventos]);
  const porCaptacao = useMemo(() => rankPorCaptacao(ranking).filter((q) => q.totalPrevisto > 0), [ranking]);
  const porArticulacao = useMemo(() => rankPorArticulacao(ranking).filter((q) => q.qtdArticulacoes > 0), [ranking]);

  const totalArticulado = ranking.reduce((s, q) => s + q.totalPrevisto, 0);
  const totalEntregue = ranking.reduce((s, q) => s + q.totalEntregue, 0);
  // "Destinado" é o marco em que o parlamentar já formalizou a destinação do recurso — quem já
  // chegou em "Entregue" passou por esse marco também, então soma os dois.
  const totalDestinado = useMemo(
    () => captacoesDoAno.filter((c) => c.status === 'Destinado' || c.status === 'Entregue').reduce((s, c) => s + (c.valorPrevisto || 0), 0),
    [captacoesDoAno]
  );
  const totalArticulacoes = captacoesDoAno.length;
  const totalReunioes = ranking.reduce((s, q) => s + q.qtdReunioes, 0);

  const recentes = useMemo(
    () => [...captacoesDoAno].sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || '')).slice(0, 8),
    [captacoesDoAno]
  );

  // Contatos que estão há 15+ dias sem nenhum andamento novo na linha do tempo e ainda não
  // chegaram num desfecho (ver AlertaParado em CaptacaoTimeline.jsx) — precisam de atenção.
  const esfriando = useMemo(
    () =>
      captacoesDoAno
        .filter((c) => !STATUS_TERMINAL.includes(c.status))
        .map((c) => ({ captacao: c, dias: diasSemAndamento(c, eventos) }))
        .filter((x) => x.dias !== null && x.dias >= 15)
        .sort((a, b) => b.dias - a.dias),
    [captacoesDoAno, eventos]
  );

  const corAzul = CATEGORICO[0][theme];
  const corAqua = CATEGORICO[2][theme];
  const trackColor = theme === 'dark' ? '#1e293b' : '#f1f5f9';
  const tooltipStyle = { borderRadius: 12, border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0', fontSize: 12, background: theme === 'dark' ? '#0f172a' : '#fff', color: theme === 'dark' ? '#e2e8f0' : '#0f172a' };

  if (loading || loadingQuarteis) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:px-6 lg:px-10 lg:pb-8">
      <ScrollReveal>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Dashboard de Captação</h1>
        <p className="mt-1 text-sm text-slate-400">Ranking gamificado dos quartéis do CBMGO na captação de recursos junto ao Congresso Nacional.</p>
      </ScrollReveal>

      <ScrollReveal delay={0.02} className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Ano</span>
        <button type="button" onClick={() => setAnoSelecionado('todos')} className={`rounded-full px-3 py-1 text-xs font-medium ${anoSelecionado === 'todos' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
          Todos
        </button>
        {anosDisponiveis.map((ano) => (
          <button key={ano} type="button" onClick={() => setAnoSelecionado(String(ano))} className={`rounded-full px-3 py-1 text-xs font-medium ${anoSelecionado === String(ano) ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
            {ano}
          </button>
        ))}
      </ScrollReveal>

      {quarteis.length === 0 && (
        <ScrollReveal delay={0.03} className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-300">
          <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Nenhum quartel cadastrado ainda no banco. Adicione (ou confira) a lista em Supabase → Table Editor → tabela "quarteis" — ver SETUP.md.</p>
        </ScrollReveal>
      )}

      <ScrollReveal delay={0.05} className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard dense valueSize="text-xl" label="Total articulado" value={fmtRCompact(totalArticulado)} sub={fmtR(totalArticulado)} icon={<LuBanknote />} accent="red" />
        <StatCard dense valueSize="text-xl" label="Total destinado" value={fmtRCompact(totalDestinado)} icon={<LuFlag />} accent="amber" />
        <StatCard dense valueSize="text-xl" label="Total entregue" value={fmtRCompact(totalEntregue)} icon={<LuTrophy />} accent="emerald" />
        <StatCard dense valueSize="text-xl" label="Articulações cadastradas" value={totalArticulacoes} icon={<LuHandshake />} accent="indigo" />
        <StatCard dense valueSize="text-xl" label="Reuniões registradas" value={totalReunioes} icon={<LuCalendarCheck />} accent="rose" />
      </ScrollReveal>

      {esfriando.length > 0 && (
        <ScrollReveal delay={0.08} className="mt-6">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <LuFlame className="h-4 w-4 text-amber-500" /> Contatos esfriando ({esfriando.length})
          </p>
          <div className="flex flex-col gap-2">
            {esfriando.map(({ captacao: c }) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-900 dark:bg-amber-500/5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                    {c.quartelNome} <span className="font-normal text-slate-400">· {c.parlamentarNome}</span>
                  </p>
                  <p className="truncate text-xs text-slate-500">{c.objeto}</p>
                </div>
                <AlertaParado captacao={c} eventos={eventos} />
              </div>
            ))}
          </div>
        </ScrollReveal>
      )}

      <ScrollReveal delay={0.12} className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartCard icon={LuBanknote} title="Relatório de captação" sub="Valor previsto por quartel">
          {porCaptacao.length ? (
            <BarCard
              data={porCaptacao.slice(0, 10).map((q) => ({ name: q.nome.length > 18 ? `${q.nome.slice(0, 17)}…` : q.nome, value: q.totalPrevisto }))}
              valueFmt={fmtRCompact}
              color={corAzul}
              trackColor={trackColor}
              gradId="gradCaptacao"
              tooltipStyle={tooltipStyle}
            />
          ) : (
            <p className="mt-6 text-center text-xs text-slate-400">Nenhuma captação cadastrada ainda.</p>
          )}
        </ChartCard>

        <ChartCard icon={LuHandshake} title="Relatório de articulação" sub="Cadastros + reuniões por quartel">
          {porArticulacao.length ? (
            <BarCard
              data={porArticulacao.slice(0, 10).map((q) => ({ name: q.nome.length > 18 ? `${q.nome.slice(0, 17)}…` : q.nome, value: q.qtdArticulacoes }))}
              valueFmt={(v) => `${v} cadastro${v === 1 ? '' : 's'}`}
              color={corAqua}
              trackColor={trackColor}
              gradId="gradArticulacao"
              tooltipStyle={tooltipStyle}
              allowDecimals={false}
            />
          ) : (
            <p className="mt-6 text-center text-xs text-slate-400">Nenhuma articulação cadastrada ainda.</p>
          )}
        </ChartCard>
      </ScrollReveal>

      <ScrollReveal delay={0.16} className="mt-6">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <LuUsers className="h-4 w-4 text-red-500" /> Atividade recente
        </p>
        {recentes.length ? (
          <div className="flex flex-col gap-2">
            {recentes.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                    {c.quartelNome} <span className="font-normal text-slate-400">· {c.parlamentarNome}</span>
                  </p>
                  <p className="truncate text-xs text-slate-500">{c.objeto}{c.valorPrevisto ? ` · ${fmtRCompact(c.valorPrevisto)}` : ''}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${statusBadgeClass(c.status)}`}>{c.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Nenhum cadastro ainda" description="As articulações e captações cadastradas por cada quartel vão aparecer aqui." />
        )}
      </ScrollReveal>
    </div>
  );
}
