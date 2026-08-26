import { useEffect, useState, useCallback } from 'react';
import { supabase, supabaseConfigurado } from './supabase.js';
import { notificarPedidoAcesso } from './emailjs.js';

// Login só é usado pela aba Acesso restrito (dado sensível de organização interna) — o resto do
// site continua aberto pra quem tiver o link, sem mudança nenhuma. `aprovado` só fica true
// pro e-mail do administrador (liberado sozinho, ver o gatilho em supabase/schema.sql) ou
// depois que o administrador libera alguém pela própria aba Acesso restrito → Acessos.
export function useAuth() {
  const [state, setState] = useState({ loading: true, session: null, aprovado: false, recuperacao: false });

  const carregarAprovacao = useCallback(async (session, recuperacao = false) => {
    if (!session) { setState({ loading: false, session: null, aprovado: false, recuperacao: false }); return; }
    const { data, error } = await supabase.from('usuarios_aprovados').select('aprovado').eq('user_id', session.user.id).maybeSingle();
    if (error) console.warn('[auth] falha ao checar aprovação:', error.message);
    const aprovado = !!data?.aprovado;
    setState({ loading: false, session, aprovado, recuperacao });

    // Avisa o administrador por e-mail — só uma vez por pessoa pendente neste navegador,
    // pra não mandar o mesmo aviso de novo a cada vez que a pessoa recarrega a página
    // esperando ser aprovada.
    if (!aprovado && !recuperacao) {
      const chave = `painel-captacao:acesso-notificado:${session.user.id}`;
      if (!localStorage.getItem(chave)) {
        localStorage.setItem(chave, '1');
        notificarPedidoAcesso(session.user.email);
      }
    }
  }, []);

  useEffect(() => {
    if (!supabaseConfigurado) { setState({ loading: false, session: null, aprovado: false, recuperacao: false }); return; }
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => { if (!cancelled) carregarAprovacao(data.session); });
    // O Supabase manda o evento "PASSWORD_RECOVERY" quando a pessoa clica no link de
    // redefinição de senha (recebido por e-mail) — nesse caso mostramos a tela de "escolher
    // nova senha" (ver RedefinirSenha em AcessoGerenciamento.jsx) em vez do login normal.
    const { data: assinatura } = supabase.auth.onAuthStateChange((evento, session) => {
      carregarAprovacao(session, evento === 'PASSWORD_RECOVERY');
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

  // Manda o e-mail de "esqueci minha senha" — o link volta pro próprio site (mesma URL
  // configurada em Authentication → URL Configuration → Site URL no Supabase) e dispara o
  // evento "PASSWORD_RECOVERY" acima, que mostra a tela de trocar a senha.
  const enviarRecuperacaoSenha = useCallback(async (email) => {
    const volta = `${window.location.origin}${import.meta.env.BASE_URL}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: volta });
    if (error) throw new Error(error.message);
  }, []);

  // Só funciona durante a sessão temporária de recuperação (depois de clicar no link do
  // e-mail) — troca a senha e volta pro fluxo normal (login já entra com a senha nova).
  const atualizarSenha = useCallback(async (novaSenha) => {
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) throw new Error(error.message);
    setState((prev) => ({ ...prev, recuperacao: false }));
  }, []);

  return { ...state, entrarComSenha, criarContaComSenha, sair, enviarRecuperacaoSenha, atualizarSenha };
}
