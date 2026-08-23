import { useState } from 'react';
import { LuTriangleAlert } from 'react-icons/lu';
import { inputClass, labelClass, btnPrimary, btnGhost } from './CaptacaoForm.jsx';

export function parlamentarKeyDe(p) {
  return `${p.casa}:${p.id}`;
}

export const STAKEHOLDER_VAZIO = {
  nome: '',
  cargo: '',
  telefone: '',
  projeto: '',
  observacoes: '',
  parlamentaresKeys: [],
};

export function validarStakeholder(f) {
  if (!f.nome.trim()) return 'Informe o nome.';
  if (!f.parlamentaresKeys.length) return 'Selecione ao menos um parlamentar vinculado.';
  return null;
}

export function paraPayloadStakeholder(f) {
  return {
    nome: f.nome.trim(),
    cargo: f.cargo.trim(),
    telefone: f.telefone.trim(),
    projeto: f.projeto.trim(),
    observacoes: f.observacoes.trim(),
    parlamentares_keys: f.parlamentaresKeys,
  };
}

// Lista de checkboxes pra vincular o stakeholder a um ou mais parlamentares — a mesma pessoa
// (ex: um prefeito) pode estar articulando com vários ao mesmo tempo.
function SeletorParlamentares({ selecionados, onChange, parlamentares }) {
  function alternar(key) {
    onChange(selecionados.includes(key) ? selecionados.filter((k) => k !== key) : [...selecionados, key]);
  }
  return (
    <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-800">
      {parlamentares.map((p) => {
        const key = parlamentarKeyDe(p);
        const marcado = selecionados.includes(key);
        return (
          <label key={key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60">
            <input type="checkbox" checked={marcado} onChange={() => alternar(key)} className="h-3.5 w-3.5 accent-red-600" />
            {p.nome} <span className="text-xs text-slate-400">· {p.casa === 'senado' ? 'Senado' : 'Câmara'}</span>
          </label>
        );
      })}
    </div>
  );
}

export function CamposStakeholder({ valores, onChange, parlamentares }) {
  return (
    <>
      <div>
        <p className={labelClass}>Nome *</p>
        <input className={inputClass} value={valores.nome} onChange={(e) => onChange('nome', e.target.value)} placeholder="Nome do stakeholder" />
      </div>
      <div>
        <p className={labelClass}>Cargo / função</p>
        <input className={inputClass} value={valores.cargo} onChange={(e) => onChange('cargo', e.target.value)} placeholder="Ex: prefeito, assessor, chefe de gabinete..." />
      </div>
      <div>
        <p className={labelClass}>Telefone</p>
        <input className={inputClass} value={valores.telefone} onChange={(e) => onChange('telefone', e.target.value)} />
      </div>
      <div>
        <p className={labelClass}>Qual projeto / atuação</p>
        <input className={inputClass} value={valores.projeto} onChange={(e) => onChange('projeto', e.target.value)} placeholder="Ex: reforma do quartel, viatura nova..." />
      </div>
      <div className="sm:col-span-2">
        <p className={labelClass}>Parlamentar(es) vinculado(s) * <span className="font-normal normal-case text-slate-400">— pode marcar mais de um</span></p>
        <SeletorParlamentares selecionados={valores.parlamentaresKeys} onChange={(v) => onChange('parlamentaresKeys', v)} parlamentares={parlamentares} />
      </div>
      <div className="sm:col-span-2">
        <p className={labelClass}>Observações</p>
        <textarea rows={2} className={inputClass} value={valores.observacoes} onChange={(e) => onChange('observacoes', e.target.value)} />
      </div>
    </>
  );
}

// Formulário de cadastro/edição de stakeholder — mesma grade usada tanto pra criar (aba
// Cadastro) quanto pra editar (aba Cadastro ou perfil do parlamentar).
export function FormularioStakeholder({ inicial, parlamentares, onSalvar, onCancelar, textoBotao = 'Salvar' }) {
  const [f, setF] = useState(inicial || STAKEHOLDER_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  async function salvar() {
    setErro(null);
    const problema = validarStakeholder(f);
    if (problema) { setErro(problema); return; }
    setSalvando(true);
    try {
      await onSalvar(paraPayloadStakeholder(f));
    } catch (err) {
      setErro(err.message || 'Falha ao salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <CamposStakeholder valores={f} onChange={(k, v) => setF((prev) => ({ ...prev, [k]: v }))} parlamentares={parlamentares} />
      {erro && <p className="sm:col-span-2 flex items-center gap-1.5 text-xs text-red-600"><LuTriangleAlert className="h-3.5 w-3.5" /> {erro}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button type="button" className={btnPrimary} disabled={salvando} onClick={salvar}>{salvando ? 'Salvando...' : textoBotao}</button>
        <button type="button" className={btnGhost} onClick={onCancelar}>Cancelar</button>
      </div>
    </div>
  );
}
