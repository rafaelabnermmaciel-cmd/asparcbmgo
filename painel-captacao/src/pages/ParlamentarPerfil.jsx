import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LuBanknote, LuUserRound, LuPencil, LuTrash2, LuChevronDown, LuChevronUp } from 'react-icons/lu';
import { useParlamentaresGO, useResultadosEleitorais, useStakeholders, useQuarteis, useMilitares, useCaptacoes, initials, STATUS_CAPTACAO } from '../lib/data.js';
import ScrollReveal from '../components/ScrollReveal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { btnDanger, fmtR, EdicaoCaptacao } from '../components/CaptacaoForm.jsx';
import { FormularioStakeholder } from '../components/StakeholderForm.jsx';

function CopyButton({ value }) {
  const [copiado, setCopiado] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard?.writeText(value); setCopiado(true); setTimeout(() => setCopiado(false), 1500); }}
      className="ml-1.5 rounded px-1 text-[10px] font-medium text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10"
    >
      {copiado ? '✓ copiado' : 'copiar'}
    </button>
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
  const { loading, parlamentares } = useParlamentaresGO();
  const { resultados } = useResultadosEleitorais();
  const { stakeholders, updateStakeholder, removeStakeholder } = useStakeholders();
  const { quarteis } = useQuarteis();
  const { militares } = useMilitares();
  const { captacoes, updateCaptacao, removeCaptacao } = useCaptacoes();

  const [editandoStakeholderId, setEditandoStakeholderId] = useState(null);
  const [expandidaId, setExpandidaId] = useState(null);
  const [editandoCaptacaoId, setEditandoCaptacaoId] = useState(null);

  const p = parlamentares.find((x) => x.casa === casa && String(x.id) === String(id));
  const parlamentarKey = `${casa}:${id}`;
  const eleicao = resultados[parlamentarKey] || null;
  const stakeholdersDoParlamentar = useMemo(
    () => stakeholders.filter((s) => s.parlamentares_keys?.includes(parlamentarKey)),
    [stakeholders, parlamentarKey]
  );
  const captacoesDoParlamentar = useMemo(
    () => (p ? captacoes.filter((c) => c.parlamentarNome === p.nome).sort((a, b) => STATUS_CAPTACAO.indexOf(b.status) - STATUS_CAPTACAO.indexOf(a.status)) : []),
    [captacoes, p]
  );

  async function excluirStakeholder(s) {
    if (!confirm(`Excluir o stakeholder "${s.nome}"?`)) return;
    try {
      await removeStakeholder(s.id);
    } catch (err) {
      alert(err.message || 'Falha ao excluir. Tente novamente.');
    }
  }

  async function excluirCaptacao(c) {
    if (!confirm(`Excluir a captação "${c.objeto}" (${c.quartelNome})? Essa ação não pode ser desfeita.`)) return;
    try {
      await removeCaptacao(c.id);
      setExpandidaId(null);
    } catch (err) {
      alert(err.message || 'Falha ao excluir. Tente novamente.');
    }
  }

  if (loading) return null;

  if (!p) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState title="Parlamentar não encontrado" description="Os dados ainda não foram carregados, ou este parlamentar não faz parte da bancada de Goiás." />
        <Link to="/parlamentares" className="mt-4 inline-block text-sm text-red-600 hover:underline">← Voltar para Parlamentares</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-24 sm:px-6 lg:px-10 lg:pb-8">
      <Link to="/parlamentares" className="text-xs text-slate-400 hover:text-red-600">← Parlamentares</Link>

      <ScrollReveal className="mt-4 flex flex-col items-start gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        {p.foto ? (
          <img src={p.foto} alt={p.nome} className="h-24 w-24 shrink-0 rounded-2xl object-cover" />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-2xl font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-300">
            {initials(p.nome)}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{p.nome}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {p.cargo} · {p.partido || '—'} · {p.casa === 'senado' ? 'Senado Federal' : 'Câmara dos Deputados'} (Brasília/DF)
          </p>
          {(p.urlCamara || p.urlSenado) && (
            <a href={p.urlCamara || p.urlSenado} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:text-slate-300">
              Perfil oficial ↗
            </a>
          )}
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.05} className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Contato e localização do gabinete</p>
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
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <LuUserRound className="h-4 w-4 text-red-500" /> Stakeholders
          </p>
          <Link to="/cadastro" className="text-xs font-medium text-red-600 hover:underline">+ Cadastrar</Link>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {stakeholdersDoParlamentar.map((s) =>
            editandoStakeholderId === s.id ? (
              <div key={s.id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                <FormularioStakeholder
                  parlamentares={parlamentares}
                  inicial={{ nome: s.nome, cargo: s.cargo, telefone: s.telefone, projeto: s.projeto || '', observacoes: s.observacoes, parlamentaresKeys: s.parlamentares_keys || [] }}
                  onCancelar={() => setEditandoStakeholderId(null)}
                  onSalvar={async (payload) => { await updateStakeholder(s.id, payload); setEditandoStakeholderId(null); }}
                />
              </div>
            ) : (
              <div key={s.id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                <div className="flex items-start justify-between gap-2">
                  <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                    <InfoRow label="Nome" value={s.nome} />
                    <InfoRow label="Cargo / função" value={s.cargo} />
                    <InfoRow label="Telefone" value={s.telefone} copyable />
                    {s.projeto && <InfoRow label="Projeto / atuação" value={s.projeto} />}
                    {s.observacoes && <InfoRow label="Observações" value={s.observacoes} />}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button type="button" onClick={() => setEditandoStakeholderId(s.id)} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:text-slate-400">
                      <LuPencil className="h-3 w-3" /> Editar
                    </button>
                    <button type="button" onClick={() => excluirStakeholder(s)} className={`flex items-center gap-1 ${btnDanger}`}>
                      <LuTrash2 className="h-3 w-3" /> Excluir
                    </button>
                  </div>
                </div>
              </div>
            )
          )}

          {stakeholdersDoParlamentar.length === 0 && (
            <p className="text-xs text-slate-400">Ainda não há stakeholder vinculado a este parlamentar. Cadastre pela aba "Cadastrar captação" (seção Stakeholders) e marque este parlamentar na lista.</p>
          )}
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.15} className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Votos recebidos na eleição</p>
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
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Top municípios em votos</p>
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
                            <div className="h-1.5 rounded-full bg-red-500" style={{ width: `${pct}%` }} />
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
          <p className="mt-2 text-xs text-slate-400">Sem dado eleitoral carregado ainda.</p>
        )}
      </ScrollReveal>

      <ScrollReveal delay={0.2} className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <LuBanknote className="h-4 w-4 text-red-500" /> Captações vinculadas
          </p>
          <Link to="/cadastro" className="text-xs font-medium text-red-600 hover:underline">+ Cadastrar</Link>
        </div>
        {captacoesDoParlamentar.length ? (
          <div className="mt-3 flex flex-col gap-2">
            {captacoesDoParlamentar.map((c) => {
              const aberta = expandidaId === c.id;
              return (
                <div key={c.id} className="rounded-xl border border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => { setExpandidaId(aberta ? null : c.id); setEditandoCaptacaoId(null); }}
                    className="flex w-full items-start justify-between gap-2 p-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{c.quartelNome} <span className="font-normal text-slate-400">· {c.objeto}</span></p>
                      <p className="mt-0.5 text-xs text-slate-500">{c.valorPrevisto ? `${fmtR(c.valorPrevisto)} previsto` : 'sem valor definido ainda'}{c.numReunioes ? ` · ${c.numReunioes} reunião(ões)` : ''}</p>
                      <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{c.status}</span>
                    </div>
                    {aberta ? <LuChevronUp className="mt-1 h-4 w-4 shrink-0 text-slate-400" /> : <LuChevronDown className="mt-1 h-4 w-4 shrink-0 text-slate-400" />}
                  </button>

                  {aberta && (
                    <div className="border-t border-slate-100 p-3 dark:border-slate-800">
                      {editandoCaptacaoId === c.id ? (
                        <EdicaoCaptacao
                          captacao={c}
                          quarteis={quarteis}
                          militares={militares}
                          parlamentares={parlamentares}
                          stakeholders={stakeholders}
                          onCancelar={() => setEditandoCaptacaoId(null)}
                          onSalvar={async (payload) => { await updateCaptacao(c.id, payload); setEditandoCaptacaoId(null); }}
                        />
                      ) : (
                        <>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <InfoRow label="Responsável" value={c.responsavel} />
                            <InfoRow label="Stakeholder / contato-chave" value={c.stakeholder} />
                            <InfoRow label="Valor previsto" value={c.valorPrevisto ? fmtR(c.valorPrevisto) : '—'} />
                            <InfoRow label="Valor confirmado" value={c.valorConfirmado ? fmtR(c.valorConfirmado) : '—'} />
                            {c.observacoes && <InfoRow label="Observações" value={c.observacoes} />}
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button type="button" onClick={() => setEditandoCaptacaoId(c.id)} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:text-slate-400">
                              <LuPencil className="h-3 w-3" /> Editar
                            </button>
                            <button type="button" onClick={() => excluirCaptacao(c)} className={`flex items-center gap-1 ${btnDanger}`}>
                              <LuTrash2 className="h-3 w-3" /> Excluir
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-400">Nenhuma captação cadastrada com este parlamentar ainda.</p>
        )}
      </ScrollReveal>
    </div>
  );
}
