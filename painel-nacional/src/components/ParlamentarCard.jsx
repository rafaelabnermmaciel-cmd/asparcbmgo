import { Link } from 'react-router-dom';
import { initials } from '../lib/data.js';
import { useStore } from '../lib/store.jsx';

export default function ParlamentarCard({ p }) {
  const store = useStore();
  const tracked = !store.loading && (store.destinacoes.some((d) => d.parlamentarNome === p.nome) || store.projetos.some((pr) => pr.parlamentarNome === p.nome));

  return (
    <Link
      to={`/parlamentares/${p.casa}/${p.id}`}
      className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
    >
      {p.foto ? (
        <img src={p.foto} alt={p.nome} className="h-12 w-12 shrink-0 rounded-xl object-cover" loading="lazy" />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
          {initials(p.nome)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
            {p.nome}
          </p>
          {tracked && (
            <span className="shrink-0 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-600 dark:bg-red-500/10 dark:text-red-400">
              CBM-GO
            </span>
          )}
        </div>
        <p className="truncate text-xs text-slate-400">
          {p.cargo} · {p.partido || '—'} · {p.uf || '—'}
        </p>
      </div>
    </Link>
  );
}
