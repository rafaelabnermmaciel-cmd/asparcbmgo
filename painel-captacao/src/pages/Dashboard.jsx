import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts';
import { LuBanknote, LuHandshake, LuTrophy, LuTriangleAlert, LuUsers, LuCalendarCheck } from 'react-icons/lu';
import { useCaptacoes, useQuarteis } from '../lib/data.js';
import { computeQuartelRanking, rankPorCaptacao, rankPorArticulacao, nivelQuartel } from '../lib/ranking.js';
import { useTheme } from '../lib/theme.jsx';
import { CATEGORICO } from '../lib/palette.js';
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

const PODIO_MEDALHA = ['🥇', '🥈', '🥉'];

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

function BarCard({ data, valueFmt, color, trackColor, gradId, tooltipStyle }) {
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
          <XAxis type="number" domain={[0, (max) => Math.ceil((max || 1) * 1.2)]} tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-400" tickFormatter={valueFmt} />
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
  const { theme } = useTheme();

  const ranking = useMemo(() => computeQuartelRanking(captacoes, quarteis), [captacoes, quarteis]);
  const porCaptacao = useMemo(() => rankPorCaptacao(ranking).filter((q) => q.totalPrevisto > 0), [ranking]);
  const porArticulacao = useMemo(() => rankPorArticulacao(ranking).filter((q) => q.qtdArticulacoes > 0), [ranking]);

  const totalPrevisto = ranking.reduce((s, q) => s + q.totalPrevisto, 0);
  const totalConfirmado = ranking.reduce((s, q) => s + q.totalConfirmado, 0);
  const totalArticulacoes = captacoes.length;
  const totalReunioes = ranking.reduce((s, q) => s + q.qtdReunioes, 0);

  const podio = porCaptacao.slice(0, 3);

  const recentes = useMemo(
    () => [...captacoes].sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || '')).slice(0, 8),
    [captacoes]
  );

  const corAzul = CATEGORICO[0][theme];
  const corAqua = CATEGORICO[2][theme];
  const trackColor = theme === 'dark' ? '#1e293b' : '#f1f5f9';
  const tooltipStyle = { borderRadius: 12, border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0', fontSize: 12, background: theme === 'dark' ? '#0f172a' : '#fff', color: theme === 'dark' ? '#e2e8f0' : '#0f172a' };

  if (loading || loadingQuarteis) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:px-6 lg:px-10 lg:pb-8">
      <ScrollReveal className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Dashboard de Captação</h1>
          <p className="mt-1 text-sm text-slate-400">Ranking gamificado dos quartéis do CBMGO na captação de recursos junto ao Congresso Nacional.</p>
        </div>
        <Link to="/cadastro" className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700">
          + Cadastrar captação
        </Link>
      </ScrollReveal>

      {quarteis.length === 0 && (
        <ScrollReveal delay={0.03} className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-300">
          <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Nenhum quartel cadastrado ainda no banco. Adicione (ou confira) a lista em Supabase → Table Editor → tabela "quarteis" — ver SETUP.md.</p>
        </ScrollReveal>
      )}

      <ScrollReveal delay={0.05} className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total captado (previsto)" value={fmtRCompact(totalPrevisto)} sub={fmtR(totalPrevisto)} icon={<LuBanknote />} accent="red" />
        <StatCard label="Total confirmado" value={fmtRCompact(totalConfirmado)} icon={<LuTrophy />} accent="amber" />
        <StatCard label="Articulações cadastradas" value={totalArticulacoes} icon={<LuHandshake />} accent="indigo" />
        <StatCard label="Reuniões registradas" value={totalReunioes} icon={<LuCalendarCheck />} accent="emerald" />
      </ScrollReveal>

      {podio.length > 0 && (
        <ScrollReveal delay={0.08} className="mt-6">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <LuTrophy className="h-4 w-4 text-amber-500" /> Pódio — quartéis que mais captaram
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {podio.map((q, i) => {
              const nivel = nivelQuartel(q.totalPrevisto);
              return (
                <div key={q.quartelId} className={`rounded-2xl border p-5 shadow-sm ${i === 0 ? 'border-amber-300 bg-amber-50/60 dark:border-amber-700 dark:bg-amber-500/10' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{PODIO_MEDALHA[i]}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{nivel.emoji} {nivel.nome}</span>
                  </div>
                  <p className="mt-3 truncate text-sm font-semibold text-slate-900 dark:text-white">{q.nome}</p>
                  <p className="truncate text-xs text-slate-400">{q.municipio}</p>
                  <p className="mt-2 text-xl font-bold text-red-600 dark:text-red-400">{fmtRCompact(q.totalPrevisto)}</p>
                  <p className="text-xs text-slate-400">{q.qtdArticulacoes} articulaç{q.qtdArticulacoes === 1 ? 'ão' : 'ões'} · {q.qtdReunioes} reuni{q.qtdReunioes === 1 ? 'ão' : 'ões'}</p>
                </div>
              );
            })}
          </div>
        </ScrollReveal>
      )}

      <ScrollReveal delay={0.12} className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartCard icon={LuBanknote} title="Ranking por captação (R$)" sub="Valor previsto por quartel">
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

        <ChartCard icon={LuHandshake} title="Ranking por articulação" sub="Cadastros + reuniões por quartel">
          {porArticulacao.length ? (
            <BarCard
              data={porArticulacao.slice(0, 10).map((q) => ({ name: q.nome.length > 18 ? `${q.nome.slice(0, 17)}…` : q.nome, value: q.qtdArticulacoes }))}
              valueFmt={(v) => `${v} cadastro${v === 1 ? '' : 's'}`}
              color={corAqua}
              trackColor={trackColor}
              gradId="gradArticulacao"
              tooltipStyle={tooltipStyle}
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
                <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{c.status}</span>
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
