export default function EmptyState({ title, description, command }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-700 dark:bg-slate-900/50">
      <p className="text-3xl">📭</p>
      <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      {description && <p className="mx-auto mt-1.5 max-w-md text-xs text-slate-400">{description}</p>}
      {command && (
        <code className="mt-4 inline-block rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-slate-100 dark:bg-black">
          {command}
        </code>
      )}
    </div>
  );
}
