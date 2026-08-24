import { useMemo, useState } from 'react';
import { LuTriangleAlert, LuLogOut, LuCheck, LuX } from 'react-icons/lu';
import { useQuarteis, useMilitares, useUsuariosAprovados, slugify } from '../lib/data.js';
import { useAuth } from '../lib/auth.js';
import ScrollReveal from '../components/ScrollReveal.jsx';
import { LoginGerenciamento, AguardandoAprovacao } from '../components/AcessoGerenciamento.jsx';

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-red-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200';
const labelClass = 'text-[11px] font-medium uppercase tracking-wide text-slate-400';
const btnPrimary = 'rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50';
const btnGhost =
  'rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:text-slate-300';
const btnDanger = 'rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30';

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

const QUARTEL_VAZIO = { id: '', nome: '', municipio: '', tipo: '' };

function QuartelForm({ initial, editando, onSave, onCancel, erro }) {
  const [f, setF] = useState(initial);
  const set = (k) => (e) => {
    const nome = k === 'nome' && !editando ? e.target.value : f.nome;
    setF({ ...f, [k]: e.target.value, ...(k === 'nome' && !editando ? { id: slugify(nome) } : {}) });
  };
  return (
    <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-red-100 bg-red-50/40 p-4 sm:grid-cols-2 dark:border-red-900/40 dark:bg-red-500/5">
      <div>
        <p className={labelClass}>Nome *</p>
        <input className={inputClass} value={f.nome} onChange={set('nome')} placeholder="Ex: 26º BBM" />
      </div>
      <div>
        <p className={labelClass}>Município</p>
        <input className={inputClass} value={f.municipio} onChange={set('municipio')} placeholder="Cidade onde fica" />
      </div>
      <div>
        <p className={labelClass}>Tipo</p>
        <input className={inputClass} value={f.tipo} onChange={set('tipo')} placeholder="Ex: BBM, CIBM, CRBM..." />
      </div>
      <div>
        <p className={labelClass}>Id {editando && '(não editável)'}</p>
        <input className={inputClass} value={f.id} onChange={set('id')} disabled={editando} placeholder="gerado a partir do nome" />
      </div>
      {erro && <p className="sm:col-span-2 flex items-center gap-1.5 text-xs text-red-600"><LuTriangleAlert className="h-3.5 w-3.5" /> {erro}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button className={btnPrimary} onClick={() => onSave(f)}>Salvar</button>
        <button className={btnGhost} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

const MILITAR_VAZIO = { posto: '', rg: '', nome: '', quartel_id: '' };

function MilitarForm({ initial, quarteis, onSave, onCancel, erro }) {
  const [f, setF] = useState(initial);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-red-100 bg-red-50/40 p-4 sm:grid-cols-2 dark:border-red-900/40 dark:bg-red-500/5">
      <div>
        <p className={labelClass}>Posto/Graduação *</p>
        <input className={inputClass} value={f.posto} onChange={set('posto')} placeholder="Ex: TC QOC" />
      </div>
      <div>
        <p className={labelClass}>RG</p>
        <input className={inputClass} value={f.rg} onChange={set('rg')} placeholder="Ex: 02.294" />
      </div>
      <div>
        <p className={labelClass}>Nome *</p>
        <input className={inputClass} value={f.nome} onChange={set('nome')} placeholder="Nome (ou nome de guerra)" />
      </div>
      <div>
        <p className={labelClass}>Quartel *</p>
        <select className={inputClass} value={f.quartel_id} onChange={set('quartel_id')}>
          <option value="">Selecione...</option>
          {quarteis.map((q) => <option key={q.id} value={q.id}>{q.nome} — {q.municipio}</option>)}
        </select>
      </div>
      {erro && <p className="sm:col-span-2 flex items-center gap-1.5 text-xs text-red-600"><LuTriangleAlert className="h-3.5 w-3.5" /> {erro}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button className={btnPrimary} onClick={() => onSave(f)}>Salvar</button>
        <button className={btnGhost} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

export default function Gerenciamento() {
  const { loading: carregandoAuth, session, aprovado, entrarComSenha, criarContaComSenha, sair } = useAuth();
  const { quarteis, addQuartel, updateQuartel, removeQuartel } = useQuarteis();
  const { militares, addMilitar, updateMilitar, removeMilitar } = useMilitares();
  const { usuarios, definirAprovacao } = useUsuariosAprovados();

  const [aba, setAba] = useState('quarteis');
  const [busca, setBusca] = useState('');
  const [filtroQuartel, setFiltroQuartel] = useState('');

  const [editandoQuartel, setEditandoQuartel] = useState(undefined); // undefined=fechado, null=novo, id=editando
  const [editandoMilitar, setEditandoMilitar] = useState(undefined);
  const [erro, setErro] = useState(null);

  const quarteisFiltrados = useMemo(
    () => quarteis.filter((q) => !busca || q.nome.toLowerCase().includes(busca.toLowerCase()) || q.municipio.toLowerCase().includes(busca.toLowerCase())),
    [quarteis, busca]
  );
  const militaresFiltrados = useMemo(
    () => militares.filter((m) => !filtroQuartel || m.quartel_id === filtroQuartel).filter((m) => !busca || m.nome.toLowerCase().includes(busca.toLowerCase())),
    [militares, filtroQuartel, busca]
  );
  const nomeQuartel = (id) => quarteis.find((q) => q.id === id)?.nome || id;

  async function salvarQuartel(f) {
    setErro(null);
    try {
      if (editandoQuartel === null) {
        if (!f.id.trim() || !f.nome.trim()) { setErro('Preencha nome (o id é gerado sozinho).'); return; }
        await addQuartel({ id: f.id.trim(), nome: f.nome.trim(), municipio: f.municipio.trim(), tipo: f.tipo.trim() });
      } else {
        await updateQuartel(editandoQuartel, { nome: f.nome.trim(), municipio: f.municipio.trim(), tipo: f.tipo.trim() });
      }
      setEditandoQuartel(undefined);
    } catch (err) {
      setErro(err.message);
    }
  }

  async function removerQuartel(id) {
    if (!confirm(`Remover "${nomeQuartel(id)}"? Isso também remove os militares cadastrados nesse quartel. Captações já registradas com ele não são afetadas.`)) return;
    try {
      await removeQuartel(id);
    } catch (err) {
      alert(err.message);
    }
  }

  async function salvarMilitar(f) {
    setErro(null);
    if (!f.posto.trim() || !f.nome.trim() || !f.quartel_id) { setErro('Preencha posto, nome e quartel.'); return; }
    try {
      const payload = { posto: f.posto.trim(), rg: f.rg.trim(), nome: f.nome.trim(), quartel_id: f.quartel_id };
      if (editandoMilitar === null) await addMilitar(payload);
      else await updateMilitar(editandoMilitar, payload);
      setEditandoMilitar(undefined);
    } catch (err) {
      setErro(err.message);
    }
  }

  async function removerMilitar(id, nome) {
    if (!confirm(`Remover "${nome}"?`)) return;
    try {
      await removeMilitar(id);
    } catch (err) {
      alert(err.message);
    }
  }

  async function alternarAprovacao(usuario, aprovar) {
    if (aprovar === false && usuario.user_id === session?.user?.id) {
      alert('Você não pode revogar o próprio acesso por aqui — peça pra outra pessoa aprovada fazer isso.');
      return;
    }
    try {
      await definirAprovacao(usuario.user_id, aprovar);
    } catch (err) {
      alert(err.message);
    }
  }

  if (carregandoAuth) return null;
  if (!session) return <LoginGerenciamento entrarComSenha={entrarComSenha} criarContaComSenha={criarContaComSenha} />;
  if (!aprovado) return <AguardandoAprovacao email={session.user.email} sair={sair} />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-24 sm:px-6 lg:px-10 lg:pb-8">
      <ScrollReveal className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Gerenciamento</h1>
          <p className="mt-1 text-sm text-slate-400">Quartéis e militares — adicione, edite ou remova a qualquer momento.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {session.user.email}
          <button type="button" onClick={sair} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 font-medium text-slate-500 hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:text-slate-400">
            <LuLogOut className="h-3 w-3" /> Sair
          </button>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.05} className="mt-5 flex flex-wrap items-center gap-2">
        <button onClick={() => setAba('quarteis')} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${aba === 'quarteis' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
          Quartéis ({quarteis.length})
        </button>
        <button onClick={() => setAba('militares')} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${aba === 'militares' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
          Militares ({militares.length})
        </button>
        <button onClick={() => setAba('acessos')} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${aba === 'acessos' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
          Acessos ({usuarios.filter((u) => !u.aprovado).length ? `${usuarios.filter((u) => !u.aprovado).length} pendente(s)` : usuarios.length})
        </button>
        {aba !== 'acessos' && (
          <input className={`${inputClass} ml-auto max-w-xs`} placeholder="Buscar por nome..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        )}
      </ScrollReveal>

      {aba === 'quarteis' && (
        <Section title="Quartéis" action={<button className={btnGhost} onClick={() => { setEditandoQuartel(null); setErro(null); }}>+ Novo quartel</button>}>
          {editandoQuartel === null && <QuartelForm initial={QUARTEL_VAZIO} editando={false} erro={erro} onCancel={() => setEditandoQuartel(undefined)} onSave={salvarQuartel} />}
          <div className="mt-3 flex flex-col gap-2">
            {quarteisFiltrados.map((q) => (
              <div key={q.id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                {editandoQuartel === q.id ? (
                  <QuartelForm initial={q} editando erro={erro} onCancel={() => setEditandoQuartel(undefined)} onSave={salvarQuartel} />
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{q.nome} <span className="font-normal text-slate-400">· {q.municipio}</span></p>
                      <p className="mt-0.5 text-xs text-slate-400">{q.tipo || '—'} · id: {q.id}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button className={btnGhost} onClick={() => { setEditandoQuartel(q.id); setErro(null); }}>Editar</button>
                      <button className={btnDanger} onClick={() => removerQuartel(q.id)}>Remover</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {quarteisFiltrados.length === 0 && <p className="py-4 text-center text-sm text-slate-400">Nenhum quartel encontrado.</p>}
          </div>
        </Section>
      )}

      {aba === 'militares' && (
        <Section
          title="Militares"
          action={<button className={btnGhost} onClick={() => { setEditandoMilitar(null); setErro(null); }}>+ Novo militar</button>}
        >
          <div className="mt-1">
            <select className={`${inputClass} max-w-xs`} value={filtroQuartel} onChange={(e) => setFiltroQuartel(e.target.value)}>
              <option value="">Todos os quartéis</option>
              {quarteis.map((q) => <option key={q.id} value={q.id}>{q.nome}</option>)}
            </select>
          </div>
          {editandoMilitar === null && <MilitarForm initial={MILITAR_VAZIO} quarteis={quarteis} erro={erro} onCancel={() => setEditandoMilitar(undefined)} onSave={salvarMilitar} />}
          <div className="mt-3 flex flex-col gap-2">
            {militaresFiltrados.map((m) => (
              <div key={m.id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                {editandoMilitar === m.id ? (
                  <MilitarForm initial={m} quarteis={quarteis} erro={erro} onCancel={() => setEditandoMilitar(undefined)} onSave={salvarMilitar} />
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{m.posto} {m.nome}{m.rg && <span className="font-normal text-slate-400"> · RG {m.rg}</span>}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{nomeQuartel(m.quartel_id)}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button className={btnGhost} onClick={() => { setEditandoMilitar(m.id); setErro(null); }}>Editar</button>
                      <button className={btnDanger} onClick={() => removerMilitar(m.id, m.nome)}>Remover</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {militaresFiltrados.length === 0 && <p className="py-4 text-center text-sm text-slate-400">Nenhum militar encontrado.</p>}
          </div>
        </Section>
      )}

      {aba === 'acessos' && (
        <Section title="Acessos à Gerenciamento">
          <p className="mt-1 text-xs text-slate-400">Quem cria conta (e-mail/senha) fica "Pendente" até você aprovar aqui — você recebe um e-mail avisando de cada pedido novo. Pra tirar o acesso de alguém depois, é o mesmo lugar, botão "Revogar".</p>
          <div className="mt-3 flex flex-col gap-2">
            {usuarios.map((u) => (
              <div key={u.user_id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{u.email}{u.user_id === session.user.id && <span className="ml-1.5 text-xs font-normal text-slate-400">(você)</span>}</p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${u.aprovado ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>
                    {u.aprovado ? 'Aprovado' : 'Pendente'}
                  </span>
                </div>
                <div className="flex shrink-0 gap-2">
                  {u.aprovado ? (
                    <button className={btnDanger} onClick={() => alternarAprovacao(u, false)}><LuX className="mr-1 inline h-3 w-3" />Revogar</button>
                  ) : (
                    <button className={btnPrimary} onClick={() => alternarAprovacao(u, true)}><LuCheck className="mr-1 inline h-3 w-3" />Aprovar</button>
                  )}
                </div>
              </div>
            ))}
            {usuarios.length === 0 && <p className="py-4 text-center text-sm text-slate-400">Ninguém entrou ainda.</p>}
          </div>
        </Section>
      )}

    </div>
  );
}
