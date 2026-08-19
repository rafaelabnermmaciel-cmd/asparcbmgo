import { ETAPAS_ORDEM, ETAPAS_NOMES } from '../lib/store.jsx';

export default function EtapasTracker({ etapas, onToggle, editable }) {
  if (!etapas) return null;
  return (
    <div className="mt-2 flex items-center">
      {ETAPAS_ORDEM.map((key, i) => {
        const done = !!etapas[key];
        return (
          <div key={key} className="flex items-center">
            {i > 0 && (
              <div className={`h-0.5 w-4 sm:w-6 ${done && etapas[ETAPAS_ORDEM[i - 1]] ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
            <button
              type="button"
              disabled={!editable}
              onClick={() => onToggle?.(key)}
              title={ETAPAS_NOMES[key]}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition ${
                done
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
              } ${editable ? 'cursor-pointer hover:ring-2 hover:ring-emerald-300' : 'cursor-default'}`}
            >
              {done ? '✓' : i + 1}
            </button>
          </div>
        );
      })}
      <div className="ml-3 hidden text-[10px] text-slate-400 sm:block">
        {ETAPAS_ORDEM.filter((k) => etapas[k]).length}/{ETAPAS_ORDEM.length} etapas
      </div>
    </div>
  );
}
