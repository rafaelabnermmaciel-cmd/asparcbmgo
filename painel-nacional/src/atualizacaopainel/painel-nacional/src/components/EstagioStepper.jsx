import { ESTAGIOS_LEGISLATIVOS } from '../lib/store.jsx';

const CORES = {
  Protocolado: 'bg-slate-400',
  'Aguardando Despacho': 'bg-amber-400',
  'Em Comissão': 'bg-sky-500',
  'Aprovado em Comissão': 'bg-indigo-500',
  'Em Plenário': 'bg-violet-500',
  'Aprovado/Sancionado': 'bg-emerald-500',
  Arquivado: 'bg-red-400',
};

export default function EstagioStepper({ estagio, onChange, editable, stages = ESTAGIOS_LEGISLATIVOS }) {
  const arquivadoIdx = stages.indexOf('Arquivado');
  const stagesSemArquivado = arquivadoIdx >= 0 ? stages.slice(0, arquivadoIdx) : stages;
  const atualIdx = stagesSemArquivado.indexOf(estagio);
  const arquivado = estagio === 'Arquivado';

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1">
      {stagesSemArquivado.map((st, i) => {
        const passou = !arquivado && i <= atualIdx;
        const ativo = !arquivado && i === atualIdx;
        return (
          <button
            key={st}
            type="button"
            disabled={!editable}
            onClick={() => onChange?.(st)}
            title={st}
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${
              ativo ? `${CORES[st]} text-white` : passou ? 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
            } ${editable ? 'cursor-pointer hover:ring-2 hover:ring-indigo-300' : 'cursor-default'}`}
          >
            {st}
          </button>
        );
      })}
      {stages.includes('Arquivado') && (
        <button
          type="button"
          disabled={!editable}
          onClick={() => onChange?.('Arquivado')}
          title="Arquivado"
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${arquivado ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'} ${editable ? 'cursor-pointer hover:ring-2 hover:ring-red-300' : 'cursor-default'}`}
        >
          Arquivado
        </button>
      )}
    </div>
  );
}
