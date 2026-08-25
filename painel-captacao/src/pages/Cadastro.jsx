import { useMemo, useState } from 'react';
import { LuCircleCheck, LuTriangleAlert, LuFileText, LuImage, LuPencil, LuTrash2, LuClock } from 'react-icons/lu';
import { useParlamentaresGO, useQuarteis, useMilitares, useStakeholders, useCaptacoes, useEventos } from '../lib/data.js';
import ScrollReveal from '../components/ScrollReveal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FileField from '../components/FileField.jsx';
import {
  inputClass, btnPrimary, btnDanger, labelClass, fmtR, statusBadgeClass,
  CamposCaptacao, EdicaoCaptacao, VAZIO_CAPTACAO, validarCaptacao, paraPayloadCaptacao,
} from '../components/CaptacaoForm.jsx';
import { AlertaParado, LinhaDoTempo, hoje } from '../components/CaptacaoTimeline.jsx';

export default function Cadastro() {
  const { parlamentares } = useParlamentaresGO();
  const { quarteis } = useQuarteis();
  const { militares } = useMilitares();
  const { stakeholders } = useStakeholders();
  const { captacoes, submitCaptacao, updateCaptacao, removeCaptacao } = useCaptacoes();
  const { eventos, addEvento, removeEvento } = useEventos();

  const [f, setF] = useState(VAZIO_CAPTACAO);
  const [dataInicio, setDataInicio] = useState(hoje());
  const [descricaoInicio, setDescricaoInicio] = useState('');
  const [anexos, setAnexos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [filtroQuartel, setFiltroQuartel] = useState('');
  const [editandoId, setEditandoId] = useState(null);
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

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    const problema = validarCaptacao(f);
    if (problema) { setErro(problema); return; }

    setEnviando(true);
    try {
      const registro = await submitCaptacao({ ...paraPayloadCaptacao(f, quarteis), anexos });
      try {
        await addEvento({ captacao_id: registro.id, data: dataInicio, descricao: descricaoInicio.trim() || 'Primeiro contato' });
        setSucesso('Captação cadastrada! Já está salva e visível pra todo mundo.');
      } catch {
        setSucesso('Captação cadastrada! (não deu pra registrar a data do primeiro contato na linha do tempo — adicione manualmente ali embaixo, em "Linha do tempo".)');
      }
      setF(VAZIO_CAPTACAO);
      setDataInicio(hoje());
      setDescricaoInicio('');
      setAnexos([]);
    } catch (err) {
      setErro(err.message || 'Falha ao cadastrar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-24 sm:px-6 lg:px-10 lg:pb-8">
      <ScrollReveal>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Cadastrar primeiro contato</h1>
        <p className="mt-1 text-sm text-slate-400">Registre o primeiro contato de uma articulação com parlamentar — os próximos passos entram como andamento ali embaixo, até o militar responsável marcar o desfecho.</p>
      </ScrollReveal>

      {quarteis.length === 0 && (
        <ScrollReveal delay={0.03} className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-300">
          <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Nenhum quartel cadastrado ainda no banco. Adicione (ou confira) a lista em Supabase → Table Editor → tabela "quarteis" — ver SETUP.md.</p>
        </ScrollReveal>
      )}

      <ScrollReveal delay={0.06} className="mt-5">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-900">
          <CamposCaptacao valores={f} onChange={(k, v) => setF((prev) => ({ ...prev, [k]: v }))} quarteis={quarteis} militares={militares} parlamentares={parlamentares} stakeholders={stakeholders} />
          <div>
            <p className={labelClass}>Data do primeiro contato *</p>
            <input type="date" className={inputClass} value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div>
            <p className={labelClass}>O que aconteceu nesse primeiro contato</p>
            <input className={inputClass} value={descricaoInicio} onChange={(e) => setDescricaoInicio(e.target.value)} placeholder="Ex: primeiro contato por telefone (opcional)" />
          </div>
          <div className="sm:col-span-2">
            <p className={labelClass}>Documentos e fotos</p>
            <div className="mt-1">
              <FileField anexos={anexos} onChange={setAnexos} />
            </div>
          </div>

          {erro && (
            <p className="sm:col-span-2 flex items-center gap-1.5 text-xs text-red-600"><LuTriangleAlert className="h-3.5 w-3.5" /> {erro}</p>
          )}
          {sucesso && (
            <p className="sm:col-span-2 flex items-center gap-1.5 text-xs text-emerald-600"><LuCircleCheck className="h-3.5 w-3.5" /> {sucesso}</p>
          )}

          <div className="sm:col-span-2">
            <button type="submit" disabled={enviando} className={btnPrimary}>
              {enviando ? 'Enviando...' : 'Cadastrar primeiro contato'}
            </button>
          </div>
        </form>
      </ScrollReveal>

      <ScrollReveal delay={0.1} className="mt-8">
        <div className="mb-1 flex items-center gap-1.5">
          <LuClock className="h-4 w-4 text-red-500" />
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Adicionar andamento</p>
        </div>
        <p className="text-xs text-slate-400">
          Tudo aqui fica "Em articulação" até o militar responsável marcar o desfecho — Indicado ou Arquivado — dentro da linha do tempo de cada captação. Filtre por quartel pra achar mais rápido.
        </p>
        <div className="mt-3 mb-3 flex flex-wrap items-center justify-between gap-2">
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
                  {editandoId === c.id ? (
                    <EdicaoCaptacao
                      captacao={c}
                      quarteis={quarteis}
                      militares={militares}
                      parlamentares={parlamentares}
                      stakeholders={stakeholders}
                      onCancelar={() => setEditandoId(null)}
                      onSalvar={async (payload) => { await updateCaptacao(c.id, payload); setEditandoId(null); }}
                    />
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{c.quartelNome} <span className="font-normal text-slate-400">· {c.parlamentarNome}</span></p>
                          <p className="mt-0.5 text-xs text-slate-500">{c.objeto}{c.valorPrevisto ? ` · ${fmtR(c.valorPrevisto)} previsto` : ''}</p>
                          <p className="mt-0.5 text-xs text-slate-400">Responsável: {c.responsavel}{c.stakeholder ? ` · Stakeholder: ${c.stakeholder}` : ''}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                          <AlertaParado captacao={c} eventos={eventos} />
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusBadgeClass(c.status)}`}>{c.status}</span>
                          <button type="button" onClick={() => setTimelineAbertaId(timelineAbertaId === c.id ? null : c.id)} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:text-slate-400">
                            <LuClock className="h-3 w-3" /> Linha do tempo
                          </button>
                          <button type="button" onClick={() => setEditandoId(c.id)} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:text-slate-400">
                            <LuPencil className="h-3 w-3" /> Editar
                          </button>
                          <button type="button" onClick={() => removerCaptacao(c)} className={`flex items-center gap-1 ${btnDanger}`}>
                            <LuTrash2 className="h-3 w-3" /> Excluir
                          </button>
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
                    </>
                  )}
                </div>
              ))}
          </div>
        ) : (
          <EmptyState title="Nenhuma captação cadastrada" description="Use o formulário acima para registrar a primeira articulação." />
        )}
      </ScrollReveal>
    </div>
  );
}
