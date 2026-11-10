import { useState } from 'react';
import { LuLock, LuTriangleAlert, LuLogOut, LuMailCheck, LuKeyRound, LuFlame, LuBriefcase, LuArrowLeft, LuChevronRight } from 'react-icons/lu';
import { inputClass, labelClass, btnPrimary, btnGhost } from './CaptacaoForm.jsx';
import { EMAIL_ASSESSORIA_PADRAO } from '../lib/auth.js';

// Tela de login — aparece pra quem abre o site sem estar logado (login é exigido pro site
// inteiro, ver AuthGate.jsx). Primeiro escolhe o papel, depois o jeito de entrar:
//   - "Captador da unidade" (militar de um quartel): e-mail/senha — quem ainda não tem conta
//     usa "Primeiro acesso" ali mesmo (escolhe o quartel e já tem acesso na hora, sem esperar
//     ninguém aprovar — o escopo por quartel já é a própria segurança).
//   - "Assessoria parlamentar": não tem cadastro — é sempre a MESMA conta (ver
//     EMAIL_ASSESSORIA_PADRAO), só digita a senha padrão combinada com o resto da equipe.
// "Esqueci minha senha" (só pro captador) funciona assim: a pessoa já digita a senha nova aqui,
// mas ela só passa a valer depois que alguém aprovado autoriza em Acesso restrito → Acessos
// (sem nenhum e-mail no meio — ver Gerenciamento.jsx e a tabela solicitacoes_senha em
// supabase/schema.sql).
const PAPEIS = [
  {
    id: 'captador',
    icone: LuFlame,
    titulo: 'Captador da unidade',
    descricao: 'Militar de um quartel — vê só as captações e os stakeholders do seu quartel.',
  },
  {
    id: 'assessoria',
    icone: LuBriefcase,
    titulo: 'Assessoria parlamentar',
    descricao: 'Acesso completo, de todos os quartéis.',
  },
];

export function LoginGerenciamento({ entrarComSenha, criarContaComSenha, pedirRedefinicaoSenha, quarteis = [] }) {
  const [etapa, setEtapa] = useState('papel'); // 'papel' | 'captador' | 'assessoria'
  const [modoCaptador, setModoCaptador] = useState('entrar'); // 'entrar' | 'criar' | 'recuperar'
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senhaAssessoria, setSenhaAssessoria] = useState('');
  const [nome, setNome] = useState('');
  const [quartelId, setQuartelId] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [avisoConta, setAvisoConta] = useState(null);

  function limparAvisos() {
    setErro(null);
    setAvisoConta(null);
  }

  function escolherPapel(papel) {
    setEtapa(papel);
    setModoCaptador('entrar');
    limparAvisos();
  }

  function voltar() {
    setEtapa('papel');
    limparAvisos();
  }

  function mudarModoCaptador(novoModo) {
    setModoCaptador(novoModo);
    limparAvisos();
  }

  async function enviar(e) {
    e.preventDefault();
    limparAvisos();
    if (etapa === 'captador' && modoCaptador === 'criar') {
      if (!nome.trim()) { setErro('Informe seu nome.'); return; }
      if (!quartelId) { setErro('Selecione o seu quartel.'); return; }
    }
    setEnviando(true);
    try {
      if (etapa === 'assessoria') {
        await entrarComSenha(EMAIL_ASSESSORIA_PADRAO, senhaAssessoria);
      } else if (modoCaptador === 'entrar') {
        await entrarComSenha(email, senha);
      } else if (modoCaptador === 'criar') {
        await criarContaComSenha(email, senha, { nome: nome.trim(), quartelId });
        setAvisoConta('Conta criada! Se o Supabase pedir confirmação por e-mail, verifique sua caixa de entrada e clique no link antes de entrar — depois disso o acesso já é liberado na hora.');
      } else {
        await pedirRedefinicaoSenha(email, senha);
        setAvisoConta('Pedido enviado! Assim que alguém aprovado autorizar, é só entrar de novo com essa senha nova.');
      }
    } catch (err) {
      setErro(err.message || 'Falha ao entrar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  const papelAtual = PAPEIS.find((p) => p.id === etapa);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8 lg:min-h-screen">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {etapa !== 'papel' && (
          <button type="button" onClick={voltar} className="mb-4 flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-red-600">
            <LuArrowLeft className="h-3.5 w-3.5" /> Trocar de perfil
          </button>
        )}

        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
            {papelAtual ? <papelAtual.icone className="h-4.5 w-4.5" /> : <LuLock className="h-4.5 w-4.5" />}
          </span>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
            {etapa === 'papel' ? 'Painel de Captação — CBMGO' : papelAtual.titulo}
          </h1>
        </div>

        <p className="mt-2 text-xs text-slate-400">
          {etapa === 'papel'
            ? 'Escolha como você quer entrar.'
            : etapa === 'assessoria'
              ? 'Conta compartilhada da assessoria parlamentar — digite a senha padrão combinada com a equipe.'
              : modoCaptador === 'recuperar'
                ? 'Digite seu e-mail e a senha que você quer usar daqui pra frente. Assim que alguém aprovado autorizar, ela já passa a valer — não precisa de nenhum e-mail nem link.'
                : modoCaptador === 'criar'
                  ? 'Escolha o seu quartel — o acesso já é liberado na hora.'
                  : 'Entre com o e-mail e a senha da sua conta.'}
        </p>

        {etapa === 'papel' && (
          <div className="mt-5 flex flex-col gap-3">
            {PAPEIS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => escolherPapel(p.id)}
                className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 text-left transition hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md dark:border-slate-800 dark:hover:border-red-700"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                  <p.icone className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900 group-hover:text-red-600 dark:text-white dark:group-hover:text-red-400">{p.titulo}</span>
                  <span className="block text-xs text-slate-400">{p.descricao}</span>
                </span>
                <LuChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-red-500" />
              </button>
            ))}
          </div>
        )}

        {etapa === 'assessoria' && (
          <form onSubmit={enviar} className="mt-4 flex flex-col gap-3">
            <div>
              <p className={labelClass}>Senha padrão da assessoria</p>
              <input type="password" required autoFocus className={inputClass} value={senhaAssessoria} onChange={(e) => setSenhaAssessoria(e.target.value)} />
            </div>
            {erro && <p className="flex items-center gap-1.5 text-xs text-red-600"><LuTriangleAlert className="h-3.5 w-3.5 shrink-0" /> {erro}</p>}
            <button type="submit" disabled={enviando} className={btnPrimary}>{enviando ? 'Entrando...' : 'Entrar'}</button>
          </form>
        )}

        {etapa === 'captador' && (
          <>
            {modoCaptador !== 'recuperar' && (
              <div className="mt-4 flex gap-2 text-xs font-medium">
                <button type="button" onClick={() => mudarModoCaptador('entrar')} className={`flex-1 rounded-lg px-3 py-2 ${modoCaptador === 'entrar' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>Entrar</button>
                <button type="button" onClick={() => mudarModoCaptador('criar')} className={`flex-1 rounded-lg px-3 py-2 ${modoCaptador === 'criar' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>Primeiro acesso</button>
              </div>
            )}

            <form onSubmit={enviar} className="mt-4 flex flex-col gap-3">
              {modoCaptador === 'criar' && (
                <>
                  <div>
                    <p className={labelClass}>Nome</p>
                    <input required className={inputClass} value={nome} onChange={(e) => setNome(e.target.value)} />
                  </div>
                  <div>
                    <p className={labelClass}>Quartel</p>
                    <select required className={inputClass} value={quartelId} onChange={(e) => setQuartelId(e.target.value)}>
                      <option value="">Selecione...</option>
                      {quarteis.map((q) => <option key={q.id} value={q.id}>{q.nome} — {q.municipio}</option>)}
                    </select>
                  </div>
                </>
              )}
              <div>
                <p className={labelClass}>E-mail</p>
                <input type="email" required className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <p className={labelClass}>{modoCaptador === 'recuperar' ? 'Senha nova' : 'Senha'}</p>
                <input type="password" required minLength={6} className={inputClass} value={senha} onChange={(e) => setSenha(e.target.value)} />
              </div>
              {erro && <p className="flex items-center gap-1.5 text-xs text-red-600"><LuTriangleAlert className="h-3.5 w-3.5 shrink-0" /> {erro}</p>}
              {avisoConta && <p className="flex items-center gap-1.5 text-xs text-emerald-600"><LuMailCheck className="h-3.5 w-3.5 shrink-0" /> {avisoConta}</p>}
              <button type="submit" disabled={enviando} className={btnPrimary}>
                {enviando ? 'Enviando...' : modoCaptador === 'entrar' ? 'Entrar' : modoCaptador === 'criar' ? 'Criar conta' : 'Pedir autorização'}
              </button>
            </form>

            {modoCaptador === 'entrar' && (
              <button type="button" onClick={() => mudarModoCaptador('recuperar')} className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-red-600">
                <LuKeyRound className="h-3.5 w-3.5" /> Esqueci minha senha
              </button>
            )}
            {modoCaptador === 'recuperar' && (
              <button type="button" onClick={() => mudarModoCaptador('entrar')} className="mt-3 text-xs font-medium text-slate-400 hover:text-red-600">
                ← Voltar pro login
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Toda conta nova já entra liberada na hora (ver lidar_com_novo_usuario() em
// supabase/schema.sql) — essa tela só aparece se alguém da assessoria revogou o acesso dessa
// conta depois, pela aba Acesso restrito → Acessos (mesmo lugar onde dá pra liberar de novo).
export function AguardandoAprovacao({ email, sair }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-8 text-center lg:min-h-screen">
      <LuLock className="mx-auto h-8 w-8 text-amber-500" />
      <h1 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">Acesso não liberado</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        A conta <span className="font-medium">{email}</span> não está liberada no momento. Se isso for um engano,
        peça pra alguém da assessoria parlamentar liberar de novo em Acesso restrito → Acessos.
      </p>
      <button type="button" onClick={sair} className={`mt-4 inline-flex items-center gap-1.5 ${btnGhost}`}>
        <LuLogOut className="h-3.5 w-3.5" /> Sair
      </button>
    </div>
  );
}
