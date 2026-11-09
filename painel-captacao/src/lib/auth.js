import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, supabaseConfigurado } from './supabase.js';
import { notificarPedidoAcesso } from './emailjs.js';

// A assessoria parlamentar não cria conta própria — todo mundo da assessoria entra com essa
// MESMA conta, digitando só a senha padrão combinada entre vocês (ver modo "assessoria" em
// AcessoGerenciamento.jsx). Tem que continuar IGUAL ao e-mail hardcoded no gatilho
// lidar_com_novo_usuario() em supabase/schema.sql — os dois precisam ser trocados juntos.
export const EMAIL_ASSESSORIA_PADRAO = 'asparcbmgo@gmail.com';

// Dados de quem está logado, disponíveis pra qualquer página sem precisar chamar useAuth() de
// novo (que buscaria a aprovação de novo) — preenchido pelo AuthGate.jsx, que já fez esse
// trabalho uma vez lá no topo da árvore.
export const AuthContext = createContext({ userId: null, email: '', nome: '', tipo: 'assessoria', quartelId: null, sair: async () => {} });
export function useAuthContext() {
  return useContext(AuthContext);
}

// Login é exigido pro site inteiro agora (ver AuthGate.jsx) — cada pessoa só vê o que o papel
// dela libera: "militar" só vê o próprio quartel, "assessoria" vê todos (ver RLS em
// supabase/schema.sql). `aprovado` já nasce true pra toda conta nova (acesso na hora, sem
// espera) — só fica false se alguém da assessoria revogar depois pela aba Acesso restrito →
// Acessos (e nesse caso dá pra reaprovar ali mesmo).
export function useAuth() {
  const [state, setState] = useState({ loading: true, session: null, aprovado: false, nome: '', tipo: null, quartelId: null });

  const carregarAprovacao = useCallback(async (session) => {
    if (!session) { setState({ loading: false, session: null, aprovado: false, nome: '', tipo: null, quartelId: null }); return; }
    const { data, error } = await supabase.from('usuarios_aprovados').select('aprovado, nome, tipo, quartel_id').eq('user_id', session.user.id).maybeSingle();
    if (error) console.warn('[auth] falha ao checar aprovação:', error.message);
    const aprovado = !!data?.aprovado;
    setState({ loading: false, session, aprovado, nome: data?.nome || '', tipo: data?.tipo || null, quartelId: data?.quartel_id || null });

    // Avisa o administrador por e-mail — só uma vez por pessoa pendente neste navegador,
    // pra não mandar o mesmo aviso de novo a cada vez que a pessoa recarrega a página
    // esperando ser aprovada.
    if (!aprovado) {
      const chave = `painel-captacao:acesso-notificado:${session.user.id}`;
      if (!localStorage.getItem(chave)) {
        localStorage.setItem(chave, '1');
        notificarPedidoAcesso(session.user.email);
      }
    }
  }, []);

  useEffect(() => {
    if (!supabaseConfigurado) { setState({ loading: false, session: null, aprovado: false }); return; }
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => { if (!cancelled) carregarAprovacao(data.session); });
    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, session) => {
      carregarAprovacao(session);
    });
    return () => { cancelled = true; assinatura.subscription.unsubscribe(); };
  }, [carregarAprovacao]);

  const entrarComSenha = useCallback(async (email, senha) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) throw new Error(error.message);
  }, []);

  // `dados` carrega nome/tipo/quartelId escolhidos na tela de criar conta — o gatilho
  // lidar_com_novo_usuario() (supabase/schema.sql) lê isso de raw_user_meta_data pra já criar a
  // linha em usuarios_aprovados com o papel certo, antes mesmo da aprovação.
  const criarContaComSenha = useCallback(async (email, senha, dados = {}) => {
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome: dados.nome || '', tipo: dados.tipo || 'militar', quartel_id: dados.quartelId || null } },
    });
    if (error) throw new Error(error.message);
  }, []);

  const sair = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { ...state, entrarComSenha, criarContaComSenha, sair };
}
