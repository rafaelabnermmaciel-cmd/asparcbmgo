import { Link } from 'react-router-dom';
import { LuLandmark, LuBuilding2 } from 'react-icons/lu';
import { useParlamentaresGO, filtrarParlamentaresPorEsfera } from '../lib/data.js';
import ScrollReveal from '../components/ScrollReveal.jsx';
import brasaoCbmgo from '../assets/brasao-cbmgo.png';

function Caixa({ to, icon: Icon, titulo, descricao, qtdParlamentares }) {
  return (
    <Link
      to={to}
      className="group flex flex-1 flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-red-700"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <p className="text-lg font-semibold text-slate-900 group-hover:text-red-600 dark:text-white dark:group-hover:text-red-400">{titulo}</p>
        <p className="mt-1 text-sm text-slate-400">{descricao}</p>
        {qtdParlamentares != null && (
          <p className="mt-2 text-xs font-medium text-slate-400">{qtdParlamentares} parlamentares</p>
        )}
      </div>
    </Link>
  );
}

export default function SeletorEsfera() {
  const { parlamentares } = useParlamentaresGO();
  const qtdFederal = filtrarParlamentaresPorEsfera(parlamentares, 'federal').length;
  const qtdEstadual = filtrarParlamentaresPorEsfera(parlamentares, 'estadual').length;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <ScrollReveal className="mb-8 flex flex-col items-center text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-[#0f1f3d]">
          <img src={brasaoCbmgo} alt="Brasão do CBM-GO" className="h-12 w-12 object-contain" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Painel de Captação — CBMGO</h1>
        <p className="mt-1 text-sm text-slate-400">Escolha a esfera de captação pra continuar.</p>
      </ScrollReveal>

      <ScrollReveal delay={0.06} className="flex w-full max-w-2xl flex-col gap-4 sm:flex-row">
        <Caixa
          to="/federal"
          icon={LuLandmark}
          titulo="Captação Federal"
          descricao="Câmara dos Deputados e Senado Federal."
          qtdParlamentares={qtdFederal}
        />
        <Caixa
          to="/estadual"
          icon={LuBuilding2}
          titulo="Captação Estadual"
          descricao="Assembleia Legislativa de Goiás (ALEGO)."
          qtdParlamentares={qtdEstadual}
        />
      </ScrollReveal>
    </div>
  );
}
