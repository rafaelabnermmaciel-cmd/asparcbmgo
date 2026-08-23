import { useEffect, useState, useCallback } from 'react';
import { supabase, supabaseConfigurado } from './supabase.js';

// Login só é usado pela aba Gerenciamento (dado sensível de organização interna) — o resto do
// site continua aberto pra quem tiver o link, sem mudança nenhuma. `aprovado` só fica true
// depois que alguém que já tem acesso libera pela própria aba Gerenciamento → Acessos (ver
// supabase/schema.sql, tabela "usuarios_aprovados").
export function useAuth() {
  const [state, setState] = useState({ loading: true, session: null, aprovado: false });

  const carregarAprovacao = useCallback(async (session) => {
    if (!session) { setState({ loading: false, session: null, aprovado: false }); return; }
    const { data, error } = await supabase.from('usuarios_aprovados').select('aprovado').eq('user_id', session.user.id).maybeSingle();
    if (error) console.warn('[auth] falha ao checar aprovação:', error.message);
    setState({ loading: false, session, aprovado: !!data?.aprovado });
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

  const entrarComGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) throw new Error(error.message);
  }, []);

  const sair = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { ...state, entrarComSenha, criarContaComSenha, entrarComGoogle, sair };
}
