import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LuTriangleAlert, LuBanknote, LuFileText, LuHandshake, LuPenLine, LuScale } from 'react-icons/lu';
import { useParlamentares, useVotacoes, useResultadosEleitorais, initials } from '../lib/data.js';
import { useStore, STATUS_PROJETO, diasSemContatoItem, nivelGargalo, destinacaoAtiva, projetoAtivo, nomesCorrespondem } from '../lib/store.jsx';
import { useAdmin } from '../lib/admin.jsx';
import { DestForm, ProjForm, emptyDest, emptyProj, btnGhost, btnDanger } from './Gerenciamento.jsx';
import ScrollReveal from '../components/ScrollReveal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import EtapasTracker from '../components/EtapasTracker.jsx';
import EstagioStepper from '../components/EstagioStepper.jsx';

function fmtR(v) {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

const GARGALO_ESTILO = {
  vermelho: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  amarelo: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
};

function CopyButton({ value }) {
  const [copiado, setCopiado] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard?.writeText(value); setCopiado(true); setTimeout(() => setCopiado(false), 1500); }}
      className="ml-1.5 rounded px-1 text-[10px] font-medium text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-500/10"
      title="Copiar"
    >
      {copiado ? '✓ copiado' : 'copiar'}
    </button>
  );
}

function fmtData(d) {
  if (!d) return '—';
  const dateOnly = d.split('T')[0];
  const [y, m, day] = dateOnly.split('-');
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}

function GargaloBadge({ tipo, id, eventos }) {
  const dias = diasSemContatoItem(tipo, id, eventos);
  const nivel = nivelGargalo(dias);
  if (!nivel) return null;
  return (
    <span className={`ml-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${GARGALO_ESTILO[nivel]}`}>
      <LuTriangleAlert className="h-3 w-3" /> {dias}d sem contato
    </span>
  );
}

function InfoRow({ label, value, copyable }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="break-words text-sm font-medium text-slate-700 dark:text-slate-200">{value || '—'}</p>
        {copyable && value && <CopyButton value={value} />}
      </div>
    </div>
  );
}

// Câmara identifica o gabinete por prédio (anexo)/sala/andar; Senado não expõe esse nível de
// detalhe pela API pública — por isso a seção só aparece quando há pelo menos um dado real,
// em vez de mostrar um "—" confuso pra quem é senador.
function formatGabinete(g) {
  if (!g) return null;
  const partes = [];
  if (g.predio) partes.push(`Anexo ${g.predio}`);
  if (g.sala) partes.push(`Sala ${g.sala}`);
  if (g.andar) partes.push(`${g.andar}º andar`);
  return partes.length ? partes.join(' · ') : null;
}

export default function ParlamentarPerfil() {
  const { casa, id } = useParams();
  const { loading, parlamentares } = useParlamentares();
  const { votacoes } = useVotacoes();
  const { resultados } = useResultadosEleitorais();
  const store = useStore();
  const { admin } = useAdmin();
  const [editingDest, setEditingDest] = useState(undefined);
  const [editingProj, setEditingProj] = useState(undefined); // id do projeto sendo editado (existente)
  const [addingComo, setAddingComo] = useState(null); // null | 'autor' | 'relator' — novo projeto

  const todosNomes = useMemo(() => parlamentares.map((x) => x.nome).sort(), [parlamentares]);

  const p = parlamentares.find((x) => x.casa === casa && String(x.id) === String(id));
  const historicoVotos = votacoes[`${casa}:${id}`] || [];
  const eleicao = resultados[`${casa}:${id}`] || null;
  const destinacoes = p ? store.destinacoes.filter((d) => d.parlamentarNome === p.nome) : [];
  const projetosAutoria = p ? store.projetos.filter((pr) => nomesCorrespondem(pr.autor, p.nome)) : [];
  const projetosRelatoria = p ? store.projetos.filter((pr) => nomesCorrespondem(pr.relator, p.nome)) : [];
  const reunioes = p ? store.eventos.filter((e) => e.parlamentarNome === p.nome).slice().sort((a, b) => b.data.localeCompare(a.data)) : [];

  function labelDoVinculo(e) {
    if (e.destinacaoId) {
      const d = store.destinacoes.find((x) => x.id === e.destinacaoId);
      return d ? { Icon: LuBanknote, texto: `${d.municipio} — ${d.objeto}` } : null;
    }
    if (e.projetoId) {
      const pr = store.projetos.find((x) => x.id === e.projetoId);
      return pr ? { Icon: LuFileText, texto: `${pr.tipo} ${pr.numero}` } : null;
    }
    return null;
  }

  if (loading || store.loading) return null;

  if (!p) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState
          title="Parlamentar não encontrado"
          description="Os dados ainda não foram carregados, ou este parlamentar não existe na base atual."
        />
        <Link to="/parlamentares" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
          ← Voltar para Parlamentares
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-24 sm:px-6 lg:px-10 lg:pb-8">
      <Link to="/parlamentares" className="text-xs text-slate-400 hover:text-indigo-600">
        ← Parlamentares
      </Link>

      <ScrollReveal className="mt-4 flex flex-col items-start gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        {p.foto ? (
          <img src={p.foto} alt={p.nome} className="h-24 w-24 shrink-0 rounded-2xl object-cover" />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-2xl font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
            {initials(p.nome)}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{p.nome}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {p.cargo} · {p.partido || '—'} · {p.uf || '—'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(p.urlCamara || p.urlSenado) && (
              <a
                href={p.urlCamara || p.urlSenado}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300"
              >
                Perfil oficial ↗
              </a>
            )}
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.05} className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Contato</p>
        <div className="mt-4 flex flex-col gap-5">
          <InfoRow label="E-mail" value={p.email} copyable />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <InfoRow label="Telefone" value={p.telefone} copyable />
            {formatGabinete(p.gabinete) && <InfoRow label="Gabinete" value={formatGabinete(p.gabinete)} />}
            <InfoRow label="Situação" value={p.situacao} />
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.1} className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Votos Recebidos na Eleição</p>
        {eleicao ? (
          <>
            <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <InfoRow label="Ano" value={eleicao.ano} />
              <InfoRow label="Partido" value={eleicao.partido} />
              <InfoRow label="Votos nominais" value={eleicao.votosNominais?.toLocaleString('pt-BR')} />
              <InfoRow label="Cargo" value={eleicao.cargo} />
            </div>
            {eleicao.topMunicipios?.length > 0 && (
              <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Top 5 municípios em votos</p>
                <div className="mt-3 flex flex-col gap-2.5">
                  {eleicao.topMunicipios.map((m, i) => {
                    const max = eleicao.topMunicipios[0].votos || 1;
                    const pct = Math.max(6, (m.votos / max) * 100);
                    return (
                      <div key={m.municipio} className="flex items-center gap-3">
                        <span className="w-4 shrink-0 text-right text-xs font-semibold text-slate-400">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">{m.municipio}</span>
                            <span className="shrink-0 text-xs text-slate-400">{m.votos.toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                            <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="mt-2 text-xs text-slate-400">
            Sem dado eleitoral carregado ainda — rode <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">npm run fetch:eleicoes</code>.
          </p>
        )}
      </ScrollReveal>

      <ScrollReveal delay={0.15} className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Histórico de Votações em Plenário</p>
        {historicoVotos.length ? (
          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {historicoVotos.slice(0, 20).map((v, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-slate-700 dark:text-slate-200">{v.descricao || v.materia || v.proposicao || 'Votação'}</p>
                  <p className="text-xs text-slate-400">{fmtData(v.data)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {v.voto || '—'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-400">
            Sem histórico de votações carregado ainda — rode <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">npm run fetch:votacoes</code>.
          </p>
        )}
      </ScrollReveal>

      <ScrollReveal delay={0.2} className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Destinações CBM-GO</p>
          {admin && <button className={btnGhost} onClick={() => setEditingDest(null)}>+ Adicionar</button>}
        </div>
        {editingDest === null && (
          <DestForm
            initial={{ ...emptyDest, parlamentarNome: p.nome }}
            nomes={[p.nome]}
            onCancel={() => setEditingDest(undefined)}
            onSave={(f) => { store.addDestinacao(f); setEditingDest(undefined); }}
          />
        )}
        {destinacoes.length ? (
          <div className="mt-3 flex flex-col gap-2">
            {destinacoes.map((d) => (
              <div key={d.id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                {editingDest === d.id ? (
                  <DestForm
                    initial={d}
                    nomes={[p.nome]}
                    onCancel={() => setEditingDest(undefined)}
                    onSave={(f) => { store.updateDestinacao(d.id, f); setEditingDest(undefined); }}
                  />
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{d.municipio} <span className="font-normal text-slate-400">· {d.ano}</span></p>
                      <p className="mt-0.5 text-xs text-slate-500">{d.objeto} · {fmtR(d.valorPrevisto)} previsto{d.valorConfirmado ? ` · ${fmtR(d.valorConfirmado)} confirmado` : ''}{d.sei ? ` · SEI: ${d.sei}` : ''}</p>
                      <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${d.status === 'Acordo Verbal' ? 'border border-dashed border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>
                        {d.status === 'Acordo Verbal' && <LuHandshake className="h-3 w-3" />} {d.status}
                      </span>
                      {destinacaoAtiva(d) && <GargaloBadge tipo="destinacao" id={d.id} eventos={store.eventos} />}
                      <EtapasTracker etapas={d.etapas} editable={admin} onToggle={(key) => store.toggleDestinacaoEtapa(d.id, key)} />
                    </div>
                    {admin && (
                      <div className="flex shrink-0 gap-2">
                        <button className={btnGhost} onClick={() => setEditingDest(d.id)}>Editar</button>
                        <button className={btnDanger} onClick={() => { if (confirm('Remover esta destinação?')) store.removeDestinacao(d.id); }}>Remover</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-400">Nenhuma destinação registrada para este parlamentar.</p>
        )}
      </ScrollReveal>

      {[
        { role: 'autor', Icon: LuPenLine, titulo: 'Autoria de Projetos de Interesse do CBM-GO', lista: projetosAutoria, vazio: 'Nenhum projeto de autoria deste parlamentar registrado ainda.' },
        { role: 'relator', Icon: LuScale, titulo: 'Relatoria de Projetos de Interesse do CBM-GO', lista: projetosRelatoria, vazio: 'Nenhum projeto sob relatoria deste parlamentar registrado ainda.' },
      ].map(({ role, Icon, titulo, lista, vazio }, blocoIdx) => (
        <ScrollReveal key={role} delay={0.25 + blocoIdx * 0.03} className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Icon className="h-4 w-4 text-indigo-500" /> {titulo}
            </p>
            {admin && <button className={btnGhost} onClick={() => setAddingComo(role)}>+ Adicionar</button>}
          </div>
          {addingComo === role && (
            <ProjForm
              initial={{ ...emptyProj, [role]: p.nome }}
              nomes={todosNomes}
              onCancel={() => setAddingComo(null)}
              onSave={(f) => { store.addProjeto(f); setAddingComo(null); }}
            />
          )}
          {lista.length ? (
            <div className="mt-3 flex flex-col gap-2">
              {lista.map((pr) => (
                <div key={pr.id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                  {editingProj === pr.id ? (
                    <ProjForm
                      initial={pr}
                      nomes={todosNomes}
                      onCancel={() => setEditingProj(undefined)}
                      onSave={(f) => { store.updateProjeto(pr.id, f); setEditingProj(undefined); }}
                    />
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                          {pr.tipo} {pr.numero}
                          {projetoAtivo(pr) && <GargaloBadge tipo="projeto" id={pr.id} eventos={store.eventos} />}
                        </p>
                        {role === 'autor' && pr.relator && (
                          <p className="mt-0.5 text-xs text-slate-400">Relator: {pr.relator}</p>
                        )}
                        {role === 'relator' && pr.autor && (
                          <p className="mt-0.5 text-xs text-slate-400">Autor: {pr.autor}</p>
                        )}
                        <p className="mt-0.5 truncate text-xs text-slate-500">{pr.ementa}</p>
                        <EstagioStepper estagio={pr.status} stages={STATUS_PROJETO} editable={admin} onChange={(st) => store.updateProjeto(pr.id, { status: st })} />
                      </div>
                      {admin && (
                        <div className="flex shrink-0 gap-2">
                          <button className={btnGhost} onClick={() => setEditingProj(pr.id)}>Editar</button>
                          <button className={btnDanger} onClick={() => { if (confirm('Remover este projeto?')) store.removeProjeto(pr.id); }}>Remover</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-400">{vazio}</p>
          )}
        </ScrollReveal>
      ))}

      <ScrollReveal delay={0.3} className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Reuniões e contatos</p>
          <Link to="/agenda" className={btnGhost}>+ Registrar na Agenda</Link>
        </div>
        {reunioes.length ? (
          <div className="mt-3 flex flex-col gap-2">
            {reunioes.map((e) => {
              const vinculo = labelDoVinculo(e);
              return (
              <div key={e.id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">{e.data?.split('-').reverse().join('/')}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{e.status}</span>
                  <span className="text-sm text-slate-700 dark:text-slate-200">{e.titulo}</span>
                </div>
                {vinculo && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    <vinculo.Icon className="h-3 w-3" /> {vinculo.texto}
                  </p>
                )}
                {e.pauta && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{e.pauta}</p>}
                {e.anexos?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {e.anexos.map((a) => (
                      a.tipo === 'foto' ? (
                        <img key={a.id} src={a.url} alt={a.nome} className="h-12 w-12 rounded-lg object-cover" />
                      ) : (
                        <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:border-indigo-300 dark:border-slate-700 dark:text-slate-300">
                          <LuFileText className="h-3 w-3" /> {a.nome}
                        </a>
                      )
                    ))}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-400">Nenhuma reunião registrada ainda — cadastre pela Agenda e vincule a este parlamentar.</p>
        )}
      </ScrollReveal>
    </div>
  );
}
