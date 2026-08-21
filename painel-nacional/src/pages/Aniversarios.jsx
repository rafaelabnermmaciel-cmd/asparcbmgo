import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useParlamentares, initials } from '../lib/data.js';
import ScrollReveal from '../components/ScrollReveal.jsx';
import EmptyState from '../components/EmptyState.jsx';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function diaMes(dataISO) {
  // dataISO no formato AAAA-MM-DD (vindo da API da Câmara/Senado)
  const partes = dataISO?.split('-');
  if (!partes || partes.length < 3) return null;
  return { mes: parseInt(partes[1], 10), dia: parseInt(partes[2], 10) };
}

export default function Aniversarios() {
  const { loading, parlamentares } = useParlamentares();
  const [uf, setUf] = useState('');

  const hoje = new Date();
  const hojeMes = hoje.getMonth() + 1;
  const hojeDia = hoje.getDate();

  const comData = useMemo(
    () =>
      parlamentares
        .map((p) => ({ ...p, dm: diaMes(p.dataNascimento) }))
        .filter((p) => p.dm)
        .sort((a, b) => a.dm.mes - b.dm.mes || a.dm.dia - b.dm.dia),
    [parlamentares]
  );

  const filtrados = useMemo(() => (uf ? comData.filter((p) => p.uf === uf) : comData), [comData, uf]);

  const aniversariantesHoje = filtrados.filter((p) => p.dm.mes === hojeMes && p.dm.dia === hojeDia);

  if (loading) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-24 sm:px-6 lg:px-10 lg:pb-8">
      <ScrollReveal>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">🎂 Aniversários</h1>
        <p className="mt-1 text-sm text-slate-400">Todos os parlamentares, em ordem cronológica pelo dia de nascimento.</p>
      </ScrollReveal>

      <ScrollReveal delay={0.04} className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={() => setUf(uf === 'GO' ? '' : 'GO')}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${uf === 'GO' ? 'bg-red-600 text-white' : 'border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-500/10'}`}
        >
          🚒 {uf === 'GO' ? '✓ Priorizando Goiás' : 'Priorizar Goiás'}
        </button>
      </ScrollReveal>

      {aniversariantesHoje.length > 0 && (
        <ScrollReveal delay={0.05} className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-500/10">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">🎉 Aniversariante(s) de hoje</p>
          <div className="mt-3 flex flex-col gap-2">
            {aniversariantesHoje.map((p) => (
              <Link key={`${p.casa}-${p.id}`} to={`/parlamentares/${p.casa}/${p.id}`} className="flex items-center gap-3 text-sm font-medium text-amber-900 hover:underline dark:text-amber-200">
                {p.foto ? <img src={p.foto} alt={p.nome} className="h-8 w-8 rounded-full object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-800">{initials(p.nome)}</span>}
                {p.nome}
              </Link>
            ))}
          </div>
        </ScrollReveal>
      )}

      {comData.length === 0 && (
        <ScrollReveal delay={0.1} className="mt-6">
          <EmptyState title="Sem datas de nascimento carregadas ainda" description="Esse dado vem junto com a busca de deputados e senadores (Câmara/Senado)." />
        </ScrollReveal>
      )}

      {comData.length > 0 && filtrados.length === 0 && (
        <ScrollReveal delay={0.1} className="mt-6">
          <EmptyState title="Nenhum aniversário em Goiás" description="Nenhum parlamentar de GO com data de nascimento carregada." />
        </ScrollReveal>
      )}

      {filtrados.length > 0 && (
        <ScrollReveal delay={0.1} className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtrados.map((p) => {
              const ehHoje = p.dm.mes === hojeMes && p.dm.dia === hojeDia;
              return (
                <Link
                  key={`${p.casa}-${p.id}`}
                  to={`/parlamentares/${p.casa}/${p.id}`}
                  className={`flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/60 ${ehHoje ? 'bg-amber-50/60 dark:bg-amber-500/5' : ''}`}
                >
                  <span className="w-12 shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {String(p.dm.dia).padStart(2, '0')} {MESES[p.dm.mes - 1]}
                  </span>
                  {p.foto ? (
                    <img src={p.foto} alt={p.nome} className="h-8 w-8 shrink-0 rounded-full object-cover" loading="lazy" />
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">{initials(p.nome)}</span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100">{p.nome}</span>
                  <span className="shrink-0 text-xs text-slate-400">{p.partido} · {p.uf}</span>
                </Link>
              );
            })}
          </div>
        </ScrollReveal>
      )}
    </div>
  );
}
