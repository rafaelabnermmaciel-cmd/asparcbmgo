import { useMemo, useState } from 'react';
import { useLegislativo } from '../lib/data.js';
import ScrollReveal from '../components/ScrollReveal.jsx';
import EmptyState from '../components/EmptyState.jsx';

function fmtData(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

const TIPO_COLOR = {
  PL: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  PLP: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300',
  PEC: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-300',
};

export default function Legislativo() {
  const { loading, dados } = useLegislativo();
  const [tipo, setTipo] = useState('');
  const [casa, setCasa] = useState('');

  const proposicoes = dados?.proposicoes || [];
  const casas = useMemo(() => [...new Set(proposicoes.map((p) => p.casaAtual))].sort(), [proposicoes]);

  const filtradas = useMemo(
    () =>
      proposicoes
        .filter((p) => !tipo || p.tipo === tipo)
        .filter((p) => !casa || p.casaAtual === casa)
        .slice()
        .sort((a, b) => (b.ultimaMovimentacao?.data || '').localeCompare(a.ultimaMovimentacao?.data || '')),
    [proposicoes, tipo, casa]
  );

  const selectClass =
    'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200';

  if (loading) return null;

  if (!dados) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <EmptyState title="Acompanhamento legislativo indisponível" description="/public/data/acompanhamento-legislativo.json não foi encontrado." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-24 sm:px-6 lg:px-10 lg:pb-8">
      <ScrollReveal>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Acompanhamento Legislativo</h1>
        <p className="mt-1 text-sm text-slate-400">
          Fonte: {dados.fonte?.nome} — atualizado em {fmtData(dados.fonte?.data)}
        </p>
      </ScrollReveal>

      {dados.atualizacoesRecentes?.length > 0 && (
        <ScrollReveal delay={0.05} className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Atualizações Recentes</p>
          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {dados.atualizacoesRecentes.map((a, i) => (
              <div key={i} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:gap-3">
                <span className="shrink-0 text-xs font-semibold text-indigo-600 dark:text-indigo-400">{a.proposicao}</span>
                <span className="shrink-0 text-xs text-slate-400">{fmtData(a.data)}</span>
                <span className="text-sm text-slate-600 dark:text-slate-300">{a.fato}</span>
              </div>
            ))}
          </div>
        </ScrollReveal>
      )}

      <ScrollReveal delay={0.1} className="mt-5 flex flex-wrap gap-2">
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={selectClass}>
          <option value="">Todos os tipos</option>
          <option value="PL">PL</option>
          <option value="PLP">PLP</option>
          <option value="PEC">PEC</option>
        </select>
        <select value={casa} onChange={(e) => setCasa(e.target.value)} className={selectClass}>
          <option value="">Todas as casas</option>
          {casas.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </ScrollReveal>

      <ScrollReveal delay={0.12} className="mt-5 flex flex-col gap-3">
        {filtradas.map((p) => (
          <details key={p.id} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm open:shadow-md dark:border-slate-800 dark:bg-slate-900">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIPO_COLOR[p.tipo] || TIPO_COLOR.PL}`}>
                      {p.tipo} {p.numero}
                    </span>
                    <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                      {p.casaAtual}
                    </span>
                    {p.encerrada && (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                        Tramitação encerrada
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{p.assunto}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">{fmtData(p.ultimaMovimentacao?.data)}</span>
              </summary>
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Situação Atual</p>
                  <p className="mt-0.5 text-slate-600 dark:text-slate-300">{p.situacao}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Próximos Passos</p>
                  <p className="mt-0.5 text-amber-700 dark:text-amber-400">{p.proximosPassos}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Ponto de Atenção</p>
                  <p className="mt-0.5 text-slate-600 dark:text-slate-300">{p.pontoAtencao}</p>
                </div>
              </div>
            </details>
        ))}
      </ScrollReveal>
    </div>
  );
}
