import { useMemo, useState } from 'react';
import { LuTriangleAlert } from 'react-icons/lu';
import { STATUS_CAPTACAO } from '../lib/data.js';

export const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-red-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200';
export const labelClass = 'text-[11px] font-medium uppercase tracking-wide text-slate-400';
export const btnPrimary = 'rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50';
export const btnGhost =
  'rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:text-slate-300';
export const btnDanger =
  'rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30';

export function fmtR(v) {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function nomeMilitar(m) {
  return `${m.posto} ${m.nome}`.trim();
}

export const VAZIO_CAPTACAO = {
  quartelId: '',
  responsavel: '',
  stakeholder: '',
  parlamentarNome: '',
  objeto: '',
  valorPrevisto: '',
  valorConfirmado: '',
  numReunioes: 0,
  status: STATUS_CAPTACAO[0],
  dataAgenda: '',
  observacoes: '',
};

// Grade de campos compartilhada entre o formulário de novo cadastro (Cadastro.jsx) e a edição
// inline de um já existente (aqui mesmo, e também no perfil do parlamentar) — só o que envolve
// anexos/envio fica de fora daqui (cada chamador cuida disso).
export function CamposCaptacao({ valores, onChange, quarteis, militares, nomesParlamentares }) {
  const militaresDoQuartel = useMemo(() => militares.filter((m) => m.quartel_id === valores.quartelId), [militares, valores.quartelId]);
  const [responsavelManual, setResponsavelManual] = useState(() => !militaresDoQuartel.some((m) => nomeMilitar(m) === valores.responsavel));

  function selecionarQuartel(e) {
    const quartelId = e.target.value;
    const doQuartel = militares.filter((m) => m.quartel_id === quartelId);
    if (doQuartel.length === 1) {
      setResponsavelManual(false);
      onChange('quartelId', quartelId);
      onChange('responsavel', nomeMilitar(doQuartel[0]));
    } else {
      setResponsavelManual(doQuartel.length === 0);
      onChange('quartelId', quartelId);
      onChange('responsavel', '');
    }
  }

  function selecionarResponsavel(e) {
    const valor = e.target.value;
    if (valor === '__outro__') {
      setResponsavelManual(true);
      onChange('responsavel', '');
    } else {
      onChange('responsavel', valor);
    }
  }

  return (
    <>
      <div>
        <p className={labelClass}>Quartel *</p>
        <select className={inputClass} value={valores.quartelId} onChange={selecionarQuartel}>
          <option value="">Selecione...</option>
          {quarteis.map((q) => (
            <option key={q.id} value={q.id}>{q.nome} — {q.municipio}</option>
          ))}
        </select>
      </div>
      <div>
        <p className={labelClass}>Parlamentar *</p>
        <select className={inputClass} value={valores.parlamentarNome} onChange={(e) => onChange('parlamentarNome', e.target.value)}>
          <option value="">Selecione...</option>
          {nomesParlamentares.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
      <div>
        <p className={labelClass}>Responsável pela articulação *</p>
        {militaresDoQuartel.length > 0 && !responsavelManual ? (
          <select className={inputClass} value={valores.responsavel} onChange={selecionarResponsavel}>
            <option value="">Selecione...</option>
            {militaresDoQuartel.map((m) => (
              <option key={m.id} value={nomeMilitar(m)}>{nomeMilitar(m)}</option>
            ))}
            <option value="__outro__">Outro (digitar nome)</option>
          </select>
        ) : (
          <div className="flex gap-2">
            <input className={inputClass} value={valores.responsavel} onChange={(e) => onChange('responsavel', e.target.value)} placeholder="Quem do quartel está conduzindo" />
            {militaresDoQuartel.length > 0 && (
              <button type="button" onClick={() => setResponsavelManual(false)} className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:text-slate-400">
                Escolher da lista
              </button>
            )}
          </div>
        )}
      </div>
      <div>
        <p className={labelClass}>Stakeholder / contato-chave</p>
        <input className={inputClass} value={valores.stakeholder} onChange={(e) => onChange('stakeholder', e.target.value)} placeholder="Ex: assessor, chefe de gabinete..." />
      </div>
      <div className="sm:col-span-2">
        <p className={labelClass}>Objeto da captação *</p>
        <input className={inputClass} value={valores.objeto} onChange={(e) => onChange('objeto', e.target.value)} placeholder="Ex: viatura, equipamentos, reforma do quartel..." />
      </div>
      <div>
        <p className={labelClass}>Valor previsto (R$)</p>
        <input type="number" min="0" step="0.01" className={inputClass} value={valores.valorPrevisto} onChange={(e) => onChange('valorPrevisto', e.target.value)} placeholder="0" />
      </div>
      <div>
        <p className={labelClass}>Valor confirmado (R$)</p>
        <input type="number" min="0" step="0.01" className={inputClass} value={valores.valorConfirmado} onChange={(e) => onChange('valorConfirmado', e.target.value)} placeholder="0" />
      </div>
      <div>
        <p className={labelClass}>Quantas reuniões já teve</p>
        <input type="number" min="0" className={inputClass} value={valores.numReunioes} onChange={(e) => onChange('numReunioes', e.target.value)} />
      </div>
      <div>
        <p className={labelClass}>Estágio *</p>
        <select className={inputClass} value={valores.status} onChange={(e) => onChange('status', e.target.value)}>
          {STATUS_CAPTACAO.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      {valores.status === 'Agenda marcada' && (
        <div>
          <p className={labelClass}>Data da agenda</p>
          <input type="date" className={inputClass} value={valores.dataAgenda} onChange={(e) => onChange('dataAgenda', e.target.value)} />
        </div>
      )}
      <div className="sm:col-span-2">
        <p className={labelClass}>Observações</p>
        <textarea rows={3} className={inputClass} value={valores.observacoes} onChange={(e) => onChange('observacoes', e.target.value)} />
      </div>
    </>
  );
}

export function validarCaptacao(f) {
  if (!f.quartelId) return 'Selecione o quartel.';
  if (!f.responsavel.trim()) return 'Informe o responsável pela articulação.';
  if (!f.parlamentarNome) return 'Selecione o parlamentar.';
  if (!f.objeto.trim()) return 'Descreva o objeto da captação.';
  return null;
}

export function paraPayloadCaptacao(f, quarteis) {
  const quartel = quarteis.find((q) => q.id === f.quartelId);
  return {
    quartelId: f.quartelId,
    quartelNome: quartel?.nome || f.quartelId,
    municipio: quartel?.municipio || '',
    responsavel: f.responsavel.trim(),
    stakeholder: f.stakeholder.trim(),
    parlamentarNome: f.parlamentarNome,
    objeto: f.objeto.trim(),
    valorPrevisto: f.valorPrevisto ? parseFloat(f.valorPrevisto) : 0,
    valorConfirmado: f.valorConfirmado ? parseFloat(f.valorConfirmado) : 0,
    numReunioes: parseInt(f.numReunioes, 10) || 0,
    status: f.status,
    dataAgenda: f.status === 'Agenda marcada' ? f.dataAgenda : '',
    observacoes: f.observacoes.trim(),
  };
}

// Formulário de edição de uma captação já existente — aparece no lugar do card quando a
// pessoa clica em "Editar" (tanto no Cadastro quanto no perfil do parlamentar). Não mexe em
// anexos (só o cadastro inicial anexa arquivo).
export function EdicaoCaptacao({ captacao, quarteis, militares, nomesParlamentares, onSalvar, onCancelar }) {
  const [f, setF] = useState({
    quartelId: captacao.quartelId,
    responsavel: captacao.responsavel,
    stakeholder: captacao.stakeholder || '',
    parlamentarNome: captacao.parlamentarNome,
    objeto: captacao.objeto,
    valorPrevisto: captacao.valorPrevisto || '',
    valorConfirmado: captacao.valorConfirmado || '',
    numReunioes: captacao.numReunioes || 0,
    status: captacao.status,
    dataAgenda: captacao.dataAgenda || '',
    observacoes: captacao.observacoes || '',
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  async function salvar() {
    setErro(null);
    const problema = validarCaptacao(f);
    if (problema) { setErro(problema); return; }
    setSalvando(true);
    try {
      await onSalvar(paraPayloadCaptacao(f, quarteis));
    } catch (err) {
      setErro(err.message || 'Falha ao salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <CamposCaptacao valores={f} onChange={(k, v) => setF((prev) => ({ ...prev, [k]: v }))} quarteis={quarteis} militares={militares} nomesParlamentares={nomesParlamentares} />
      {erro && <p className="sm:col-span-2 flex items-center gap-1.5 text-xs text-red-600"><LuTriangleAlert className="h-3.5 w-3.5" /> {erro}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button type="button" className={btnPrimary} disabled={salvando} onClick={salvar}>{salvando ? 'Salvando...' : 'Salvar alterações'}</button>
        <button type="button" className={btnGhost} onClick={onCancelar}>Cancelar</button>
      </div>
    </div>
  );
}
