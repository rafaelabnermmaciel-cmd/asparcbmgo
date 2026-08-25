import { useMemo, useState } from 'react';
import { LuClock, LuPlus, LuTrash2, LuTriangleAlert, LuFileText, LuImage, LuCheck, LuArchive } from 'react-icons/lu';
import { STATUS_TERMINAL } from '../lib/data.js';
import { inputClass, labelClass, btnGhost } from './CaptacaoForm.jsx';
import FileField from './FileField.jsx';

export function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function diasDesde(dataStr) {
  const ms = Date.now() - new Date(`${dataStr}T00:00:00`).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function ultimaData(captacao, eventosDaCaptacao) {
  if (eventosDaCaptacao.length === 0) return (captacao.criadoEm || '').slice(0, 10) || null;
  return eventosDaCaptacao.reduce((max, e) => (e.data > max ? e.data : max), eventosDaCaptacao[0].data);
}

// Badge de alerta quando uma captação em andamento fica muito tempo sem nenhum andamento novo
// registrado na linha do tempo — só faz sentido pra quem ainda não chegou num desfecho
// (Indicado/Arquivado não "esfriam").
export function AlertaParado({ captacao, eventos }) {
  if (STATUS_TERMINAL.includes(captacao.status)) return null;
  const doCaptacao = eventos.filter((e) => e.captacao_id === captacao.id);
  const data = ultimaData(captacao, doCaptacao);
  if (!data) return null;
  const dias = diasDesde(data);
  if (dias >= 30) {
    return <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">🔴 Parado há {dias} dias</span>;
  }
  if (dias >= 15) {
    return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">🟡 Esfriando · {dias} dias sem novidade</span>;
  }
  return null;
}

const ANDAMENTO_VAZIO = { data: hoje(), descricao: '', presentes: '', anexos: [] };

function AnexosEvento({ anexos }) {
  if (!anexos?.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-2">
      {anexos.map((a, i) => (
        <a key={`${a.nome}-${i}`} href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:border-red-300 dark:border-slate-700 dark:text-slate-300">
          {a.tipo?.startsWith('image/') ? <LuImage className="h-3 w-3" /> : <LuFileText className="h-3 w-3" />} {a.nome}
        </a>
      ))}
    </div>
  );
}

// Linha do tempo de uma captação: histórico de andamentos (data, descrição, quem esteve
// presente, foto/documento) + formulário "Adicionar andamento" pra registrar um novo. Toda
// captação nasce "Primeiro contato"; o primeiro andamento lançado aqui já deixa ela "Em
// articulação" sozinha, e continua assim até o militar responsável marcar um desfecho
// ("Indicado" ou "Arquivado") logo abaixo — não existe outro lugar pra mudar o status.
export function LinhaDoTempo({ captacao, eventos, addEvento, removeEvento, onMudarStatus }) {
  const doCaptacao = useMemo(
    () => eventos.filter((e) => e.captacao_id === captacao.id).slice().sort((a, b) => a.data.localeCompare(b.data)),
    [eventos, captacao.id]
  );
  const [novo, setNovo] = useState(ANDAMENTO_VAZIO);
  const [anexos, setAnexos] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [mudandoStatus, setMudandoStatus] = useState(false);
  const [erro, setErro] = useState(null);

  const terminal = STATUS_TERMINAL.includes(captacao.status);

  async function registrar() {
    setErro(null);
    if (!novo.descricao.trim()) { setErro('Descreva o que aconteceu nesse andamento.'); return; }
    setSalvando(true);
    try {
      await addEvento({ captacao_id: captacao.id, data: novo.data, descricao: novo.descricao.trim(), presentes: novo.presentes.trim(), anexos });
      if (captacao.status === 'Primeiro contato' && onMudarStatus) {
        await onMudarStatus('Em articulação');
      }
      setNovo({ ...ANDAMENTO_VAZIO, data: hoje() });
      setAnexos([]);
    } catch (err) {
      setErro(err.message || 'Falha ao registrar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id) {
    if (!confirm('Remover este andamento da linha do tempo?')) return;
    try {
      await removeEvento(id);
    } catch (err) {
      alert(err.message || 'Falha ao excluir. Tente novamente.');
    }
  }

  async function marcarDesfecho(status) {
    if (!confirm(`Marcar esta captação como "${status}"? Isso encerra a articulação — pra reabrir depois é só editar o status.`)) return;
    setMudandoStatus(true);
    try {
      await onMudarStatus(status);
      await addEvento({ captacao_id: captacao.id, data: hoje(), descricao: `Marcado como "${status}".`, presentes: '', anexos: [] });
    } catch (err) {
      alert(err.message || 'Falha ao atualizar. Tente novamente.');
    } finally {
      setMudandoStatus(false);
    }
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
        <LuClock className="h-3.5 w-3.5" /> Linha do tempo
      </p>

      {doCaptacao.length > 0 ? (
        <ol className="mt-2 flex flex-col gap-2 border-l-2 border-slate-100 pl-3 dark:border-slate-800">
          {doCaptacao.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[17px] top-1 h-2 w-2 rounded-full bg-red-500" />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-400">{new Date(`${e.data}T00:00:00`).toLocaleDateString('pt-BR')}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-200">{e.descricao}</p>
                  {e.presentes && <p className="mt-0.5 text-[11px] text-slate-400">Presentes: {e.presentes}</p>}
                  <AnexosEvento anexos={e.anexos} />
                </div>
                <button type="button" onClick={() => excluir(e.id)} className="shrink-0 text-slate-300 hover:text-red-600" aria-label="Remover andamento">
                  <LuTrash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-1 text-xs text-slate-400">Nenhum andamento registrado ainda.</p>
      )}

      {terminal ? (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
          Encerrada como <span className="font-medium">"{captacao.status}"</span>.
        </p>
      ) : (
        <>
          <div className="mt-4 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Adicionar andamento</p>
            <p className="mt-0.5 text-[11px] text-slate-400">Toda captação fica "Em articulação" enquanto só houver andamentos — marque um desfecho abaixo quando souber o resultado.</p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <p className={labelClass}>Data</p>
                <input type="date" className={inputClass} value={novo.data} onChange={(e) => setNovo((p) => ({ ...p, data: e.target.value }))} />
              </div>
              <div>
                <p className={labelClass}>Quem esteve presente</p>
                <input className={inputClass} value={novo.presentes} onChange={(e) => setNovo((p) => ({ ...p, presentes: e.target.value }))} placeholder="Nomes de quem participou" />
              </div>
              <div className="sm:col-span-2">
                <p className={labelClass}>Descrição *</p>
                <textarea rows={2} className={inputClass} value={novo.descricao} onChange={(e) => setNovo((p) => ({ ...p, descricao: e.target.value }))} placeholder="Ex: reunião marcada, visita ao gabinete, foram ao Congresso..." />
              </div>
              <div className="sm:col-span-2">
                <p className={labelClass}>Foto ou documento</p>
                <div className="mt-1">
                  <FileField anexos={anexos} onChange={setAnexos} />
                </div>
              </div>
            </div>
            <button type="button" disabled={salvando} onClick={registrar} className={`mt-3 flex items-center gap-1 ${btnGhost}`}>
              <LuPlus className="h-3.5 w-3.5" /> {salvando ? 'Registrando...' : 'Registrar andamento'}
            </button>
            {erro && <p className="mt-1 flex items-center gap-1 text-xs text-red-600"><LuTriangleAlert className="h-3 w-3" /> {erro}</p>}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={mudandoStatus} onClick={() => marcarDesfecho('Indicado')} className="flex items-center gap-1 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/30">
              <LuCheck className="h-3.5 w-3.5" /> Marcar como Indicado
            </button>
            <button type="button" disabled={mudandoStatus} onClick={() => marcarDesfecho('Arquivado')} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-red-300 hover:text-red-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400">
              <LuArchive className="h-3.5 w-3.5" /> Marcar como Arquivado
            </button>
          </div>
        </>
      )}
    </div>
  );
}
