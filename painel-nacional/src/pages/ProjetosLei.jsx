import { useMemo, useState } from 'react';
import { LuFileText } from 'react-icons/lu';
import { useStore, STATUS_PROJETO, TIPOS_PROJETO } from '../lib/store.jsx';
import { useAdmin } from '../lib/admin.jsx';
import { useParlamentares } from '../lib/data.js';
import { ProjForm, emptyProj, btnGhost, btnDanger } from './Gerenciamento.jsx';
import ScrollReveal from '../components/ScrollReveal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import EstagioStepper from '../components/EstagioStepper.jsx';

function fmtData(d) {
  if (!d) return null;
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}

const TIPO_COLOR = {
  PL: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  PLP: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300',
  PEC: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-300',
};

export default function ProjetosLei() {
  const store = useStore();
  const { admin } = useAdmin();
  const { parlamentares } = useParlamentares();
  const nomes = useMemo(() => parlamentares.map((p) => p.nome).sort(), [parlamentares]);
  const [tipo, setTipo] = useState('');
  const [status, setStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState(undefined);

  const projetos = store.projetos;

  const filtrados = useMemo(
    () =>
      projetos
        .filter((p) => !tipo || p.tipo === tipo)
        .filter((p) => !status || p.status === status)
        .filter(
          (p) =>
            !busca ||
            p.numero?.toLowerCase().includes(busca.toLowerCase()) ||
            p.ementa?.toLowerCase().includes(busca.toLowerCase()) ||
            p.autor?.toLowerCase().includes(busca.toLowerCase()) ||
            p.relator?.toLowerCase().includes(busca.toLowerCase())
        )
        .slice()
        .sort((a, b) => (b.ultimaMovimentacao?.data || '').localeCompare(a.ultimaMovimentacao?.data || '')),
    [projetos, tipo, status, busca]
  );

  const selectClass =
    'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200';

  if (store.loading) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-24 sm:px-6 lg:px-10 lg:pb-8">
      <ScrollReveal>
        <h1 className="flex items-center gap-2.5 text-2xl font-semibold text-slate-900 dark:text-white">
          <LuFileText className="h-6 w-6 text-indigo-500" /> Projetos de Lei de Interesse do CBM-GO
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {store.projetosFonte?.fonte?.nome
            ? `Fonte: ${store.projetosFonte.fonte.nome} — atualizado em ${fmtData(store.projetosFonte.fonte.data)}, mais itens cadastrados manualmente`
            : `${filtrados.length} de ${projetos.length} projetos`}
        </p>
      </ScrollReveal>

      {store.projetosFonte?.atualizacoesRecentes?.length > 0 && (
        <ScrollReveal delay={0.05} className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Atualizações Recentes</p>
          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {store.projetosFonte.atualizacoesRecentes.map((a, i) => (
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
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por número, ementa ou parlamentar..."
          className={`${selectClass} min-w-[200px] flex-1`}
        />
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={selectClass}>
          <option value="">Todos os tipos</option>
          {TIPOS_PROJETO.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
          <option value="">Todos os status</option>
          {STATUS_PROJETO.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {admin && (
          <button className={btnGhost} onClick={() => setEditando(null)}>+ Novo projeto</button>
        )}
      </ScrollReveal>

      {editando === null && (
        <ScrollReveal delay={0.12} className="mt-4">
          <ProjForm
            initial={emptyProj}
            nomes={nomes}
            onCancel={() => setEditando(undefined)}
            onSave={(f) => { store.addProjeto(f); setEditando(undefined); }}
          />
        </ScrollReveal>
      )}

      <ScrollReveal delay={0.14} className="mt-5 flex flex-col gap-3">
        {filtrados.map((p) => (
          <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {editando === p.id ? (
              <ProjForm
                initial={p}
                nomes={nomes}
                onCancel={() => setEditando(undefined)}
                onSave={(f) => { store.updateProjeto(p.id, f); setEditando(undefined); }}
              />
            ) : (
              <details className="group">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIPO_COLOR[p.tipo] || TIPO_COLOR.PL}`}>
                        {p.tipo} {p.numero}
                      </span>
                      {p.casaAtual && (
                        <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                          {p.casaAtual}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Autor: {p.autor || '—'} · Relator: {p.relator || 'aguardando designação'}
                    </p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{p.ementa}</p>
                    <EstagioStepper estagio={p.status} stages={STATUS_PROJETO} editable={admin} onChange={(st) => store.updateProjeto(p.id, { status: st })} />
                  </div>
                  {p.ultimaMovimentacao?.data && <span className="shrink-0 text-xs text-slate-400">{fmtData(p.ultimaMovimentacao.data)}</span>}
                </summary>
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
                  {p.observacoes && (
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Situação</p>
                      <p className="mt-0.5 text-slate-600 dark:text-slate-300">{p.observacoes}</p>
                    </div>
                  )}
                  {p.proximoPasso && (
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Próximo Passo</p>
                      <p className="mt-0.5 text-amber-700 dark:text-amber-400">{p.proximoPasso}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                    <span>Posição do CBM-GO: {p.posicao || '—'}</span>
                    <span>Prioridade: {p.prioridade || '—'}</span>
                    {p.responsavel && <span>Responsável: {p.responsavel}</span>}
                  </div>
                  {admin && (
                    <div className="flex gap-2 pt-2">
                      <button className={btnGhost} onClick={(e) => { e.preventDefault(); setEditando(p.id); }}>Editar</button>
                      <button className={btnDanger} onClick={(e) => { e.preventDefault(); if (confirm('Remover este projeto?')) store.removeProjeto(p.id); }}>Remover</button>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        ))}
        {filtrados.length === 0 && (
          <EmptyState title="Nenhum projeto encontrado" description="Ajuste os filtros ou adicione um novo." />
        )}
      </ScrollReveal>
    </div>
  );
}
