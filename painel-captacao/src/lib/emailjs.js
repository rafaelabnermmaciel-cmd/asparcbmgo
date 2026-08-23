import { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, EMAIL_NOTIFICACAO_PARA } from './emailjs-config.js';

export const emailjsConfigurado = ![EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY].some((v) => v.startsWith('COLE_AQUI'));

function fmtR(v) {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

// Manda a notificação direto do navegador pra API do EmailJS — sem servidor no meio (mesmo
// modelo do Supabase: uma chave pública, protegida pelas "Allowed origins" da conta, não por
// sigilo). Nunca lança erro: se o e-mail falhar, a captação já está salva no Supabase de
// qualquer forma — só avisa no console pra não confundir quem cadastrou com uma falha real.
export async function notificarNovaCaptacao(registro) {
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
          quartel: registro.quartelNome,
          municipio: registro.municipio || '—',
          parlamentar: registro.parlamentarNome,
          responsavel: registro.responsavel,
          stakeholder: registro.stakeholder || '—',
          objeto: registro.objeto,
          valor_previsto: fmtR(registro.valorPrevisto),
          num_reunioes: registro.numReunioes || 0,
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
