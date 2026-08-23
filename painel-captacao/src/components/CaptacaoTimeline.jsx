import { useMemo, useState } from 'react';
import { LuClock, LuPlus, LuTrash2, LuTriangleAlert } from 'react-icons/lu';
import { STATUS_TERMINAL } from '../lib/data.js';
import { inputClass, labelClass, btnGhost } from './CaptacaoForm.jsx';

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

// Badge de alerta quando uma captação em andamento fica muito tempo sem nenhum passo novo
// registrado na linha do tempo — só faz sentido pra quem ainda não chegou num desfecho
// (Destinado/Adiado/Recusado/Arquivado não "esfriam").
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

// Linha do tempo de uma captação: histórico de passos (data + o que aconteceu) + formulário
// pra registrar um novo. Quem entra numa captação em andamento vê exatamente quando foi cada
// contato/reunião, e o alerta acima avisa quando está esfriando.
export function LinhaDoTempo({ captacaoId, eventos, addEvento, removeEvento }) {
  const doCaptacao = useMemo(
    () => eventos.filter((e) => e.captacao_id === captacaoId).slice().sort((a, b) => a.data.localeCompare(b.data)),
    [eventos, captacaoId]
  );
  const [nova, setNova] = useState({ data: hoje(), descricao: '' });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  async function registrar() {
    setErro(null);
    if (!nova.descricao.trim()) { setErro('Descreva o que aconteceu.'); return; }
    setSalvando(true);
    try {
      await addEvento({ captacao_id: captacaoId, data: nova.data, descricao: nova.descricao.trim() });
      setNova({ data: hoje(), descricao: '' });
    } catch (err) {
      setErro(err.message || 'Falha ao registrar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id) {
    if (!confirm('Remover este passo da linha do tempo?')) return;
    try {
      await removeEvento(id);
    } catch (err) {
      alert(err.message || 'Falha ao excluir. Tente novamente.');
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
                </div>
                <button type="button" onClick={() => excluir(e.id)} className="shrink-0 text-slate-300 hover:text-red-600" aria-label="Remover passo">
                  <LuTrash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-1 text-xs text-slate-400">Nenhum passo registrado ainda.</p>
      )}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div>
          <p className={labelClass}>Data</p>
          <input type="date" className={inputClass} value={nova.data} onChange={(e) => setNova((p) => ({ ...p, data: e.target.value }))} />
        </div>
        <div className="min-w-[180px] flex-1">
          <p className={labelClass}>O que aconteceu</p>
          <input className={inputClass} value={nova.descricao} onChange={(e) => setNova((p) => ({ ...p, descricao: e.target.value }))} placeholder="Ex: primeiro contato, reunião marcada, foram ao Congresso..." />
        </div>
        <button type="button" disabled={salvando} onClick={registrar} className={`flex shrink-0 items-center gap-1 ${btnGhost}`}>
          <LuPlus className="h-3.5 w-3.5" /> Registrar
        </button>
      </div>
      {erro && <p className="mt-1 flex items-center gap-1 text-xs text-red-600"><LuTriangleAlert className="h-3 w-3" /> {erro}</p>}
    </div>
  );
}
