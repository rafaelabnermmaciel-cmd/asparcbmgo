import { Link } from 'react-router-dom';
import { initials } from '../lib/data.js';

const NOME_CASA_CURTO = {
  senado: 'Senado',
  camara: 'Câmara',
  alego: 'ALEGO',
};

function LinhaRanking({ posicao, p, votos, corPosicao }) {
  return (
    <Link
      to={`/parlamentares/${p.casa}/${p.id}`}
      className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
    >
      <span className={`w-5 shrink-0 text-center text-sm font-bold ${corPosicao}`}>{posicao}</span>
      {p.foto ? (
        <img src={p.foto} alt={p.nome} className="h-9 w-9 shrink-0 rounded-lg object-cover" loading="lazy" />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-[11px] font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-300">
          {initials(p.nome)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{p.nome}</p>
        <p className="truncate text-xs text-slate-400">{NOME_CASA_CURTO[p.casa] || p.casa} · {p.partido || '—'}</p>
      </div>
      <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">{votos.toLocaleString('pt-BR')}</span>
    </Link>
  );
}

// Ranking dos parlamentares de GO por votos recebidos na eleição de 2022 (federais e
// estaduais juntos — ver scripts/fetch-votos-go-2022.js). Só entram no ranking os que
// têm dado de votos casado; quem não casou (ex: assumiu por suplência) fica de fora.
export default function RankingVotos({ parlamentares, resultados }) {
  const comVotos = parlamentares
    .map((p) => ({ p, votos: resultados[`${p.casa}:${p.id}`]?.votosNominais }))
    .filter((x) => Number.isFinite(x.votos))
    .sort((a, b) => b.votos - a.votos);

  if (comVotos.length < 2) return null;

  const maisVotados = comVotos.slice(0, 5);
  const restante = comVotos.length - maisVotados.length;
  const menosVotados = restante > 0 ? comVotos.slice(-Math.min(5, restante)).reverse() : [];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">🏆 Top 5 mais votados</p>
        <p className="text-[11px] text-slate-400">Eleição de 2022 · federais e estaduais</p>
        <div className="mt-2 flex flex-col gap-0.5">
          {maisVotados.map(({ p, votos }, i) => (
            <LinhaRanking key={`${p.casa}-${p.id}`} posicao={i + 1} p={p} votos={votos} corPosicao="text-emerald-600 dark:text-emerald-400" />
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">🔻 Top 5 menos votados</p>
        <p className="text-[11px] text-slate-400">Eleição de 2022 · federais e estaduais</p>
        <div className="mt-2 flex flex-col gap-0.5">
          {menosVotados.map(({ p, votos }, i) => (
            <LinhaRanking key={`${p.casa}-${p.id}`} posicao={i + 1} p={p} votos={votos} corPosicao="text-slate-400" />
          ))}
        </div>
      </div>
    </div>
  );
}
