import { Link } from 'react-router-dom';
import { initials } from '../lib/data.js';

export default function ParlamentarCard({ p }) {
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
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
          {p.nome}
        </p>
        <p className="truncate text-xs text-slate-400">
          {p.cargo} · {p.partido || '—'} · {p.uf || '—'}
        </p>
      </div>
    </Link>
  );
}
