export default function StatCard({ label, value, sub, accent = 'indigo', icon, valueSize = 'text-3xl' }) {
  const accents = {
    indigo: 'text-indigo-600 dark:text-indigo-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    rose: 'text-rose-600 dark:text-rose-400',
    red: 'text-red-600 dark:text-red-400',
  };
  const badgeAccents = {
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        {icon && <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-base ${badgeAccents[accent]}`}>{icon}</span>}
      </div>
      <p className={`mt-2 truncate ${valueSize} font-semibold ${accents[accent]}`}>{value}</p>
      {sub && <p className="mt-1 truncate text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
