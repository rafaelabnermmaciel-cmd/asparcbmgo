import { useState } from 'react';
import { LuLock, LuTriangleAlert, LuLogOut, LuMailCheck } from 'react-icons/lu';
import { inputClass, labelClass, btnPrimary, btnGhost } from './CaptacaoForm.jsx';

// Tela de login/criar conta — aparece quando ninguém está logado e a pessoa tenta abrir a aba
// Gerenciamento. Depois de criar conta, ainda falta o administrador aprovar (ver
// AguardandoAprovacao) — isso aqui só cuida de identificar quem é.
export function LoginGerenciamento({ entrarComSenha, criarContaComSenha }) {
  const [modo, setModo] = useState('entrar'); // 'entrar' | 'criar'
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [avisoConta, setAvisoConta] = useState(null);

  async function enviar(e) {
    e.preventDefault();
    setErro(null);
    setAvisoConta(null);
    setEnviando(true);
    try {
      if (modo === 'entrar') {
        await entrarComSenha(email, senha);
      } else {
        await criarContaComSenha(email, senha);
        setAvisoConta('Conta criada! Se o Supabase pedir confirmação por e-mail, verifique sua caixa de entrada e clique no link antes de entrar. O administrador já recebeu um e-mail avisando do seu pedido — depois de aprovado, é só entrar de novo.');
      }
    } catch (err) {
      setErro(err.message || 'Falha ao entrar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <LuLock className="h-5 w-5 text-red-500" />
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Acesso à Gerenciamento</h1>
        </div>
        <p className="mt-1 text-xs text-slate-400">Quartéis e militares são dado interno — entre com login pra editar. O resto do site continua aberto normalmente.</p>

        <div className="mt-4 flex gap-2 text-xs font-medium">
          <button type="button" onClick={() => setModo('entrar')} className={`rounded-full px-3 py-1 ${modo === 'entrar' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>Entrar</button>
          <button type="button" onClick={() => setModo('criar')} className={`rounded-full px-3 py-1 ${modo === 'criar' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>Criar conta</button>
        </div>

        <form onSubmit={enviar} className="mt-4 flex flex-col gap-3">
          <div>
            <p className={labelClass}>E-mail</p>
            <input type="email" required className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <p className={labelClass}>Senha</p>
            <input type="password" required minLength={6} className={inputClass} value={senha} onChange={(e) => setSenha(e.target.value)} />
          </div>
          {erro && <p className="flex items-center gap-1.5 text-xs text-red-600"><LuTriangleAlert className="h-3.5 w-3.5 shrink-0" /> {erro}</p>}
          {avisoConta && <p className="flex items-center gap-1.5 text-xs text-emerald-600"><LuMailCheck className="h-3.5 w-3.5 shrink-0" /> {avisoConta}</p>}
          <button type="submit" disabled={enviando} className={btnPrimary}>
            {enviando ? 'Enviando...' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Aparece quando a pessoa já entrou (login/senha) mas o administrador ainda não aprovou o
// acesso dela — o administrador já recebeu um e-mail avisando do pedido, e aprova pela aba
// Gerenciamento → Acessos (mesma tela serve pro caso de acesso revogado depois).
export function AguardandoAprovacao({ email, sair }) {
  return (
    <div className="mx-auto max-w-sm px-4 py-16 text-center">
      <LuLock className="mx-auto h-8 w-8 text-amber-500" />
      <h1 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">Aguardando aprovação</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        A conta <span className="font-medium">{email}</span> ainda não foi liberada pra editar a Gerenciamento.
        O administrador já foi avisado por e-mail — assim que aprovar, é só entrar de novo.
      </p>
      <button type="button" onClick={sair} className={`mt-4 inline-flex items-center gap-1.5 ${btnGhost}`}>
        <LuLogOut className="h-3.5 w-3.5" /> Sair
      </button>
    </div>
  );
}
