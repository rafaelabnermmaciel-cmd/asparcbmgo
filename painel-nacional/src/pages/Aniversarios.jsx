import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useParlamentares, initials, UFS } from '../lib/data.js';
import ScrollReveal from '../components/ScrollReveal.jsx';
import EmptyState from '../components/EmptyState.jsx';

const MESES_LONGO = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function diaMes(dataISO) {
  // dataISO no formato AAAA-MM-DD (vindo da API da Câmara/Senado)
  const partes = dataISO?.split('-');
  if (!partes || partes.length < 3) return null;
  return { mes: parseInt(partes[1], 10), dia: parseInt(partes[2], 10) };
}

const selectClass =
  'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200';

function CardAniversario({ p, ehHoje }) {
  return (
    <Link
      to={`/parlamentares/${p.casa}/${p.id}`}
      className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        ehHoje
          ? 'border-amber-300 bg-amber-50/60 dark:border-amber-700 dark:bg-amber-500/10'
          : 'border-slate-200 bg-white hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900'
      }`}
    >
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${ehHoje ? 'bg-amber-500 text-white' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300'}`}>
        {ehHoje ? '🎉 Hoje' : String(p.dm.dia).padStart(2, '0')}
      </span>
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-50 dark:bg-indigo-500/10">
        {p.foto ? (
          <img src={p.foto} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-300">{initials(p.nome)}</span>
        )}
      </div>
      <span className="w-full truncate text-sm font-medium text-slate-800 dark:text-slate-100">{p.nome}</span>
      <span className="text-xs text-slate-400">{p.partido} · {p.uf}</span>
    </Link>
  );
}

export default function Aniversarios() {
  const { loading, parlamentares } = useParlamentares();
  const [uf, setUf] = useState('');
  const [mes, setMes] = useState(0); // 0 = todos os meses

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

  const filtrados = useMemo(
    () => comData.filter((p) => (!uf || p.uf === uf) && (!mes || p.dm.mes === mes)),
    [comData, uf, mes]
  );

  const aniversariantesHoje = filtrados.filter((p) => p.dm.mes === hojeMes && p.dm.dia === hojeDia);

  const gruposPorMes = useMemo(() => {
    const map = new Map();
    filtrados.forEach((p) => {
      if (!map.has(p.dm.mes)) map.set(p.dm.mes, []);
      map.get(p.dm.mes).push(p);
    });
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [filtrados]);

  if (loading) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-24 sm:px-6 lg:px-10 lg:pb-8">
      <ScrollReveal>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">🎂 Aniversários</h1>
        <p className="mt-1 text-sm text-slate-400">
          {filtrados.length} de {comData.length} parlamentares, em ordem cronológica pelo dia de nascimento.
        </p>
      </ScrollReveal>

      <ScrollReveal delay={0.04} className="mt-5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setUf(uf === 'GO' ? '' : 'GO')}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${uf === 'GO' ? 'bg-red-600 text-white' : 'border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-500/10'}`}
        >
          🚒 {uf === 'GO' ? '✓ Priorizando Goiás' : 'Priorizar Goiás'}
        </button>
        <select value={uf} onChange={(e) => setUf(e.target.value)} className={selectClass}>
          <option value="">Todos os estados</option>
          {UFS.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
        <select value={mes} onChange={(e) => setMes(parseInt(e.target.value))} className={selectClass}>
          <option value={0}>Todos os meses</option>
          {MESES_LONGO.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
      </ScrollReveal>

      {aniversariantesHoje.length > 0 && (
        <ScrollReveal delay={0.06} className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-500/10">
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
          <EmptyState title="Nenhum aniversário encontrado" description="Ajuste os filtros de estado ou mês." />
        </ScrollReveal>
      )}

      {gruposPorMes.map(([mesNum, itens], i) => (
        <ScrollReveal key={mesNum} delay={0.1 + i * 0.02} className="mt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {MESES_LONGO[mesNum - 1]} <span className="font-normal normal-case text-slate-400">· {itens.length}</span>
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {itens.map((p) => (
              <CardAniversario key={`${p.casa}-${p.id}`} p={p} ehHoje={p.dm.mes === hojeMes && p.dm.dia === hojeDia} />
            ))}
          </div>
        </ScrollReveal>
      ))}
    </div>
  );
}
