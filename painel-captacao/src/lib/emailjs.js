import { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_TEMPLATE_ID_ACESSO, EMAILJS_PUBLIC_KEY, EMAIL_NOTIFICACAO_PARA } from './emailjs-config.js';

export const emailjsConfigurado = ![EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY].some((v) => v.startsWith('COLE_AQUI'));
export const emailjsAcessoConfigurado = ![EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_ACESSO, EMAILJS_PUBLIC_KEY].some((v) => v.startsWith('COLE_AQUI'));

function fmtR(v) {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

// Manda a notificação direto do navegador pra API do EmailJS — sem servidor no meio (mesmo
// modelo do Supabase: uma chave pública, protegida pelas "Allowed origins" da conta, não por
// sigilo). Nunca lança erro: se o e-mail falhar, a captação já está salva/editada/excluída no
// Supabase de qualquer forma — só avisa no console pra não confundir quem mexeu com uma falha
// real. `acao` é "cadastrada" | "editada" | "excluída" — vira a variável {{acao}} no template.
export async function notificarCaptacao(registro, acao) {
  if (!emailjsConfigurado) {
    console.warn('[emailjs] não configurado ainda — ver SETUP.md ("Notificação por e-mail"). Pulando notificação.');
    return;
  }
  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: EMAIL_NOTIFICACAO_PARA,
          acao,
          quartel: registro.quartelNome,
          municipio: registro.municipio || '—',
          parlamentar: registro.parlamentarNome,
          responsavel: registro.responsavel,
          stakeholder: registro.stakeholder || '—',
          objeto: registro.objeto,
          valor_previsto: fmtR(registro.valorPrevisto),
          status: registro.status,
          observacoes: registro.observacoes || '—',
        },
      }),
    });
    if (!res.ok) console.warn('[emailjs] falha ao enviar notificação:', res.status, await res.text().catch(() => ''));
  } catch (err) {
    console.warn('[emailjs] falha ao enviar notificação:', err.message);
  }
}

// Avisa o administrador quando alguém pede acesso ao Acesso restrito pela primeira vez (fica
// esperando aprovação em Acesso restrito → Acessos). Usa um template separado do de captações
// (variáveis diferentes) — ver EMAILJS_TEMPLATE_ID_ACESSO em emailjs-config.js. Também nunca
// lança erro: falha de e-mail não pode travar o login de ninguém.
export async function notificarPedidoAcesso(emailSolicitante) {
  if (!emailjsAcessoConfigurado) {
    console.warn('[emailjs] template de pedido de acesso não configurado ainda — ver SETUP.md ("Login e aprovação de acesso"). Pulando notificação.');
    return;
  }
  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID_ACESSO,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: EMAIL_NOTIFICACAO_PARA,
          email_solicitante: emailSolicitante,
        },
      }),
    });
    if (!res.ok) console.warn('[emailjs] falha ao enviar notificação de acesso:', res.status, await res.text().catch(() => ''));
  } catch (err) {
    console.warn('[emailjs] falha ao enviar notificação de acesso:', err.message);
  }
}

// Avisa o administrador quando alguém pede pra redefinir a senha esquecida (fica aguardando
// aprovação em Acesso restrito → Acessos → "Pedidos de redefinição de senha"). Reaproveita o
// mesmo template do pedido de acesso (mesmas variáveis) — marca o e-mail pra não confundir
// com pedido de conta nova.
export async function notificarPedidoSenha(email) {
  if (!emailjsAcessoConfigurado) {
    console.warn('[emailjs] template de pedido de acesso não configurado ainda — pulando notificação de redefinição de senha.');
    return;
  }
  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID_ACESSO,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: EMAIL_NOTIFICACAO_PARA,
          email_solicitante: `[esqueceu a senha] ${email}`,
        },
      }),
    });
    if (!res.ok) console.warn('[emailjs] falha ao enviar notificação de redefinição de senha:', res.status, await res.text().catch(() => ''));
  } catch (err) {
    console.warn('[emailjs] falha ao enviar notificação de redefinição de senha:', err.message);
  }
}
