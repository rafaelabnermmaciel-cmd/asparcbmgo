import { useMemo, useState } from 'react';
import { LuChartColumn, LuPrinter, LuBanknote, LuHandshake } from 'react-icons/lu';
import { useStore, TIPOS_EVENTO, destinacaoConfirmada } from '../lib/store.jsx';
import ScrollReveal from '../components/ScrollReveal.jsx';
import { btnGhost } from './Gerenciamento.jsx';

function fmtR(v) {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}
function fmtData(d) {
  return d ? d.split('-').reverse().join('/') : '—';
}

const PERIODOS = [
  { key: 30, label: 'Últimos 30 dias' },
  { key: 90, label: 'Últimos 90 dias' },
  { key: 365, label: 'Último ano' },
  { key: 0, label: 'Tudo' },
];

export default function Relatorios() {
  const store = useStore();
  const [periodo, setPeriodo] = useState(90);

  // Acordo verbal é promessa ainda não formalizada — fica fora do relatório oficial de
  // prestação de contas, e listada à parte (ver bloco "Acordos verbais" abaixo).
  const destinacoesConfirmadas = useMemo(() => store.destinacoes.filter(destinacaoConfirmada), [store.destinacoes]);
  const acordosVerbais = useMemo(() => store.destinacoes.filter((d) => d.status === 'Acordo Verbal'), [store.destinacoes]);

  // Relatório de captação flexível: sem filtro nenhum já é o relatório geral; qualquer
  // combinação de ano/parlamentar/objeto recorta o mesmo relatório, sem precisar de telas
  // separadas por tipo.
  const [filtroAno, setFiltroAno] = useState('todos');
  const [filtroParl, setFiltroParl] = useState('todos');
  const [filtroObjeto, setFiltroObjeto] = useState('todos');
  const filtrosAtivos = filtroAno !== 'todos' || filtroParl !== 'todos' || filtroObjeto !== 'todos';

  const anosDisponiveis = useMemo(() => [...new Set(destinacoesConfirmadas.map((d) => d.ano))].sort((a, b) => b - a), [destinacoesConfirmadas]);
  const parlamentaresDisponiveis = useMemo(
    () => [...new Set(destinacoesConfirmadas.map((d) => d.parlamentarNome).filter(Boolean))].sort(),
    [destinacoesConfirmadas]
  );
  const objetosDisponiveis = useMemo(
    () => [...new Set(destinacoesConfirmadas.map((d) => d.objeto).filter(Boolean))].sort(),
    [destinacoesConfirmadas]
  );

  const destinacoesRelatorio = useMemo(
    () =>
      destinacoesConfirmadas.filter(
        (d) =>
          (filtroAno === 'todos' || d.ano === filtroAno) &&
          (filtroParl === 'todos' || d.parlamentarNome === filtroParl) &&
          (filtroObjeto === 'todos' || d.objeto === filtroObjeto)
      ),
    [destinacoesConfirmadas, filtroAno, filtroParl, filtroObjeto]
  );

  const tituloRelatorio = [filtroAno !== 'todos' ? String(filtroAno) : null, filtroParl !== 'todos' ? filtroParl : null, filtroObjeto !== 'todos' ? filtroObjeto : null]
    .filter(Boolean)
    .join(' · ') || 'Relatório geral';

  const porAno = useMemo(() => {
    const grupos = new Map();
    destinacoesRelatorio.forEach((d) => {
      const g = grupos.get(d.ano) || { ano: d.ano, itens: [], previsto: 0, confirmado: 0 };
      g.itens.push(d);
      g.previsto += d.valorPrevisto || 0;
      g.confirmado += d.valorConfirmado || 0;
      grupos.set(d.ano, g);
    });
    return [...grupos.values()].sort((a, b) => b.ano - a.ano);
  }, [destinacoesRelatorio]);

  const totalGeral = destinacoesRelatorio.reduce((s, d) => s + (d.valorPrevisto || 0), 0);
  const confirmadoGeral = destinacoesRelatorio.reduce((s, d) => s + (d.valorConfirmado || 0), 0);
  const totalVerbal = acordosVerbais.reduce((s, d) => s + (d.valorPrevisto || 0), 0);
  const selectCls = 'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';

  const reunioesFiltradas = useMemo(() => {
    const eventos = store.eventos.filter((e) => e.status === 'Realizada');
    if (!periodo) return eventos.slice().sort((a, b) => b.data.localeCompare(a.data));
    const limite = new Date();
    limite.setDate(limite.getDate() - periodo);
    const limiteStr = limite.toISOString().slice(0, 10);
    return eventos.filter((e) => e.data >= limiteStr).sort((a, b) => b.data.localeCompare(a.data));
  }, [store.eventos, periodo]);

  if (store.loading) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-24 sm:px-6 lg:px-10 lg:pb-8 print:px-0 print:py-0">
      <ScrollReveal className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-semibold text-slate-900 dark:text-white">
            <LuChartColumn className="h-6 w-6 text-indigo-500" /> Relatórios
          </h1>
          <p className="mt-1 text-sm text-slate-400">Resumo pronto pra prestar contas — imprima ou exporte como PDF.</p>
        </div>
        <button onClick={() => window.print()} className={`${btnGhost} flex items-center gap-1.5`}>
          <LuPrinter className="h-3.5 w-3.5" /> Imprimir / gerar PDF
        </button>
      </ScrollReveal>

      {/* Cabeçalho só na impressão */}
      <div className="hidden print:mb-6 print:block">
        <h1 className="text-xl font-bold">Relatório — Captação de Recursos e Reuniões · CBM-GO</h1>
        <p className="text-xs text-slate-500">Gerado em {new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      <ScrollReveal delay={0.05} className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 print:mt-4 print:break-inside-avoid print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <LuBanknote className="h-4 w-4 text-red-500" /> Destinações de recursos
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{tituloRelatorio}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <select value={filtroAno} onChange={(e) => setFiltroAno(e.target.value === 'todos' ? 'todos' : parseInt(e.target.value, 10))} className={selectCls}>
              <option value="todos">Todos os anos</option>
              {anosDisponiveis.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select value={filtroParl} onChange={(e) => setFiltroParl(e.target.value)} className={selectCls}>
              <option value="todos">Todos os parlamentares</option>
              {parlamentaresDisponiveis.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select value={filtroObjeto} onChange={(e) => setFiltroObjeto(e.target.value)} className={selectCls}>
              <option value="todos">Todos os objetos</option>
              {objetosDisponiveis.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            {filtrosAtivos && (
              <button
                onClick={() => { setFiltroAno('todos'); setFiltroParl('todos'); setFiltroObjeto('todos'); }}
                className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Total previsto</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{fmtR(totalGeral)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Total confirmado</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{fmtR(confirmadoGeral)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Destinações</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{destinacoesRelatorio.length}</p>
          </div>
        </div>

        {porAno.map((g) => (
          <div key={g.ano} className="mt-6 print:break-inside-avoid">
            <div className="flex items-baseline justify-between border-b border-slate-100 pb-1.5 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{g.ano}</p>
              <p className="text-xs text-slate-400">{g.itens.length} destinações · {fmtR(g.previsto)} previsto · {fmtR(g.confirmado)} confirmado</p>
            </div>
            <table className="mt-2 w-full text-left text-xs print:border-collapse">
              <thead className="text-slate-400">
                <tr>
                  <th className="py-1 pr-2 font-medium print:border-b print:border-slate-300 print:py-1.5">Parlamentar</th>
                  <th className="py-1 pr-2 font-medium print:border-b print:border-slate-300 print:py-1.5">Município</th>
                  <th className="py-1 pr-2 font-medium print:border-b print:border-slate-300 print:py-1.5">Objeto</th>
                  <th className="py-1 pr-2 text-right font-medium print:border-b print:border-slate-300 print:py-1.5">Valor previsto</th>
                  <th className="py-1 font-medium print:border-b print:border-slate-300 print:py-1.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {g.itens
                  .slice()
                  .sort((a, b) => (b.valorPrevisto || 0) - (a.valorPrevisto || 0))
                  .map((d) => (
                    <tr key={d.id} className="text-slate-600 dark:text-slate-300">
                      <td className="py-1 pr-2 print:border-b print:border-slate-100 print:py-1">{d.parlamentarNome || '—'}</td>
                      <td className="py-1 pr-2 print:border-b print:border-slate-100 print:py-1">{d.municipio}</td>
                      <td className="py-1 pr-2 print:border-b print:border-slate-100 print:py-1">{d.objeto || '—'}</td>
                      <td className="py-1 pr-2 text-right print:border-b print:border-slate-100 print:py-1">{fmtR(d.valorPrevisto)}</td>
                      <td className="py-1 print:border-b print:border-slate-100 print:py-1">{d.status}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}
        {porAno.length === 0 && (
          <p className="mt-3 text-xs text-slate-400">
            {filtrosAtivos ? 'Nenhuma destinação encontrada para esses filtros.' : 'Nenhuma destinação cadastrada ainda.'}
          </p>
        )}
      </ScrollReveal>

      {acordosVerbais.length > 0 && (
        <ScrollReveal delay={0.08} className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/40 p-6 dark:border-amber-900/40 dark:bg-amber-500/5 print:mt-4 print:break-inside-avoid print:rounded-none print:border print:border-amber-300 print:p-3 print:shadow-none">
          <p className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
            <LuHandshake className="h-4 w-4 text-amber-600" /> Acordos verbais (promessas — não contabilizadas acima)
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{acordosVerbais.length} promessas · {fmtR(totalVerbal)} no total, ainda não formalizadas</p>
          <table className="mt-3 w-full text-left text-xs">
            <thead className="text-slate-400">
              <tr>
                <th className="py-1 pr-2 font-medium">Parlamentar</th>
                <th className="py-1 pr-2 font-medium">Município</th>
                <th className="py-1 pr-2 font-medium">Ano</th>
                <th className="py-1 font-medium text-right">Valor prometido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100 dark:divide-amber-900/30">
              {acordosVerbais
                .slice()
                .sort((a, b) => (b.valorPrevisto || 0) - (a.valorPrevisto || 0))
                .map((d) => (
                  <tr key={d.id} className="text-slate-600 dark:text-slate-300">
                    <td className="py-1 pr-2">{d.parlamentarNome || '—'}</td>
                    <td className="py-1 pr-2">{d.municipio}</td>
                    <td className="py-1 pr-2">{d.ano}</td>
                    <td className="py-1 text-right">{fmtR(d.valorPrevisto)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </ScrollReveal>
      )}

      <ScrollReveal delay={0.1} className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 print:mt-8 print:break-inside-avoid print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
            <LuHandshake className="h-4 w-4 text-indigo-500" /> Reuniões realizadas
          </p>
          <div className="flex flex-wrap gap-1.5 print:hidden">
            {PERIODOS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriodo(p.key)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${periodo === p.key ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="hidden text-xs text-slate-500 print:block">{PERIODOS.find((p) => p.key === periodo)?.label}</p>
        </div>
        <table className="mt-3 w-full text-left text-xs">
          <thead className="text-slate-400">
            <tr>
              <th className="py-1 pr-2 font-medium">Data</th>
              <th className="py-1 pr-2 font-medium">Categoria</th>
              <th className="py-1 pr-2 font-medium">Assunto</th>
              <th className="py-1 font-medium">Parlamentar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {reunioesFiltradas.map((e) => (
              <tr key={e.id} className="text-slate-600 dark:text-slate-300">
                <td className="py-1 pr-2 whitespace-nowrap">{fmtData(e.data)}</td>
                <td className="py-1 pr-2">{TIPOS_EVENTO[e.tipo] || e.tipo}</td>
                <td className="py-1 pr-2">{e.titulo}</td>
                <td className="py-1">{e.parlamentarNome || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {reunioesFiltradas.length === 0 && <p className="mt-3 text-xs text-slate-400">Nenhuma reunião realizada registrada nesse período.</p>}
      </ScrollReveal>
    </div>
  );
}
