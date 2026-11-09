import { useAuth, AuthContext } from '../lib/auth.js';
import { useQuarteis, useSolicitacoesSenha } from '../lib/data.js';
import { LoginGerenciamento, AguardandoAprovacao } from './AcessoGerenciamento.jsx';

// Porta de entrada do site inteiro: sem login (e-mail/senha) e aprovação, não dá pra ver nada —
// nem o Dashboard, nem a lista de parlamentares. Antes disso a aba Acesso restrito tinha login
// próprio e o resto do site ficava só atrás da senha única fixa de SenhaGate.jsx (removida —
// cada pessoa agora tem a própria conta). Quem passa por aqui recebe nome/tipo/quartel via
// AuthContext, usados no resto do app pra escopar o que cada um vê (ver supabase/schema.sql).
export default function AuthGate({ children }) {
  const { loading, session, aprovado, nome, tipo, quartelId, entrarComSenha, criarContaComSenha, sair } = useAuth();
  const { quarteis } = useQuarteis();
  const { pedirRedefinicaoSenha } = useSolicitacoesSenha();

  if (loading) return null;

  if (!session) {
    return (
      <LoginGerenciamento
        entrarComSenha={entrarComSenha}
        criarContaComSenha={criarContaComSenha}
        pedirRedefinicaoSenha={pedirRedefinicaoSenha}
        quarteis={quarteis}
      />
    );
  }

  if (!aprovado) {
    return <AguardandoAprovacao email={session.user.email} sair={sair} />;
  }

  return (
    <AuthContext.Provider value={{ userId: session.user.id, email: session.user.email, nome, tipo, quartelId, sair }}>
      {children}
    </AuthContext.Provider>
  );
}
