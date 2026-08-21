#!/usr/bin/env node
// Consulta a situação atual de cada proposição em public/data/acompanhamento-legislativo.json
// nas APIs abertas da Câmara e do Senado, compara com a "ultimaMovimentacao" já registrada e,
// quando muda, atualiza o JSON — o painel lê esse campo (via nacionalToProjeto em store.jsx)
// e mostra a movimentação sem precisar de edição manual. Quando há novidade, também dispara um
// aviso de WhatsApp via CallMeBot (serviço gratuito, sem conta empresarial — ver README).
//
// ⚠️ Mesma ressalva de fetch-votacoes.js: este ambiente de sandbox não tem acesso de rede real
// a dadosabertos.camara.leg.br nem legis.senado.leg.br (confirmado por testes diretos este
// projeto inteiro) — o endpoint da Câmara segue o Swagger oficial documentado
// (https://dadosabertos.camara.leg.br/swagger/api.html) e foi revisado com atenção, mas o do
// Senado é best-effort até a primeira execução real no GitHub Actions confirmar o formato da
// resposta. Falhas em qualquer proposição individual são só avisadas (warn) — nunca derrubam
// o script inteiro, e a proposição simplesmente fica sem atualização naquela rodada.
//
// Uso:
//   node scripts/fetch-tramitacoes.js
//   CALLMEBOT_PHONE=5562999999999 CALLMEBOT_APIKEY=123456 node scripts/fetch-tramitacoes.js

import { readFileSync } from 'node:fs';
import { getJson } from './lib/http.js';
import { writeJson } from './lib/checkpoint.js';

const CAMARA_BASE = 'https://dadosabertos.camara.leg.br/api/v2';
const SENADO_BASE = 'https://legis.senado.leg.br/dadosabertos';
const PATH = 'public/data/acompanhamento-legislativo.json';

const CALLMEBOT_PHONE = process.env.CALLMEBOT_PHONE;
const CALLMEBOT_APIKEY = process.env.CALLMEBOT_APIKEY;

function parseNumeroAno(numero) {
  const [num, ano] = String(numero).split('/');
  return { num: num.replace(/\./g, ''), ano };
}

async function statusCamara(tipo, numero) {
  const { num, ano } = parseNumeroAno(numero);
  const busca = await getJson(`${CAMARA_BASE}/proposicoes?siglaTipo=${encodeURIComponent(tipo)}&numero=${num}&ano=${ano}`);
  const achado = busca?.dados?.[0];
  if (!achado) return null;
  const detalhe = await getJson(`${CAMARA_BASE}/proposicoes/${achado.id}`);
  const st = detalhe?.dados?.statusProposicao;
  if (!st?.dataHora) return null;
  return {
    casaAtual: 'Câmara dos Deputados',
    link: `https://www.camara.leg.br/propostas-legislativas/${achado.id}`,
    ultimaMovimentacao: {
      data: st.dataHora.slice(0, 10),
      descricao: [st.descricaoTramitacao, st.descricaoSituacao].filter(Boolean).join(' — ') || st.despacho || 'Sem descrição informada.',
    },
  };
}

async function statusSenado(tipo, numero) {
  const { num, ano } = parseNumeroAno(numero);
  // ⚠️ endpoint/estrutura de resposta não verificados com rede real — conferir na primeira
  // execução via GitHub Actions e ajustar os caminhos abaixo se a chave real for diferente.
  const busca = await getJson(`${SENADO_BASE}/materia/pesquisa/lista?sigla=${encodeURIComponent(tipo)}&numero=${num}&ano=${ano}`);
  const materias = busca?.PesquisaBasicaMateria?.Materias?.Materia;
  const item = Array.isArray(materias) ? materias[0] : materias;
  const codigo = item?.IdentificacaoMateria?.CodigoMateria;
  if (!codigo) return null;
  const detalhe = await getJson(`${SENADO_BASE}/materia/${codigo}`);
  const autuacao = detalhe?.DetalheMateria?.Materia?.SituacaoAtual?.Autuacoes?.Autuacao;
  const situ = Array.isArray(autuacao) ? autuacao[0]?.Situacao : autuacao?.Situacao;
  if (!situ?.DataSituacao) return null;
  return {
    casaAtual: 'Senado Federal',
    link: `https://www25.senado.leg.br/web/atividade/materias/-/materia/${codigo}`,
    ultimaMovimentacao: { data: situ.DataSituacao, descricao: situ.DescricaoSituacao || 'Sem descrição informada.' },
  };
}

// Câmara e Senado numeram proposições de forma independente — "PL 1451/2023" pode existir,
// sem nenhuma relação, nos dois. Tentar as duas casas às cegas já causou um caso real: uma
// proposição sabidamente no Senado teve os dados substituídos pelos de um PL homônimo e
// completamente diferente da Câmara. Por isso, quando já sabemos a casa atual (todo item do
// acompanhamento tem esse campo), consultamos só ela — nunca a outra como fallback "porque
// sim". Só tenta as duas quando a casa é realmente desconhecida (nenhum item hoje cai aqui).
async function statusDe(tipo, numero, casaConhecida) {
  const tentarCamara = !casaConhecida || casaConhecida.includes('Câmara');
  const tentarSenado = !casaConhecida || casaConhecida.includes('Senado');
  if (tentarCamara) {
    try {
      const c = await statusCamara(tipo, numero);
      if (c) return c;
    } catch (err) {
      console.warn(`[camara] ${tipo} ${numero}: ${err.message}`);
    }
  }
  if (tentarSenado) {
    try {
      const s = await statusSenado(tipo, numero);
      if (s) return s;
    } catch (err) {
      console.warn(`[senado] ${tipo} ${numero}: ${err.message}`);
    }
  }
  return null;
}

async function notificarWhatsApp(mensagem) {
  if (!CALLMEBOT_PHONE || !CALLMEBOT_APIKEY) {
    console.log('[whatsapp] CALLMEBOT_PHONE/CALLMEBOT_APIKEY não configurados — pulando notificação (só atualiza o painel).');
    return;
  }
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(CALLMEBOT_PHONE)}&text=${encodeURIComponent(mensagem)}&apikey=${encodeURIComponent(CALLMEBOT_APIKEY)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) console.warn(`[whatsapp] falha ao notificar: HTTP ${res.status}`);
    else console.log('[whatsapp] notificação enviada.');
  } catch (err) {
    console.warn(`[whatsapp] falha ao notificar: ${err.message}`);
  }
}

async function main() {
  const data = JSON.parse(readFileSync(PATH, 'utf-8'));
  const novidades = [];

  for (const p of data.proposicoes) {
    if (p.encerrada) continue; // já virou lei/foi arquivado — não muda mais
    const atual = await statusDe(p.tipo, p.numero, p.casaAtual);
    if (!atual) {
      console.warn(`[tramitacoes] ${p.tipo} ${p.numero}: não encontrada em nenhuma das duas casas nesta rodada.`);
      continue;
    }
    const mudou = atual.ultimaMovimentacao.descricao !== p.ultimaMovimentacao?.descricao || atual.ultimaMovimentacao.data !== p.ultimaMovimentacao?.data;
    if (mudou) {
      novidades.push({ tipo: p.tipo, numero: p.numero, assunto: p.assunto, ...atual.ultimaMovimentacao });
      p.ultimaMovimentacao = atual.ultimaMovimentacao;
      p.casaAtual = atual.casaAtual;
      p.link = atual.link || p.link;
      p.situacao = atual.ultimaMovimentacao.descricao;
    }
  }

  if (novidades.length > 0) {
    data.atualizacoesRecentes = [
      ...novidades.map((n) => ({ proposicao: `${n.tipo} ${n.numero}`, data: n.data, fato: n.descricao })),
      ...(data.atualizacoesRecentes || []),
    ].slice(0, 20);
    writeJson(PATH, data);

    const resumo = novidades.map((n) => `• ${n.tipo} ${n.numero}: ${n.descricao}`).join('\n');
    await notificarWhatsApp(`📋 Movimentação em projetos monitorados (CBM-GO):\n\n${resumo}`);
    console.log(`[fetch-tramitacoes] ${novidades.length} movimentação(ões) nova(s) detectada(s) e gravada(s) em ${PATH}.`);
  } else {
    console.log('[fetch-tramitacoes] nenhuma movimentação nova desde a última checagem.');
  }
}

main().catch((err) => {
  console.error('[fetch-tramitacoes] falhou:', err);
  process.exit(1);
});
