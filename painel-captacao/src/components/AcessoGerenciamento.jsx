import { useState } from 'react';
import { LuLock, LuTriangleAlert, LuLogOut, LuMailCheck, LuKeyRound } from 'react-icons/lu';
import { inputClass, labelClass, btnPrimary, btnGhost } from './CaptacaoForm.jsx';

// Tela de login/criar conta/recuperar senha — aparece quando ninguém está logado e a pessoa
// tenta abrir o Acesso restrito. Depois de criar conta, ainda falta o administrador aprovar
// (ver AguardandoAprovacao) — e o "Esqueci minha senha" também: só REGISTRA o pedido aqui, o
// e-mail de verdade só sai depois que o administrador aprovar em Acesso restrito → Acessos
// (ver Gerenciamento.jsx e a tabela solicitacoes_senha em supabase/schema.sql).
export function LoginGerenciamento({ entrarComSenha, criarContaComSenha, pedirRedefinicaoSenha }) {
  const [modo, setModo] = useState('entrar'); // 'entrar' | 'criar' | 'recuperar'
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [avisoConta, setAvisoConta] = useState(null);

  function mudarModo(novoModo) {
    setModo(novoModo);
    setErro(null);
    setAvisoConta(null);
  }

  async function enviar(e) {
    e.preventDefault();
    setErro(null);
    setAvisoConta(null);
    setEnviando(true);
    try {
      if (modo === 'entrar') {
        await entrarComSenha(email, senha);
      } else if (modo === 'criar') {
        await criarContaComSenha(email, senha);
        setAvisoConta('Conta criada! Se o Supabase pedir confirmação por e-mail, verifique sua caixa de entrada e clique no link antes de entrar. O administrador já recebeu um e-mail avisando do seu pedido — depois de aprovado, é só entrar de novo.');
      } else {
        await pedirRedefinicaoSenha(email);
        setAvisoConta('Pedido enviado! Assim que o administrador aprovar, você recebe um link por e-mail pra escolher a senha nova.');
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
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Acesso restrito</h1>
        </div>
        <p className="mt-1 text-xs text-slate-400">Quartéis e militares são dado interno — entre com login pra editar. O resto do site continua aberto normalmente.</p>

        {modo !== 'recuperar' && (
          <div className="mt-4 flex gap-2 text-xs font-medium">
            <button type="button" onClick={() => mudarModo('entrar')} className={`rounded-full px-3 py-1 ${modo === 'entrar' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>Entrar</button>
            <button type="button" onClick={() => mudarModo('criar')} className={`rounded-full px-3 py-1 ${modo === 'criar' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>Criar conta</button>
          </div>
        )}

        <form onSubmit={enviar} className="mt-4 flex flex-col gap-3">
          <div>
            <p className={labelClass}>E-mail</p>
            <input type="email" required className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {modo !== 'recuperar' && (
            <div>
              <p className={labelClass}>Senha</p>
              <input type="password" required minLength={6} className={inputClass} value={senha} onChange={(e) => setSenha(e.target.value)} />
            </div>
          )}
          {erro && <p className="flex items-center gap-1.5 text-xs text-red-600"><LuTriangleAlert className="h-3.5 w-3.5 shrink-0" /> {erro}</p>}
          {avisoConta && <p className="flex items-center gap-1.5 text-xs text-emerald-600"><LuMailCheck className="h-3.5 w-3.5 shrink-0" /> {avisoConta}</p>}
          <button type="submit" disabled={enviando} className={btnPrimary}>
            {enviando ? 'Enviando...' : modo === 'entrar' ? 'Entrar' : modo === 'criar' ? 'Criar conta' : 'Pedir redefinição de senha'}
          </button>
        </form>

        {modo === 'entrar' && (
          <button type="button" onClick={() => mudarModo('recuperar')} className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-red-600">
            <LuKeyRound className="h-3.5 w-3.5" /> Esqueci minha senha
          </button>
        )}
        {modo === 'recuperar' && (
          <button type="button" onClick={() => mudarModo('entrar')} className="mt-3 text-xs font-medium text-slate-400 hover:text-red-600">
            ← Voltar pro login
          </button>
        )}
      </div>
    </div>
  );
}

// Aparece quando a pessoa clica no link de recuperação recebido por e-mail (ver
// "Esqueci minha senha" acima) — pede a senha nova e já entra com ela.
export function RedefinirSenha({ atualizarSenha, sair }) {
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setErro(null);
    if (senha !== confirmacao) { setErro('As duas senhas precisam ser iguais.'); return; }
    setEnviando(true);
    try {
      await atualizarSenha(senha);
      setSucesso(true);
    } catch (err) {
      setErro(err.message || 'Falha ao trocar a senha. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <LuKeyRound className="h-5 w-5 text-red-500" />
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Escolher nova senha</h1>
        </div>
        {sucesso ? (
          <>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-600"><LuMailCheck className="h-4 w-4 shrink-0" /> Senha trocada! Já pode entrar de novo com ela.</p>
            <button type="button" onClick={sair} className={`mt-4 inline-flex items-center gap-1.5 ${btnGhost}`}>
              <LuLogOut className="h-3.5 w-3.5" /> Ir pro login
            </button>
          </>
        ) : (
          <form onSubmit={enviar} className="mt-4 flex flex-col gap-3">
            <div>
              <p className={labelClass}>Senha nova</p>
              <input type="password" required minLength={6} className={inputClass} value={senha} onChange={(e) => setSenha(e.target.value)} />
            </div>
            <div>
              <p className={labelClass}>Confirme a senha nova</p>
              <input type="password" required minLength={6} className={inputClass} value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
            </div>
            {erro && <p className="flex items-center gap-1.5 text-xs text-red-600"><LuTriangleAlert className="h-3.5 w-3.5 shrink-0" /> {erro}</p>}
            <button type="submit" disabled={enviando} className={btnPrimary}>
              {enviando ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// Aparece quando a pessoa já entrou (login/senha) mas o administrador ainda não aprovou o
// acesso dela — o administrador já recebeu um e-mail avisando do pedido, e aprova pela aba
// Acesso restrito → Acessos (mesma tela serve pro caso de acesso revogado depois).
export function AguardandoAprovacao({ email, sair }) {
  return (
    <div className="mx-auto max-w-sm px-4 py-16 text-center">
      <LuLock className="mx-auto h-8 w-8 text-amber-500" />
      <h1 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">Aguardando aprovação</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        A conta <span className="font-medium">{email}</span> ainda não foi liberada pra editar o Acesso restrito.
        O administrador já foi avisado por e-mail — assim que aprovar, é só entrar de novo.
      </p>
      <button type="button" onClick={sair} className={`mt-4 inline-flex items-center gap-1.5 ${btnGhost}`}>
        <LuLogOut className="h-3.5 w-3.5" /> Sair
      </button>
    </div>
  );
}
