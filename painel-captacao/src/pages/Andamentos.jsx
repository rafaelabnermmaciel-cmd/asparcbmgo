import { useMemo, useState } from 'react';
import { LuFileText, LuImage, LuTrash2, LuClock } from 'react-icons/lu';
import { useQuarteis, useCaptacoes, useEventos } from '../lib/data.js';
import { useAuth } from '../lib/auth.js';
import ScrollReveal from '../components/ScrollReveal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { inputClass, btnDanger, fmtR, statusBadgeClass } from '../components/CaptacaoForm.jsx';
import { AlertaParado, LinhaDoTempo } from '../components/CaptacaoTimeline.jsx';

// Aba própria pra registrar o dia a dia de cada captação já cadastrada — reuniões, visitas,
// atualizações — sem precisar passar pelo formulário de "Cadastrar primeiro contato". Tudo
// aqui fica "Em articulação" até o militar responsável marcar o desfecho (Indicado ou
// Arquivado) dentro da própria linha do tempo de cada captação.
export default function Andamentos() {
  const { aprovado } = useAuth();
  const { quarteis } = useQuarteis();
  const { captacoes, updateCaptacao, removeCaptacao } = useCaptacoes();
  const { eventos, addEvento, removeEvento } = useEventos();

  const [filtroQuartel, setFiltroQuartel] = useState('');
  const [timelineAbertaId, setTimelineAbertaId] = useState(null);

  const cadastrosFiltrados = useMemo(
    () => (filtroQuartel ? captacoes.filter((c) => c.quartelId === filtroQuartel) : captacoes),
    [captacoes, filtroQuartel]
  );

  async function removerCaptacao(c) {
    if (!confirm(`Excluir a captação "${c.objeto}" (${c.quartelNome} · ${c.parlamentarNome})? Essa ação não pode ser desfeita.`)) return;
    try {
      await removeCaptacao(c.id);
    } catch (err) {
      alert(err.message || 'Falha ao excluir. Tente novamente.');
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-24 sm:px-6 lg:px-10 lg:pb-8">
      <ScrollReveal>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Adicionar andamento</h1>
        <p className="mt-1 text-sm text-slate-400">
          Tudo fica "Em articulação" até o militar responsável marcar o desfecho — Indicado ou Arquivado — dentro da linha do tempo de cada captação. Filtre por quartel pra achar mais rápido.
        </p>
      </ScrollReveal>

      <ScrollReveal delay={0.06} className="mt-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Captações cadastradas ({cadastrosFiltrados.length})</p>
          <select className={`${inputClass} w-auto`} value={filtroQuartel} onChange={(e) => setFiltroQuartel(e.target.value)}>
            <option value="">Todos os quartéis</option>
            {quarteis.map((q) => <option key={q.id} value={q.id}>{q.nome}</option>)}
          </select>
        </div>
        {cadastrosFiltrados.length ? (
          <div className="flex flex-col gap-2">
            {cadastrosFiltrados
              .slice()
              .sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''))
              .map((c) => (
                <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        {c.quartelNome} <span className="font-normal text-slate-400">· {c.parlamentarNome}</span>{' '}
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusBadgeClass(c.status)}`}>{c.status}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{c.objeto}{c.valorPrevisto ? ` · ${fmtR(c.valorPrevisto)} previsto` : ''}</p>
                      <p className="mt-0.5 text-xs text-slate-400">Responsável: {c.responsavel}{c.stakeholder ? ` · Stakeholder: ${c.stakeholder}` : ''}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      <AlertaParado captacao={c} eventos={eventos} />
                      <button type="button" onClick={() => setTimelineAbertaId(timelineAbertaId === c.id ? null : c.id)} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:text-slate-400">
                        <LuClock className="h-3 w-3" /> Adicionar andamento
                      </button>
                      {aprovado && (
                        <button type="button" onClick={() => removerCaptacao(c)} className={`flex items-center gap-1 ${btnDanger}`}>
                          <LuTrash2 className="h-3 w-3" /> Excluir
                        </button>
                      )}
                    </div>
                  </div>
                  {c.observacoes && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{c.observacoes}</p>}
                  {(c.anexos?.length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {c.anexos.map((a, i) => (
                        <a key={`${a.nome}-${i}`} href={a.dataUrl || a.url} download={a.nome} target={a.url ? '_blank' : undefined} rel="noreferrer" className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:border-red-300 dark:border-slate-700 dark:text-slate-300">
                          {a.tipo?.startsWith('image/') ? <LuImage className="h-3 w-3" /> : <LuFileText className="h-3 w-3" />} {a.nome}
                        </a>
                      ))}
                    </div>
                  )}
                  {timelineAbertaId === c.id && (
                    <LinhaDoTempo captacao={c} eventos={eventos} addEvento={addEvento} removeEvento={removeEvento} onMudarStatus={(status) => updateCaptacao(c.id, { status })} />
                  )}
                </div>
              ))}
          </div>
        ) : (
          <EmptyState title="Nenhuma captação cadastrada" description="Cadastre a primeira em Cadastrar primeiro contato." />
        )}
      </ScrollReveal>
    </div>
  );
}
