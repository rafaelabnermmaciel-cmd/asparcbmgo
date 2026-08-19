import { useParams, Link } from 'react-router-dom';
import { useParlamentares, useVotacoes, useResultadosEleitorais, initials } from '../lib/data.js';
import ScrollReveal from '../components/ScrollReveal.jsx';
import EmptyState from '../components/EmptyState.jsx';

function fmtData(d) {
  if (!d) return '—';
  const dateOnly = d.split('T')[0];
  const [y, m, day] = dateOnly.split('-');
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-200">{value || '—'}</p>
    </div>
  );
}

export default function ParlamentarPerfil() {
  const { casa, id } = useParams();
  const { loading, parlamentares } = useParlamentares();
  const { votacoes } = useVotacoes();
  const { resultados } = useResultadosEleitorais();

  const p = parlamentares.find((x) => x.casa === casa && String(x.id) === String(id));
  const historicoVotos = votacoes[`${casa}:${id}`] || [];
  const eleicao = resultados[`${casa}:${id}`] || null;

  if (loading) return null;

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

      <ScrollReveal delay={0.05} className="mt-4 grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
        <InfoRow label="E-mail" value={p.email} />
        <InfoRow label="Telefone" value={p.telefone} />
        <InfoRow
          label="Gabinete"
          value={p.gabinete ? [p.gabinete.predio, p.gabinete.sala, p.gabinete.andar].filter(Boolean).join(' · ') : null}
        />
        <InfoRow label="Situação" value={p.situacao} />
      </ScrollReveal>

      <ScrollReveal delay={0.1} className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Votos Recebidos na Eleição</p>
        {eleicao ? (
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <InfoRow label="Ano" value={eleicao.ano} />
            <InfoRow label="Nº de urna" value={eleicao.numeroCandidato} />
            <InfoRow label="Votos nominais" value={eleicao.votosNominais?.toLocaleString('pt-BR')} />
            <InfoRow label="Cargo" value={eleicao.cargo} />
          </div>
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
    </div>
  );
}
