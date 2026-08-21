import { useEffect, useMemo, useState } from 'react';
import { useAdmin } from '../lib/admin.jsx';
import { useStore, STATUS_DESTINACAO, STATUS_PROJETO, TIPOS_PROJETO } from '../lib/store.jsx';
import { useParlamentares } from '../lib/data.js';
import ScrollReveal from '../components/ScrollReveal.jsx';
import EtapasTracker from '../components/EtapasTracker.jsx';
import EstagioStepper from '../components/EstagioStepper.jsx';

function fmtR(v) {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200';
export const labelClass = 'text-[11px] font-medium uppercase tracking-wide text-slate-400';
export const btnPrimary = 'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700';
export const btnGhost =
  'rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300';
export const btnDanger = 'rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30';

export const emptyDest = { parlamentarNome: '', ano: new Date().getFullYear(), municipio: '', objeto: '', valorPrevisto: 0, valorConfirmado: 0, status: 'Em articulação', acordoVerbal: false, sei: '', responsavel: '', proximoPasso: '', riscos: '', observacoes: '' };
export const emptyProj = { autor: '', relator: '', tipo: 'PL', numero: '', ementa: '', status: 'Protocolado', posicao: 'em análise', prioridade: 'média', responsavel: '', proximoPasso: '', observacoes: '' };

export function DestForm({ initial, nomes, onSave, onCancel }) {
  const [f, setF] = useState(initial);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 sm:grid-cols-2 dark:border-indigo-900/40 dark:bg-indigo-500/5">
      <div>
        <p className={labelClass}>Parlamentar</p>
        <input list="nomes-parl" className={inputClass} value={f.parlamentarNome} onChange={set('parlamentarNome')} placeholder="Nome do parlamentar" />
        <datalist id="nomes-parl">{nomes.map((n) => <option key={n} value={n} />)}</datalist>
      </div>
      <div>
        <p className={labelClass}>Ano</p>
        <input type="number" className={inputClass} value={f.ano} onChange={(e) => setF({ ...f, ano: parseInt(e.target.value) || f.ano })} />
      </div>
      <div>
        <p className={labelClass}>Município / Unidade</p>
        <input className={inputClass} value={f.municipio} onChange={set('municipio')} placeholder="Ex: Goiânia — 8º BBM" />
      </div>
      <div>
        <p className={labelClass}>Objeto</p>
        <input className={inputClass} value={f.objeto} onChange={set('objeto')} placeholder="Ex: Viatura, Equipamentos, UR..." />
      </div>
      <div>
        <p className={labelClass}>Valor previsto (R$)</p>
        <input type="number" className={inputClass} value={f.valorPrevisto} onChange={(e) => setF({ ...f, valorPrevisto: parseFloat(e.target.value) || 0 })} />
      </div>
      <div>
        <p className={labelClass}>Valor confirmado (R$)</p>
        <input type="number" className={inputClass} value={f.valorConfirmado} onChange={(e) => setF({ ...f, valorConfirmado: parseFloat(e.target.value) || 0 })} />
      </div>
      <div>
        <p className={labelClass}>Status</p>
        <select className={inputClass} value={f.status} onChange={set('status')}>
          {STATUS_DESTINACAO.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <p className={labelClass}>Número SEI</p>
        <input className={inputClass} value={f.sei || ''} onChange={set('sei')} placeholder="Ex: 202400011010758" />
      </div>
      <div>
        <p className={labelClass}>Responsável</p>
        <input className={inputClass} value={f.responsavel} onChange={set('responsavel')} />
      </div>
      <div className="flex items-center gap-2 sm:col-span-2">
        <input
          id="acordoVerbal"
          type="checkbox"
          checked={!!f.acordoVerbal}
          onChange={(e) => setF({ ...f, acordoVerbal: e.target.checked })}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
        />
        <label htmlFor="acordoVerbal" className="text-xs text-slate-600 dark:text-slate-300">
          Acordo verbal (promessa ainda não formalizada — não entra em totais/médias/ranking)
        </label>
      </div>
      <div className="sm:col-span-2">
        <p className={labelClass}>Próximo passo</p>
        <input className={inputClass} value={f.proximoPasso} onChange={set('proximoPasso')} />
      </div>
      <div className="sm:col-span-2">
        <p className={labelClass}>Observações</p>
        <textarea rows={2} className={inputClass} value={f.observacoes} onChange={set('observacoes')} />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <button className={btnPrimary} onClick={() => onSave(f)}>Salvar</button>
        <button className={btnGhost} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

export function ProjForm({ initial, nomes, onSave, onCancel }) {
  const [f, setF] = useState(initial);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 sm:grid-cols-2 dark:border-indigo-900/40 dark:bg-indigo-500/5">
      <div>
        <p className={labelClass}>Autor</p>
        <input list="nomes-parl2" className={inputClass} value={f.autor || ''} onChange={set('autor')} placeholder="Quem apresentou o projeto" />
        <datalist id="nomes-parl2">{nomes.map((n) => <option key={n} value={n} />)}</datalist>
      </div>
      <div>
        <p className={labelClass}>Relator</p>
        <input list="nomes-parl2" className={inputClass} value={f.relator || ''} onChange={set('relator')} placeholder="Deixe em branco se aguardando designação" />
      </div>
      <div className="flex gap-2">
        <div className="w-24">
          <p className={labelClass}>Tipo</p>
          <select className={inputClass} value={f.tipo} onChange={set('tipo')}>
            {TIPOS_PROJETO.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <p className={labelClass}>Número</p>
          <input className={inputClass} value={f.numero} onChange={set('numero')} placeholder="Ex: 1234/2024" />
        </div>
      </div>
      <div className="sm:col-span-2">
        <p className={labelClass}>Ementa</p>
        <textarea rows={2} className={inputClass} value={f.ementa} onChange={set('ementa')} />
      </div>
      <div>
        <p className={labelClass}>Status</p>
        <select className={inputClass} value={f.status} onChange={set('status')}>
          {STATUS_PROJETO.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <p className={labelClass}>Posição do CBM-GO</p>
        <select className={inputClass} value={f.posicao} onChange={set('posicao')}>
          <option value="favorável">favorável</option>
          <option value="contrário">contrário</option>
          <option value="neutro">neutro</option>
          <option value="em análise">em análise</option>
        </select>
      </div>
      <div>
        <p className={labelClass}>Prioridade</p>
        <select className={inputClass} value={f.prioridade} onChange={set('prioridade')}>
          <option value="alta">alta</option>
          <option value="média">média</option>
          <option value="baixa">baixa</option>
        </select>
      </div>
      <div>
        <p className={labelClass}>Responsável</p>
        <input className={inputClass} value={f.responsavel} onChange={set('responsavel')} />
      </div>
      <div className="sm:col-span-2">
        <p className={labelClass}>Próximo passo</p>
        <input className={inputClass} value={f.proximoPasso} onChange={set('proximoPasso')} />
      </div>
      <div className="sm:col-span-2">
        <p className={labelClass}>Observações</p>
        <textarea rows={2} className={inputClass} value={f.observacoes} onChange={set('observacoes')} />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <button className={btnPrimary} onClick={() => onSave(f)}>Salvar</button>
        <button className={btnGhost} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

function Section({ title, action, children }) {
  return (
    <ScrollReveal className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
        {action}
      </div>
      {children}
    </ScrollReveal>
  );
}

export default function Gerenciamento() {
  const { admin, setAdmin } = useAdmin();
  const store = useStore();
  const { parlamentares } = useParlamentares();
  const [aba, setAba] = useState('destinacoes');
  const [editingDest, setEditingDest] = useState(undefined); // undefined=fechado, null=novo, id=editando
  const [editingProj, setEditingProj] = useState(undefined);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    setAdmin(true);
  }, [setAdmin]);

  const nomes = useMemo(() => parlamentares.map((p) => p.nome).sort(), [parlamentares]);

  const destinacoesFiltradas = useMemo(
    () => store.destinacoes.filter((d) => !busca || d.parlamentarNome?.toLowerCase().includes(busca.toLowerCase()) || d.municipio?.toLowerCase().includes(busca.toLowerCase())),
    [store.destinacoes, busca]
  );
  const projetosFiltrados = useMemo(
    () =>
      store.projetos.filter(
        (p) =>
          !busca ||
          p.autor?.toLowerCase().includes(busca.toLowerCase()) ||
          p.relator?.toLowerCase().includes(busca.toLowerCase()) ||
          p.numero?.toLowerCase().includes(busca.toLowerCase()) ||
          p.ementa?.toLowerCase().includes(busca.toLowerCase())
      ),
    [store.projetos, busca]
  );

  if (store.loading) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-24 sm:px-6 lg:px-10 lg:pb-8">
      <ScrollReveal className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Gerenciamento</h1>
          <p className="mt-1 text-sm text-slate-400">
            Destinações e projetos de lei ligados a cada parlamentar. Alterações ficam salvas neste navegador.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Modo edição ativo
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.05} className="mt-5 flex flex-wrap items-center gap-2">
        <button onClick={() => setAba('destinacoes')} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${aba === 'destinacoes' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
          Destinações ({store.destinacoes.length})
        </button>
        <button onClick={() => setAba('projetos')} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${aba === 'projetos' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
          Projetos de Lei ({store.projetos.length})
        </button>
        <input
          className={`${inputClass} ml-auto max-w-xs`}
          placeholder="Buscar por parlamentar..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </ScrollReveal>

      {aba === 'destinacoes' && (
        <Section
          title="Destinações"
          action={
            <button className={btnGhost} onClick={() => setEditingDest(null)}>+ Nova destinação</button>
          }
        >
          {editingDest === null && (
            <DestForm
              initial={emptyDest}
              nomes={nomes}
              onCancel={() => setEditingDest(undefined)}
              onSave={(f) => { store.addDestinacao(f); setEditingDest(undefined); }}
            />
          )}
          <div className="mt-3 flex flex-col gap-2">
            {destinacoesFiltradas.map((d) => (
              <div key={d.id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                {editingDest === d.id ? (
                  <DestForm
                    initial={d}
                    nomes={nomes}
                    onCancel={() => setEditingDest(undefined)}
                    onSave={(f) => { store.updateDestinacao(d.id, f); setEditingDest(undefined); }}
                  />
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{d.parlamentarNome || '—'} <span className="text-slate-400">· {d.municipio} · {d.ano}</span></p>
                      <p className="mt-0.5 text-xs text-slate-500">{d.objeto} · {fmtR(d.valorPrevisto)} previsto{d.valorConfirmado ? ` · ${fmtR(d.valorConfirmado)} confirmado` : ''}</p>
                      <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{d.status}</span>
                      <EtapasTracker etapas={d.etapas} editable onToggle={(key) => store.toggleDestinacaoEtapa(d.id, key)} />
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button className={btnGhost} onClick={() => setEditingDest(d.id)}>Editar</button>
                      <button className={btnDanger} onClick={() => { if (confirm('Remover esta destinação?')) store.removeDestinacao(d.id); }}>Remover</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {destinacoesFiltradas.length === 0 && <p className="py-4 text-center text-sm text-slate-400">Nenhuma destinação encontrada.</p>}
          </div>
        </Section>
      )}

      {aba === 'projetos' && (
        <Section
          title="Projetos de lei de interesse do CBM-GO"
          action={<button className={btnGhost} onClick={() => setEditingProj(null)}>+ Novo projeto</button>}
        >
          {editingProj === null && (
            <ProjForm
              initial={emptyProj}
              nomes={nomes}
              onCancel={() => setEditingProj(undefined)}
              onSave={(f) => { store.addProjeto(f); setEditingProj(undefined); }}
            />
          )}
          <div className="mt-3 flex flex-col gap-2">
            {projetosFiltrados.map((p) => (
              <div key={p.id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                {editingProj === p.id ? (
                  <ProjForm
                    initial={p}
                    nomes={nomes}
                    onCancel={() => setEditingProj(undefined)}
                    onSave={(f) => { store.updateProjeto(p.id, f); setEditingProj(undefined); }}
                  />
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        {p.tipo} {p.numero}
                        {p.origemNacional && (
                          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">relatório ASPAR</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Autor: {p.autor || '—'} · Relator: {p.relator || 'aguardando designação'}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{p.ementa}</p>
                      <EstagioStepper estagio={p.status} stages={STATUS_PROJETO} editable onChange={(st) => store.updateProjeto(p.id, { status: st })} />
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button className={btnGhost} onClick={() => setEditingProj(p.id)}>Editar</button>
                      <button className={btnDanger} onClick={() => { if (confirm('Remover este projeto?')) store.removeProjeto(p.id); }}>Remover</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {projetosFiltrados.length === 0 && <p className="py-4 text-center text-sm text-slate-400">Nenhum projeto encontrado.</p>}
          </div>
        </Section>
      )}

      <ScrollReveal delay={0.1} className="mt-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">
        <span>{admin ? 'Você está no modo edição — os controles de adicionar/editar/remover ficam visíveis em todo o site.' : ''}</span>
        <button className={btnGhost} onClick={() => setAdmin(false)}>Sair do modo edição</button>
      </ScrollReveal>
    </div>
  );
}
