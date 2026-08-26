import { useMemo, useState } from 'react';
import { LuTriangleAlert } from 'react-icons/lu';

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

// Cor do badge de status: verde pro desfecho de sucesso, cinza pro arquivado, âmbar pro que
// ainda está em andamento (Primeiro contato / Em articulação).
export function statusBadgeClass(status) {
  if (status === 'Indicado') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300';
  if (status === 'Arquivado') return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
  return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300';
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
  observacoes: '', // "Descrição" no formulário (nome do campo mantido por compatibilidade)
};

function parlamentarKeyDe(p) {
  return `${p.casa}:${p.id}`;
}

// Grade de campos compartilhada entre o formulário de novo cadastro (Cadastro.jsx) e a edição
// inline de um já existente (aqui mesmo, e também no perfil do parlamentar) — só o que envolve
// anexos/envio fica de fora daqui (cada chamador cuida disso).
export function CamposCaptacao({ valores, onChange, quarteis, militares, parlamentares, stakeholders }) {
  const nomesParlamentares = useMemo(() => parlamentares.map((p) => p.nome).sort(), [parlamentares]);
  // Responsável pode ser qualquer militar da plataforma — não só do quartel selecionado, já que
  // quem conduz a articulação nem sempre é lotado no mesmo quartel do cadastro.
  const todosMilitares = useMemo(() => militares.slice().sort((a, b) => nomeMilitar(a).localeCompare(nomeMilitar(b))), [militares]);
  const [responsavelManual, setResponsavelManual] = useState(() => !todosMilitares.some((m) => nomeMilitar(m) === valores.responsavel));

  const parlamentarSelecionado = useMemo(() => parlamentares.find((p) => p.nome === valores.parlamentarNome), [parlamentares, valores.parlamentarNome]);
  const parlamentarKey = parlamentarSelecionado ? parlamentarKeyDe(parlamentarSelecionado) : null;
  const stakeholdersDoParlamentar = useMemo(
    () => (parlamentarKey ? stakeholders.filter((s) => s.parlamentares_keys?.includes(parlamentarKey)) : []),
    [stakeholders, parlamentarKey]
  );
  const [stakeholderManual, setStakeholderManual] = useState(() => !stakeholdersDoParlamentar.some((s) => s.nome === valores.stakeholder));

  function selecionarQuartel(e) {
    onChange('quartelId', e.target.value);
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

  function selecionarParlamentar(e) {
    const nome = e.target.value;
    const p = parlamentares.find((x) => x.nome === nome);
    const key = p ? parlamentarKeyDe(p) : null;
    const doParlamentar = key ? stakeholders.filter((s) => s.parlamentares_keys?.includes(key)) : [];
    if (doParlamentar.length === 1) {
      setStakeholderManual(false);
      onChange('parlamentarNome', nome);
      onChange('stakeholder', doParlamentar[0].nome);
    } else {
      setStakeholderManual(doParlamentar.length === 0);
      onChange('parlamentarNome', nome);
      onChange('stakeholder', '');
    }
  }

  function selecionarStakeholder(e) {
    const valor = e.target.value;
    if (valor === '__outro__') {
      setStakeholderManual(true);
      onChange('stakeholder', '');
    } else {
      onChange('stakeholder', valor);
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
        <select className={inputClass} value={valores.parlamentarNome} onChange={selecionarParlamentar}>
          <option value="">Selecione...</option>
          {nomesParlamentares.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
      <div>
        <p className={labelClass}>Responsável pela articulação *</p>
        {todosMilitares.length > 0 && !responsavelManual ? (
          <select className={inputClass} value={valores.responsavel} onChange={selecionarResponsavel}>
            <option value="">Selecione...</option>
            {todosMilitares.map((m) => (
              <option key={m.id} value={nomeMilitar(m)}>{nomeMilitar(m)}</option>
            ))}
            <option value="__outro__">Outro (digitar nome)</option>
          </select>
        ) : (
          <div className="flex gap-2">
            <input className={inputClass} value={valores.responsavel} onChange={(e) => onChange('responsavel', e.target.value)} placeholder="Quem está conduzindo a articulação" />
            {todosMilitares.length > 0 && (
              <button type="button" onClick={() => setResponsavelManual(false)} className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:text-slate-400">
                Escolher da lista
              </button>
            )}
          </div>
        )}
      </div>
      <div>
        <p className={labelClass}>Stakeholder / contato-chave *</p>
        {stakeholdersDoParlamentar.length > 0 && !stakeholderManual ? (
          <select className={inputClass} value={valores.stakeholder} onChange={selecionarStakeholder}>
            <option value="">Selecione...</option>
            {stakeholdersDoParlamentar.map((s) => (
              <option key={s.id} value={s.nome}>{s.nome}{s.cargo ? ` — ${s.cargo}` : ''}</option>
            ))}
            <option value="__outro__">Outro (digitar nome)</option>
          </select>
        ) : (
          <div className="flex gap-2">
            <input className={inputClass} value={valores.stakeholder} onChange={(e) => onChange('stakeholder', e.target.value)} placeholder="Ex: assessor, chefe de gabinete..." />
            {stakeholdersDoParlamentar.length > 0 && (
              <button type="button" onClick={() => setStakeholderManual(false)} className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:text-slate-400">
                Escolher da lista
              </button>
            )}
          </div>
        )}
        {!parlamentarKey && <p className="mt-1 text-[11px] text-slate-400">Selecione o parlamentar pra ver os stakeholders vinculados a ele.</p>}
      </div>
      <div className="sm:col-span-2">
        <p className={labelClass}>Objeto da captação *</p>
        <input className={inputClass} value={valores.objeto} onChange={(e) => onChange('objeto', e.target.value)} placeholder="Ex: viatura, equipamentos, reforma do quartel..." />
      </div>
      <div>
        <p className={labelClass}>Valor previsto (R$)</p>
        <input type="number" min="0" step="0.01" className={inputClass} value={valores.valorPrevisto} onChange={(e) => onChange('valorPrevisto', e.target.value)} placeholder="0" />
      </div>
      <div className="sm:col-span-2">
        <p className={labelClass}>Descrição *</p>
        <textarea rows={3} className={inputClass} value={valores.observacoes} onChange={(e) => onChange('observacoes', e.target.value)} placeholder="Descreva a captação: contexto, o que já foi conversado, etc." />
      </div>
    </>
  );
}

export function validarCaptacao(f) {
  if (!f.quartelId) return 'Selecione o quartel.';
  if (!f.responsavel.trim()) return 'Informe o responsável pela articulação.';
  if (!f.parlamentarNome) return 'Selecione o parlamentar.';
  if (!f.stakeholder.trim()) return 'Informe o stakeholder / contato-chave.';
  if (!f.objeto.trim()) return 'Descreva o objeto da captação.';
  if (!f.observacoes.trim()) return 'Preencha a descrição.';
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
    observacoes: f.observacoes.trim(),
  };
}

// Formulário de edição de uma captação já existente — aparece no lugar do card quando a
// pessoa clica em "Editar" (tanto no Cadastro quanto no perfil do parlamentar). Não mexe em
// anexos (só o cadastro inicial anexa arquivo).
export function EdicaoCaptacao({ captacao, quarteis, militares, parlamentares, stakeholders, onSalvar, onCancelar }) {
  const [f, setF] = useState({
    quartelId: captacao.quartelId,
    responsavel: captacao.responsavel,
    stakeholder: captacao.stakeholder || '',
    parlamentarNome: captacao.parlamentarNome,
    objeto: captacao.objeto,
    valorPrevisto: captacao.valorPrevisto || '',
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
      <CamposCaptacao valores={f} onChange={(k, v) => setF((prev) => ({ ...prev, [k]: v }))} quarteis={quarteis} militares={militares} parlamentares={parlamentares} stakeholders={stakeholders} />
      {erro && <p className="sm:col-span-2 flex items-center gap-1.5 text-xs text-red-600"><LuTriangleAlert className="h-3.5 w-3.5" /> {erro}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button type="button" className={btnPrimary} disabled={salvando} onClick={salvar}>{salvando ? 'Salvando...' : 'Salvar alterações'}</button>
        <button type="button" className={btnGhost} onClick={onCancelar}>Cancelar</button>
      </div>
    </div>
  );
}
