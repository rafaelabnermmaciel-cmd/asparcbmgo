import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LuCalendarDays, LuCamera, LuPaperclip, LuFileText } from 'react-icons/lu';
import { useStore, TIPOS_EVENTO, TIPOS_REUNIAO, STATUS_EVENTO } from '../lib/store.jsx';
import { useAdmin } from '../lib/admin.jsx';
import { useParlamentares } from '../lib/data.js';
import ScrollReveal from '../components/ScrollReveal.jsx';
import { inputClass, labelClass, btnPrimary, btnGhost, btnDanger } from './Gerenciamento.jsx';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const TIPO_COR = { leg: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', rec: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', div: 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300', aniv: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' };
const TIPO_DOT = { leg: 'bg-sky-500', rec: 'bg-emerald-500', div: 'bg-slate-400', aniv: 'bg-amber-500' };
const TIPO_LABEL = { ...TIPOS_EVENTO, aniv: 'Aniversário' };

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function weekStart(d) {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() - r.getDay());
  return r;
}
function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getBirthdayEvts(parlamentares) {
  const evts = [];
  const anoAtual = new Date().getFullYear();
  parlamentares.forEach((p) => {
    if (!p.dataNascimento) return;
    const partes = p.dataNascimento.split('-');
    if (partes.length < 3) return;
    const [, m, d] = partes;
    for (let y = anoAtual - 1; y <= anoAtual + 1; y++) {
      evts.push({ id: `b:${p.casa}:${p.id}:${y}`, data: `${y}-${m}-${d}`, titulo: `Aniversário — ${p.nome}`, tipo: 'aniv', parlamentar: p });
    }
  });
  return evts;
}

const emptyEvento = { titulo: '', data: new Date().toISOString().slice(0, 10), hora: '', tipo: 'div', parlamentarNome: '', destinacaoId: null, projetoId: null, local: '', tipoReuniao: 'Reunião institucional', status: 'Prevista', pauta: '', resultado: '', responsavel: '', observacoes: '', anexos: [] };

const TAMANHO_MAX_ANEXO = 2 * 1024 * 1024; // 2MB — anexo fica embutido no navegador (localStorage), sem servidor.

function arquivoParaDataUri(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function AnexosField({ anexos, onChange }) {
  async function handleFiles(e, tipo) {
    const files = [...e.target.files];
    e.target.value = '';
    const novos = [];
    for (const file of files) {
      if (file.size > TAMANHO_MAX_ANEXO) {
        alert(`"${file.name}" tem mais de 2MB — escolha um arquivo menor (o anexo fica salvo no navegador).`);
        continue;
      }
      const dataUri = await arquivoParaDataUri(file);
      novos.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, tipo, nome: file.name, dataUri });
    }
    if (novos.length) onChange([...(anexos || []), ...novos]);
  }
  function remover(id) {
    onChange((anexos || []).filter((a) => a.id !== id));
  }
  return (
    <div className="sm:col-span-2">
      <p className={labelClass}>Anexos (foto e documento)</p>
      <div className="mt-1 flex flex-wrap gap-2">
        <label className={`${btnGhost} flex cursor-pointer items-center gap-1.5`}>
          <LuCamera className="h-3.5 w-3.5" /> Adicionar foto
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e, 'foto')} />
        </label>
        <label className={`${btnGhost} flex cursor-pointer items-center gap-1.5`}>
          <LuPaperclip className="h-3.5 w-3.5" /> Adicionar documento
          <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" multiple className="hidden" onChange={(e) => handleFiles(e, 'documento')} />
        </label>
      </div>
      {anexos?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {anexos.map((a) => (
            <div key={a.id} className="relative flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900">
              {a.tipo === 'foto' ? (
                <img src={a.dataUri} alt={a.nome} className="h-6 w-6 rounded object-cover" />
              ) : (
                <LuFileText className="h-3.5 w-3.5 text-slate-400" />
              )}
              <span className="max-w-[110px] truncate text-slate-600 dark:text-slate-300">{a.nome}</span>
              <button type="button" onClick={() => remover(a.id)} className="ml-0.5 text-slate-400 hover:text-red-500">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EventoForm({ initial, nomes, onSave, onCancel }) {
  const [f, setF] = useState({ anexos: [], destinacaoId: null, projetoId: null, ...initial });
  const store = useStore();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const itensDoParlamentar = useMemo(() => {
    if (!f.parlamentarNome) return [];
    const dests = store.destinacoes
      .filter((d) => d.parlamentarNome === f.parlamentarNome)
      .map((d) => ({ tipo: 'destinacao', id: d.id, label: `${d.municipio} — ${d.objeto} (${d.ano})` }));
    const projs = store.projetos
      .filter((p) => p.parlamentarNome === f.parlamentarNome)
      .map((p) => ({ tipo: 'projeto', id: p.id, label: `${p.tipo} ${p.numero}` }));
    return [...dests, ...projs];
  }, [f.parlamentarNome, store.destinacoes, store.projetos]);

  const vinculoAtual = f.destinacaoId ? `d:${f.destinacaoId}` : f.projetoId ? `p:${f.projetoId}` : '';

  function setVinculo(e) {
    const v = e.target.value;
    if (!v) return setF({ ...f, destinacaoId: null, projetoId: null });
    const [tipo, idStr] = v.split(':');
    const id = Number(idStr);
    setF({ ...f, destinacaoId: tipo === 'd' ? id : null, projetoId: tipo === 'p' ? id : null });
  }

  return (
    <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 sm:grid-cols-2 dark:border-indigo-900/40 dark:bg-indigo-500/5">
      <div className="sm:col-span-2">
        <p className={labelClass}>Título</p>
        <input className={inputClass} value={f.titulo} onChange={set('titulo')} placeholder="Ex: Reunião com gabinete do Senador..." />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <p className={labelClass}>Data</p>
          <input type="date" className={inputClass} value={f.data} onChange={set('data')} />
        </div>
        <div className="w-24">
          <p className={labelClass}>Hora</p>
          <input type="time" className={inputClass} value={f.hora} onChange={set('hora')} />
        </div>
      </div>
      <div>
        <p className={labelClass}>Categoria</p>
        <select className={inputClass} value={f.tipo} onChange={set('tipo')}>
          {Object.entries(TIPOS_EVENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div>
        <p className={labelClass}>Parlamentar (opcional)</p>
        <input list="nomes-evt" className={inputClass} value={f.parlamentarNome} onChange={(e) => setF({ ...f, parlamentarNome: e.target.value, destinacaoId: null, projetoId: null })} placeholder="Nome do parlamentar" />
        <datalist id="nomes-evt">{nomes.map((n) => <option key={n} value={n} />)}</datalist>
      </div>
      {itensDoParlamentar.length > 0 && (
        <div className="sm:col-span-2">
          <p className={labelClass}>Assunto tratado (destinação ou projeto — opcional)</p>
          <select className={inputClass} value={vinculoAtual} onChange={setVinculo}>
            <option value="">Reunião geral (não vinculada a um item específico)</option>
            {itensDoParlamentar.map((it) => (
              <option key={`${it.tipo}:${it.id}`} value={`${it.tipo === 'destinacao' ? 'd' : 'p'}:${it.id}`}>{it.label}</option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-slate-400">Vincular a um item específico é o que liga essa reunião ao acompanhamento de gargalo daquela tarefa.</p>
        </div>
      )}
      <div>
        <p className={labelClass}>Local</p>
        <input className={inputClass} value={f.local} onChange={set('local')} />
      </div>
      <div>
        <p className={labelClass}>Tipo de reunião</p>
        <select className={inputClass} value={f.tipoReuniao} onChange={set('tipoReuniao')}>
          {TIPOS_REUNIAO.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <p className={labelClass}>Status</p>
        <select className={inputClass} value={f.status} onChange={set('status')}>
          {STATUS_EVENTO.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <p className={labelClass}>Responsável</p>
        <input className={inputClass} value={f.responsavel} onChange={set('responsavel')} />
      </div>
      <div className="sm:col-span-2">
        <p className={labelClass}>Pauta</p>
        <textarea rows={2} className={inputClass} value={f.pauta} onChange={set('pauta')} />
      </div>
      <div className="sm:col-span-2">
        <p className={labelClass}>Resultado / Observações</p>
        <textarea rows={2} className={inputClass} value={f.observacoes} onChange={set('observacoes')} />
      </div>
      <AnexosField anexos={f.anexos} onChange={(anexos) => setF({ ...f, anexos })} />
      <div className="flex gap-2 sm:col-span-2">
        <button className={btnPrimary} onClick={() => onSave(f)}>Salvar</button>
        <button className={btnGhost} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

export default function Agenda() {
  const store = useStore();
  const { admin } = useAdmin();
  const { parlamentares } = useParlamentares();
  const [view, setView] = useState('mes');
  const [cursor, setCursor] = useState(new Date());
  const [filtroTipo, setFiltroTipo] = useState(null);
  const [editing, setEditing] = useState(undefined); // undefined=fechado, null=novo, id=editando
  const [novoDia, setNovoDia] = useState(null);
  const [diaSelecionado, setDiaSelecionado] = useState(null);

  const nomes = useMemo(() => parlamentares.map((p) => p.nome).sort(), [parlamentares]);

  const todosEventos = useMemo(() => {
    const reais = store.eventos.map((e) => ({ ...e, parlamentar: parlamentares.find((p) => p.nome === e.parlamentarNome) }));
    return [...reais, ...getBirthdayEvts(parlamentares)];
  }, [store.eventos, parlamentares]);

  const eventosFiltrados = useMemo(
    () => (filtroTipo ? todosEventos.filter((e) => e.tipo === filtroTipo) : todosEventos),
    [todosEventos, filtroTipo]
  );

  function eventosDoDia(ds) {
    return eventosFiltrados.filter((e) => e.data === ds).sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  }

  const proximosEventos = useMemo(() => {
    const hoje = ymd(new Date());
    return eventosFiltrados
      .filter((e) => e.tipo !== 'aniv' && e.data >= hoje)
      .sort((a, b) => a.data.localeCompare(b.data) || (a.hora || '').localeCompare(b.hora || ''))
      .slice(0, 6);
  }, [eventosFiltrados]);

  function abrirNovo(ds) {
    setNovoDia(ds);
    setEditing(null);
  }

  function handleEventClick(e) {
    if (e.tipo === 'aniv') return; // navegação já é feita pelo Link
    if (admin) setEditing(e.id);
  }

  function navegar(delta) {
    if (view === 'mes') setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
    else if (view === 'semana') setCursor(addDays(cursor, delta * 7));
    else setCursor(addDays(cursor, delta));
  }

  const hojeStr = ymd(new Date());

  function EventChip({ e }) {
    const conteudo = (
      <div className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium ${TIPO_COR[e.tipo] || TIPO_COR.div}`}>
        {e.hora ? `${e.hora} ` : ''}{e.titulo}
      </div>
    );
    if (e.tipo === 'aniv' && e.parlamentar) {
      return <Link to={`/parlamentares/${e.parlamentar.casa}/${e.parlamentar.id}`} onClick={(ev) => ev.stopPropagation()}>{conteudo}</Link>;
    }
    return <div onClick={(ev) => { ev.stopPropagation(); handleEventClick(e); }}>{conteudo}</div>;
  }

  if (store.loading) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:px-6 lg:px-10 lg:pb-8">
      <ScrollReveal className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-semibold text-slate-900 dark:text-white">
            <LuCalendarDays className="h-6 w-6 text-indigo-500" /> Agenda
          </h1>
          <p className="mt-1 text-sm text-slate-400">Reuniões, audiências e aniversários dos parlamentares.</p>
        </div>
        <div className="flex gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-800">
          {['dia', 'semana', 'mes', 'lista'].map((v) => (
            <button key={v} onClick={() => setView(v)} className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${view === v ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500'}`}>
              {v === 'mes' ? 'Mês' : v}
            </button>
          ))}
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.05} className="mt-5 flex flex-wrap items-center gap-2">
        <button onClick={() => navegar(-1)} className={btnGhost}>← Anterior</button>
        <button onClick={() => setCursor(new Date())} className={btnGhost}>Hoje</button>
        <button onClick={() => navegar(1)} className={btnGhost}>Próximo →</button>
        <p className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          {view === 'mes' && `${MESES[cursor.getMonth()]} ${cursor.getFullYear()}`}
          {view === 'semana' && `${ymd(weekStart(cursor)).split('-').reverse().join('/')} – ${ymd(addDays(weekStart(cursor), 6)).split('-').reverse().join('/')}`}
          {view === 'dia' && cursor.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          {view === 'lista' && 'Todos os eventos'}
        </p>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <button onClick={() => setFiltroTipo(null)} className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${!filtroTipo ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>Tudo</button>
          {Object.entries(TIPO_LABEL).map(([k, v]) => (
            <button key={k} onClick={() => setFiltroTipo(k)} className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${filtroTipo === k ? TIPO_COR[k] : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>{v}</button>
          ))}
        </div>
      </ScrollReveal>

      {editing !== undefined && (
        <ScrollReveal delay={0.07}>
          <EventoForm
            initial={editing === null ? { ...emptyEvento, data: novoDia || emptyEvento.data } : todosEventos.find((e) => e.id === editing)}
            nomes={nomes}
            onCancel={() => { setEditing(undefined); setNovoDia(null); }}
            onSave={(f) => {
              if (editing === null) store.addEvento(f);
              else store.updateEvento(editing, f);
              setEditing(undefined);
              setNovoDia(null);
            }}
          />
        </ScrollReveal>
      )}

      {admin && editing === undefined && (
        <ScrollReveal delay={0.08} className="mt-4 flex justify-end">
          <button className="rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700" onClick={() => abrirNovo(hojeStr)}>+ Novo evento</button>
        </ScrollReveal>
      )}

      {view === 'mes' && (
        <ScrollReveal delay={0.1} className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid min-w-[640px] grid-cols-7">
            {DIAS.map((d) => (
              <div key={d} className="border-b border-slate-100 p-2 text-center text-[11px] font-semibold text-slate-400 dark:border-slate-800">{d}</div>
            ))}
            {(() => {
              const y = cursor.getFullYear(), m = cursor.getMonth();
              const primeiroDiaSemana = new Date(y, m, 1).getDay();
              const diasNoMes = new Date(y, m + 1, 0).getDate();
              const cells = [];
              for (let i = 0; i < primeiroDiaSemana; i++) cells.push(<div key={`b${i}`} className="min-h-[92px] border-b border-r border-slate-50 bg-slate-50/40 dark:border-slate-800/60 dark:bg-slate-800/20" />);
              for (let d = 1; d <= diasNoMes; d++) {
                const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const evts = eventosDoDia(ds);
                cells.push(
                  <div key={ds} onClick={() => admin && abrirNovo(ds)} className={`min-h-[92px] cursor-pointer border-b border-r border-slate-50 p-1.5 transition hover:bg-indigo-50/40 dark:border-slate-800/60 dark:hover:bg-indigo-500/5 ${ds === hojeStr ? 'bg-indigo-50/70 dark:bg-indigo-500/10' : ''}`}>
                    <p className={`text-[11px] font-semibold ${ds === hojeStr ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>{d}</p>
                    <div className="mt-1 flex flex-col gap-0.5">
                      {evts.slice(0, 3).map((e) => <EventChip key={e.id} e={e} />)}
                      {evts.length > 3 && <p className="text-[10px] text-slate-400">+{evts.length - 3} mais</p>}
                    </div>
                  </div>
                );
              }
              return cells;
            })()}
          </div>
        </ScrollReveal>
      )}

      {view === 'semana' && (
        <ScrollReveal delay={0.1} className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid min-w-[640px] grid-cols-7">
            {Array.from({ length: 7 }, (_, i) => addDays(weekStart(cursor), i)).map((d) => {
              const ds = ymd(d);
              const evts = eventosDoDia(ds);
              return (
                <div key={ds} onClick={() => admin && abrirNovo(ds)} className={`min-h-[220px] cursor-pointer border-r border-slate-50 p-2 transition hover:bg-indigo-50/40 dark:border-slate-800/60 dark:hover:bg-indigo-500/5 ${ds === hojeStr ? 'bg-indigo-50/70 dark:bg-indigo-500/10' : ''}`}>
                  <p className="text-[11px] font-semibold text-slate-500">{DIAS[d.getDay()]} {d.getDate()}</p>
                  <div className="mt-1.5 flex flex-col gap-1">
                    {evts.map((e) => <EventChip key={e.id} e={e} />)}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollReveal>
      )}

      {view === 'dia' && (
        <ScrollReveal delay={0.1} className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {eventosDoDia(ymd(cursor)).length === 0 && <p className="py-6 text-center text-sm text-slate-400">Nenhum evento neste dia.</p>}
          <div className="flex flex-col gap-2">
            {eventosDoDia(ymd(cursor)).map((e) => (
              <div key={e.id} onClick={() => handleEventClick(e)} className={`flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800 ${admin && e.tipo !== 'aniv' ? 'cursor-pointer hover:border-indigo-200' : ''}`}>
                <span className="w-14 shrink-0 text-xs font-semibold text-slate-500">{e.hora || '—'}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${TIPO_COR[e.tipo]}`}>{TIPO_LABEL[e.tipo]}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">{e.titulo}</span>
                {e.local && <span className="shrink-0 text-xs text-slate-400">{e.local}</span>}
              </div>
            ))}
          </div>
        </ScrollReveal>
      )}

      {view === 'lista' && (
        <ScrollReveal delay={0.1} className="mt-5 flex flex-col gap-2">
          {eventosFiltrados
            .filter((e) => e.tipo !== 'aniv')
            .slice()
            .sort((a, b) => b.data.localeCompare(a.data))
            .map((e) => (
              <div key={e.id} onClick={() => handleEventClick(e)} className={`flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${admin ? 'cursor-pointer hover:border-indigo-200' : ''}`}>
                <span className="w-20 shrink-0 text-xs font-semibold text-slate-500">{e.data.split('-').reverse().join('/')}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${TIPO_COR[e.tipo]}`}>{TIPO_LABEL[e.tipo]}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">{e.titulo}{e.parlamentarNome ? ` · ${e.parlamentarNome}` : ''}</span>
                {e.anexos?.length > 0 && (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
                    <LuPaperclip className="h-3 w-3" /> {e.anexos.length}
                  </span>
                )}
                {admin && (
                  <button className={btnDanger} onClick={(ev) => { ev.stopPropagation(); if (confirm('Remover este evento?')) store.removeEvento(e.id); }}>Remover</button>
                )}
              </div>
            ))}
          {eventosFiltrados.filter((e) => e.tipo !== 'aniv').length === 0 && <p className="py-6 text-center text-sm text-slate-400">Nenhum evento cadastrado ainda.</p>}
        </ScrollReveal>
      )}

      {proximosEventos.length > 0 && view !== 'lista' && (
        <ScrollReveal delay={0.15} className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Próximos eventos</p>
          <div className="mt-3 flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {proximosEventos.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-20 shrink-0 text-xs text-slate-400">{e.data.split('-').reverse().join('/')}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${TIPO_COR[e.tipo]}`}>{TIPO_LABEL[e.tipo]}</span>
                <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">{e.titulo}</span>
              </div>
            ))}
          </div>
        </ScrollReveal>
      )}
    </div>
  );
}
