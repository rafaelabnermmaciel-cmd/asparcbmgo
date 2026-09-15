import { useParlamentaresGO, useStakeholders } from '../lib/data.js';
import ScrollReveal from '../components/ScrollReveal.jsx';
import EmptyState from '../components/EmptyState.jsx';

// Aba só de consulta — o cadastro de um stakeholder novo acontece direto em "Cadastrar
// primeiro contato" ou em "Adicionar andamento" (botão "+ Novo stakeholder" perto do campo de
// stakeholder), pra não precisar sair do que já está fazendo. Aqui só lista quem já existe.
export default function Stakeholders() {
  const { parlamentares } = useParlamentaresGO();
  const { stakeholders } = useStakeholders();

  function nomesParlamentaresDe(s) {
    return (s.parlamentares_keys || [])
      .map((key) => parlamentares.find((p) => `${p.casa}:${p.id}` === key)?.nome)
      .filter(Boolean)
      .join(', ');
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-24 sm:px-6 lg:px-10 lg:pb-8">
      <ScrollReveal>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Stakeholders</h1>
        <p className="mt-1 text-sm text-slate-400">Pessoas (ex: um prefeito) que articulam com um ou mais parlamentares ao mesmo tempo. O cadastro de um novo stakeholder é feito direto em "Cadastrar primeiro contato" ou em "Adicionar andamento" — aqui é só pra consultar quem já está cadastrado.</p>
      </ScrollReveal>

      <ScrollReveal delay={0.06} className="mt-5">
        {stakeholders.length ? (
          <div className="flex flex-col gap-2">
            {stakeholders.map((s) => (
              <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{s.nome}{s.cargo ? <span className="font-normal text-slate-400"> · {s.cargo}</span> : ''}</p>
                <p className="mt-0.5 text-xs text-slate-500">Vinculado a: {nomesParlamentaresDe(s) || '—'}</p>
                {s.projeto && <p className="mt-0.5 text-xs text-slate-400">Projeto: {s.projeto}</p>}
                {s.telefone && <p className="mt-0.5 text-xs text-slate-400">Telefone: {s.telefone}</p>}
                {s.observacoes && <p className="mt-0.5 text-xs text-slate-400">{s.observacoes}</p>}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Nenhum stakeholder cadastrado" description='Cadastre o primeiro em "Cadastrar primeiro contato" ou em "Adicionar andamento".' />
        )}
      </ScrollReveal>
    </div>
  );
}
