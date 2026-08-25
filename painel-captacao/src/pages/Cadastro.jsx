import { useState } from 'react';
import { LuCircleCheck, LuTriangleAlert } from 'react-icons/lu';
import { useParlamentaresGO, useQuarteis, useMilitares, useStakeholders, useCaptacoes, useEventos } from '../lib/data.js';
import ScrollReveal from '../components/ScrollReveal.jsx';
import FileField from '../components/FileField.jsx';
import {
  inputClass, btnPrimary, labelClass,
  CamposCaptacao, VAZIO_CAPTACAO, validarCaptacao, paraPayloadCaptacao,
} from '../components/CaptacaoForm.jsx';
import { hoje } from '../components/CaptacaoTimeline.jsx';

export default function Cadastro() {
  const { parlamentares } = useParlamentaresGO();
  const { quarteis } = useQuarteis();
  const { militares } = useMilitares();
  const { stakeholders } = useStakeholders();
  const { submitCaptacao } = useCaptacoes();
  const { addEvento } = useEventos();

  const [f, setF] = useState(VAZIO_CAPTACAO);
  const [dataInicio, setDataInicio] = useState(hoje());
  const [descricaoInicio, setDescricaoInicio] = useState('');
  const [anexos, setAnexos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    const problema = validarCaptacao(f);
    if (problema) { setErro(problema); return; }

    setEnviando(true);
    try {
      const registro = await submitCaptacao({ ...paraPayloadCaptacao(f, quarteis), anexos });
      try {
        await addEvento({ captacao_id: registro.id, data: dataInicio, descricao: descricaoInicio.trim() || 'Primeiro contato' });
        setSucesso('Captação cadastrada! Já está salva e visível pra todo mundo — os próximos passos entram em "Adicionar andamento".');
      } catch {
        setSucesso('Captação cadastrada! (não deu pra registrar a data do primeiro contato na linha do tempo — adicione manualmente em "Adicionar andamento".)');
      }
      setF(VAZIO_CAPTACAO);
      setDataInicio(hoje());
      setDescricaoInicio('');
      setAnexos([]);
    } catch (err) {
      setErro(err.message || 'Falha ao cadastrar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-24 sm:px-6 lg:px-10 lg:pb-8">
      <ScrollReveal>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Cadastrar primeiro contato</h1>
        <p className="mt-1 text-sm text-slate-400">Registre o primeiro contato de uma articulação com parlamentar — os próximos passos entram na aba "Adicionar andamento", até o militar responsável marcar o desfecho.</p>
      </ScrollReveal>

      {quarteis.length === 0 && (
        <ScrollReveal delay={0.03} className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-300">
          <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Nenhum quartel cadastrado ainda no banco. Adicione (ou confira) a lista em Supabase → Table Editor → tabela "quarteis" — ver SETUP.md.</p>
        </ScrollReveal>
      )}

      <ScrollReveal delay={0.06} className="mt-5">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-900">
          <CamposCaptacao valores={f} onChange={(k, v) => setF((prev) => ({ ...prev, [k]: v }))} quarteis={quarteis} militares={militares} parlamentares={parlamentares} stakeholders={stakeholders} />
          <div>
            <p className={labelClass}>Data do primeiro contato *</p>
            <input type="date" className={inputClass} value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div>
            <p className={labelClass}>O que aconteceu nesse primeiro contato</p>
            <input className={inputClass} value={descricaoInicio} onChange={(e) => setDescricaoInicio(e.target.value)} placeholder="Ex: primeiro contato por telefone (opcional)" />
          </div>
          <div className="sm:col-span-2">
            <p className={labelClass}>Documentos e fotos</p>
            <div className="mt-1">
              <FileField anexos={anexos} onChange={setAnexos} />
            </div>
          </div>

          {erro && (
            <p className="sm:col-span-2 flex items-center gap-1.5 text-xs text-red-600"><LuTriangleAlert className="h-3.5 w-3.5" /> {erro}</p>
          )}
          {sucesso && (
            <p className="sm:col-span-2 flex items-center gap-1.5 text-xs text-emerald-600"><LuCircleCheck className="h-3.5 w-3.5" /> {sucesso}</p>
          )}

          <div className="sm:col-span-2">
            <button type="submit" disabled={enviando} className={btnPrimary}>
              {enviando ? 'Enviando...' : 'Cadastrar primeiro contato'}
            </button>
          </div>
        </form>
      </ScrollReveal>
    </div>
  );
}
