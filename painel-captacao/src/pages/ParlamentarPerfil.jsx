import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LuBanknote, LuUserRound, LuTriangleAlert } from 'react-icons/lu';
import { useParlamentaresGO, useResultadosEleitorais, useInterlocutores, useCaptacoes, initials, STATUS_CAPTACAO } from '../lib/data.js';
import ScrollReveal from '../components/ScrollReveal.jsx';
import EmptyState from '../components/EmptyState.jsx';

function fmtR(v) {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

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
  const { interlocutores } = useInterlocutores();
  const { captacoes } = useCaptacoes();

  const p = parlamentares.find((x) => x.casa === casa && String(x.id) === String(id));
  const eleicao = resultados[`${casa}:${id}`] || null;
  const interlocutor = interlocutores[`${casa}:${id}`] || null;
  const captacoesDoParlamentar = useMemo(
    () => (p ? captacoes.filter((c) => c.parlamentarNome === p.nome).sort((a, b) => STATUS_CAPTACAO.indexOf(b.status) - STATUS_CAPTACAO.indexOf(a.status)) : []),
    [captacoes, p]
  );

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
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <LuUserRound className="h-4 w-4 text-red-500" /> Interlocução para captação
        </p>
        {interlocutor ? (
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <InfoRow label="Nome" value={interlocutor.nome} />
            <InfoRow label="Cargo / função" value={interlocutor.cargo} />
            <InfoRow label="Telefone" value={interlocutor.telefone} copyable />
            <InfoRow label="E-mail" value={interlocutor.email} copyable />
            {interlocutor.observacoes && <InfoRow label="Observações" value={interlocutor.observacoes} />}
          </div>
        ) : (
          <div className="mt-3 flex items-start gap-2 text-xs text-slate-400">
            <LuTriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <p>Ainda não há interlocutor cadastrado para este parlamentar (assessor/gabinete responsável por tratar de captação). Preencha em <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">public/data/interlocutores.json</code>, na chave <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">"{casa}:{id}"</code>.</p>
          </div>
        )}
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
            {captacoesDoParlamentar.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{c.quartelNome} <span className="font-normal text-slate-400">· {c.objeto}</span></p>
                <p className="mt-0.5 text-xs text-slate-500">{c.valorPrevisto ? `${fmtR(c.valorPrevisto)} previsto` : 'sem valor definido ainda'}{c.numReunioes ? ` · ${c.numReunioes} reunião(ões)` : ''}</p>
                <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{c.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-400">Nenhuma captação cadastrada com este parlamentar ainda.</p>
        )}
      </ScrollReveal>
    </div>
  );
}
