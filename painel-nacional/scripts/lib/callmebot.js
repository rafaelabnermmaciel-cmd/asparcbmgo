// Envio de WhatsApp via CallMeBot (serviço gratuito, sem conta empresarial). Compartilhado
// entre todos os scripts de aviso — ver README pra ativação (mandar a mensagem de autorização
// pro número do bot uma vez, guardar CALLMEBOT_PHONE/CALLMEBOT_APIKEY como secrets do repo).
const CALLMEBOT_PHONE = process.env.CALLMEBOT_PHONE;
const CALLMEBOT_APIKEY = process.env.CALLMEBOT_APIKEY;

export async function notificarWhatsApp(mensagem) {
  if (!CALLMEBOT_PHONE || !CALLMEBOT_APIKEY) {
    console.log('[whatsapp] CALLMEBOT_PHONE/CALLMEBOT_APIKEY não configurados — pulando notificação.');
    return;
  }
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(CALLMEBOT_PHONE)}&text=${encodeURIComponent(mensagem)}&apikey=${encodeURIComponent(CALLMEBOT_APIKEY)}`;
  try {
    const res = await fetch(url);
    // O CallMeBot costuma responder HTTP 200 mesmo quando dá erro (chave inválida, número
    // não confirmado, limite diário etc.) — o motivo real vem só no corpo da resposta, então
    // status 200 sozinho não prova que a mensagem chegou. Sempre logamos o corpo pra dar pra
    // diagnosticar; só tratamos como sucesso quando o texto confirma envio.
    const corpo = await res.text();
    const enviouDeVerdade = res.ok && /message queued|message.*sent/i.test(corpo);
    if (enviouDeVerdade) {
      console.log('[whatsapp] notificação enviada. Resposta do CallMeBot:', corpo.trim());
    } else {
      console.warn(`[whatsapp] CallMeBot não confirmou o envio (HTTP ${res.status}). Resposta:`, corpo.trim());
    }
    return enviouDeVerdade;
  } catch (err) {
    console.warn(`[whatsapp] falha ao notificar: ${err.message}`);
    return false;
  }
}
