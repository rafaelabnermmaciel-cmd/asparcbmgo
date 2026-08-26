import { useEffect, useState, useCallback } from 'react';
import { supabase, supabaseConfigurado } from './supabase.js';
import { notificarPedidoAcesso } from './emailjs.js';

// Login só é usado pela aba Acesso restrito (dado sensível de organização interna) — o resto do
// site continua aberto pra quem tiver o link, sem mudança nenhuma. `aprovado` só fica true
// pro e-mail do administrador (liberado sozinho, ver o gatilho em supabase/schema.sql) ou
// depois que o administrador libera alguém pela própria aba Acesso restrito → Acessos.
export function useAuth() {
  const [state, setState] = useState({ loading: true, session: null, aprovado: false });

  const carregarAprovacao = useCallback(async (session) => {
    if (!session) { setState({ loading: false, session: null, aprovado: false }); return; }
    const { data, error } = await supabase.from('usuarios_aprovados').select('aprovado').eq('user_id', session.user.id).maybeSingle();
    if (error) console.warn('[auth] falha ao checar aprovação:', error.message);
    const aprovado = !!data?.aprovado;
    setState({ loading: false, session, aprovado });

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

  const criarContaComSenha = useCallback(async (email, senha) => {
    const { error } = await supabase.auth.signUp({ email, password: senha });
    if (error) throw new Error(error.message);
  }, []);

  const sair = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { ...state, entrarComSenha, criarContaComSenha, sair };
}
