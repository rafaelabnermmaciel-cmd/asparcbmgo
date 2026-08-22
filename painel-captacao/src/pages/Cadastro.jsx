import { useMemo, useState } from 'react';
import { LuCircleCheck, LuTriangleAlert, LuFileText, LuImage } from 'react-icons/lu';
import { useParlamentaresGO, useQuarteis, useCaptacoes, STATUS_CAPTACAO } from '../lib/data.js';
import ScrollReveal from '../components/ScrollReveal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FileField from '../components/FileField.jsx';

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-red-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200';
const labelClass = 'text-[11px] font-medium uppercase tracking-wide text-slate-400';

function fmtR(v) {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

const VAZIO = {
  quartelId: '',
  responsavel: '',
  stakeholder: '',
  parlamentarNome: '',
  objeto: '',
  valorPrevisto: '',
  numReunioes: 0,
  status: STATUS_CAPTACAO[0],
  dataAgenda: '',
  observacoes: '',
};

export default function Cadastro() {
  const { parlamentares } = useParlamentaresGO();
  const { quarteis } = useQuarteis();
  const { captacoes, submitCaptacao } = useCaptacoes();

  const [f, setF] = useState(VAZIO);
  const [anexos, setAnexos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [filtroQuartel, setFiltroQuartel] = useState('');

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const nomesParlamentares = useMemo(() => parlamentares.map((p) => p.nome).sort(), [parlamentares]);

  const cadastrosFiltrados = useMemo(
    () => (filtroQuartel ? captacoes.filter((c) => c.quartelId === filtroQuartel) : captacoes),
    [captacoes, filtroQuartel]
  );

  function validar() {
    if (!f.quartelId) return 'Selecione o quartel.';
    if (!f.responsavel.trim()) return 'Informe o responsável pela articulação.';
    if (!f.parlamentarNome) return 'Selecione o parlamentar.';
    if (!f.objeto.trim()) return 'Descreva o objeto da captação.';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    const problema = validar();
    if (problema) { setErro(problema); return; }

    const quartel = quarteis.find((q) => q.id === f.quartelId);
    setEnviando(true);
    try {
      await submitCaptacao({
        quartelId: f.quartelId,
        quartelNome: quartel?.nome || f.quartelId,
        municipio: quartel?.municipio || '',
        responsavel: f.responsavel.trim(),
        stakeholder: f.stakeholder.trim(),
        parlamentarNome: f.parlamentarNome,
        objeto: f.objeto.trim(),
        valorPrevisto: f.valorPrevisto ? parseFloat(f.valorPrevisto) : 0,
        numReunioes: parseInt(f.numReunioes, 10) || 0,
        status: f.status,
        dataAgenda: f.status === 'Agenda marcada' ? f.dataAgenda : '',
        observacoes: f.observacoes.trim(),
        anexos,
      });
      setSucesso('Captação cadastrada! Já está salva e visível pra todo mundo.');
      setF(VAZIO);
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
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Cadastrar captação</h1>
        <p className="mt-1 text-sm text-slate-400">Registre o andamento de uma articulação com parlamentar — desde o primeiro contato até a entrega do recurso.</p>
      </ScrollReveal>

      {quarteis.length === 0 && (
        <ScrollReveal delay={0.03} className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-300">
          <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Nenhum quartel cadastrado ainda no banco. Adicione (ou confira) a lista em Supabase → Table Editor → tabela "quarteis" — ver SETUP.md.</p>
        </ScrollReveal>
      )}

      <ScrollReveal delay={0.06} className="mt-5">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className={labelClass}>Quartel *</p>
            <select className={inputClass} value={f.quartelId} onChange={set('quartelId')}>
              <option value="">Selecione...</option>
              {quarteis.map((q) => (
                <option key={q.id} value={q.id}>{q.nome} — {q.municipio}</option>
              ))}
            </select>
          </div>
          <div>
            <p className={labelClass}>Parlamentar *</p>
            <select className={inputClass} value={f.parlamentarNome} onChange={set('parlamentarNome')}>
              <option value="">Selecione...</option>
              {nomesParlamentares.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <p className={labelClass}>Responsável pela articulação *</p>
            <input className={inputClass} value={f.responsavel} onChange={set('responsavel')} placeholder="Quem do quartel está conduzindo" />
          </div>
          <div>
            <p className={labelClass}>Stakeholder / contato-chave</p>
            <input className={inputClass} value={f.stakeholder} onChange={set('stakeholder')} placeholder="Ex: assessor, chefe de gabinete..." />
          </div>
          <div className="sm:col-span-2">
            <p className={labelClass}>Objeto da captação *</p>
            <input className={inputClass} value={f.objeto} onChange={set('objeto')} placeholder="Ex: viatura, equipamentos, reforma do quartel..." />
          </div>
          <div>
            <p className={labelClass}>Valor previsto (R$)</p>
            <input type="number" min="0" step="0.01" className={inputClass} value={f.valorPrevisto} onChange={set('valorPrevisto')} placeholder="0" />
          </div>
          <div>
            <p className={labelClass}>Quantas reuniões já teve</p>
            <input type="number" min="0" className={inputClass} value={f.numReunioes} onChange={set('numReunioes')} />
          </div>
          <div>
            <p className={labelClass}>Estágio *</p>
            <select className={inputClass} value={f.status} onChange={set('status')}>
              {STATUS_CAPTACAO.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          {f.status === 'Agenda marcada' && (
            <div>
              <p className={labelClass}>Data da agenda</p>
              <input type="date" className={inputClass} value={f.dataAgenda} onChange={set('dataAgenda')} />
            </div>
          )}
          <div className="sm:col-span-2">
            <p className={labelClass}>Observações</p>
            <textarea rows={3} className={inputClass} value={f.observacoes} onChange={set('observacoes')} />
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
            <button type="submit" disabled={enviando} className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50">
              {enviando ? 'Enviando...' : 'Cadastrar captação'}
            </button>
          </div>
        </form>
      </ScrollReveal>

      <ScrollReveal delay={0.1} className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Captações já cadastradas ({cadastrosFiltrados.length})</p>
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
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{c.quartelNome} <span className="font-normal text-slate-400">· {c.parlamentarNome}</span></p>
                      <p className="mt-0.5 text-xs text-slate-500">{c.objeto}{c.valorPrevisto ? ` · ${fmtR(c.valorPrevisto)} previsto` : ''} · {c.numReunioes || 0} reunião(ões)</p>
                      <p className="mt-0.5 text-xs text-slate-400">Responsável: {c.responsavel}{c.stakeholder ? ` · Stakeholder: ${c.stakeholder}` : ''}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{c.status}</span>
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
