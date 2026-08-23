import { useState } from 'react';
import { LuPencil, LuTrash2 } from 'react-icons/lu';
import { useParlamentaresGO, useStakeholders } from '../lib/data.js';
import ScrollReveal from '../components/ScrollReveal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { btnGhost, btnDanger } from '../components/CaptacaoForm.jsx';
import { FormularioStakeholder } from '../components/StakeholderForm.jsx';

export default function Stakeholders() {
  const { parlamentares } = useParlamentaresGO();
  const { stakeholders, addStakeholder, updateStakeholder, removeStakeholder } = useStakeholders();
  const [editando, setEditando] = useState(undefined); // undefined=fechado, null=novo, id=editando

  function nomesParlamentaresDe(s) {
    return (s.parlamentares_keys || [])
      .map((key) => parlamentares.find((p) => `${p.casa}:${p.id}` === key)?.nome)
      .filter(Boolean)
      .join(', ');
  }

  async function salvar(payload) {
    if (editando === null) await addStakeholder(payload);
    else await updateStakeholder(editando, payload);
    setEditando(undefined);
  }

  async function excluir(s) {
    if (!confirm(`Excluir o stakeholder "${s.nome}"?`)) return;
    try {
      await removeStakeholder(s.id);
    } catch (err) {
      alert(err.message || 'Falha ao excluir. Tente novamente.');
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-24 sm:px-6 lg:px-10 lg:pb-8">
      <ScrollReveal>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Stakeholders</h1>
        <p className="mt-1 text-sm text-slate-400">Pessoas (ex: um prefeito) que articulam com um ou mais parlamentares ao mesmo tempo. Cadastre aqui e marque todos os parlamentares que se aplicam — depois disso, esse stakeholder aparece pra escolher na hora de cadastrar uma captação, e no perfil de cada parlamentar vinculado.</p>
      </ScrollReveal>

      <ScrollReveal delay={0.05} className="mt-5">
        {editando === undefined ? (
          <button type="button" className={btnGhost} onClick={() => setEditando(null)}>+ Novo stakeholder</button>
        ) : editando === null ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <FormularioStakeholder parlamentares={parlamentares} textoBotao="Cadastrar" onCancelar={() => setEditando(undefined)} onSalvar={salvar} />
          </div>
        ) : null}
      </ScrollReveal>

      <ScrollReveal delay={0.1} className="mt-5">
        {stakeholders.length ? (
          <div className="flex flex-col gap-2">
            {stakeholders.map((s) =>
              editando === s.id ? (
                <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <FormularioStakeholder
                    parlamentares={parlamentares}
                    inicial={{ nome: s.nome, cargo: s.cargo, telefone: s.telefone, projeto: s.projeto || '', observacoes: s.observacoes, parlamentaresKeys: s.parlamentares_keys || [] }}
                    onCancelar={() => setEditando(undefined)}
                    onSalvar={salvar}
                  />
                </div>
              ) : (
                <div key={s.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{s.nome}{s.cargo ? <span className="font-normal text-slate-400"> · {s.cargo}</span> : ''}</p>
                    <p className="mt-0.5 text-xs text-slate-500">Vinculado a: {nomesParlamentaresDe(s) || '—'}</p>
                    {s.projeto && <p className="mt-0.5 text-xs text-slate-400">Projeto: {s.projeto}</p>}
                    {s.telefone && <p className="mt-0.5 text-xs text-slate-400">Telefone: {s.telefone}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button type="button" onClick={() => setEditando(s.id)} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:text-slate-400">
                      <LuPencil className="h-3 w-3" /> Editar
                    </button>
                    <button type="button" onClick={() => excluir(s)} className={`flex items-center gap-1 ${btnDanger}`}>
                      <LuTrash2 className="h-3 w-3" /> Excluir
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        ) : (
          editando === undefined && <EmptyState title="Nenhum stakeholder cadastrado" description='Use o botão "+ Novo stakeholder" acima pra registrar o primeiro.' />
        )}
      </ScrollReveal>
    </div>
  );
}
