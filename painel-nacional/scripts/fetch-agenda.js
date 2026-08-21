#!/usr/bin/env node
// Agenda legislativa semanal (CBM-GO): dois avisos por WhatsApp num único envio —
//  1) quais dos projetos já monitorados (acompanhamento-legislativo.json) estão pautados pra
//     sessão/reunião de comissão na Câmara nos próximos 7 dias;
//  2) projetos NOVOS (ainda não monitorados) que a Câmara filtra pelas palavras-chave de
//     interesse (segurança pública, bombeiros, desastres, militares), apresentados nos
//     últimos 7 dias — pra você decidir manualmente quais adicionar ao acompanhamento; este
//     script nunca adiciona nada sozinho.
//
// Roda sempre (domingo à noite e toda manhã, ver .github/workflows/agenda-legislativa.yml) e
// sempre manda a mensagem, mesmo sem nada de novo — é um resumo periódico, não um alerta de
// mudança (esse é o fetch-tramitacoes.js).
//
// ⚠️ Mesma ressalva dos outros scripts: sem acesso de rede real neste sandbox. O endpoint
// /eventos e /proposicoes (busca por keywords) seguem o Swagger oficial da Câmara e foram
// revisados com atenção; já /eventos/{id}/pauta é best-effort quanto ao nome exato das chaves
// aninhadas (proposicao_ etc.) — confirmar no primeiro log real e ajustar se preciso. Falha em
// qualquer evento individual só é avisada, nunca derruba o script inteiro.
//
// Uso:
//   node scripts/fetch-agenda.js
//   CALLMEBOT_PHONE=... CALLMEBOT_APIKEY=... node scripts/fetch-agenda.js

import { readFileSync } from 'node:fs';
import { getJson } from './lib/http.js';
import { notificarWhatsApp } from './lib/callmebot.js';

const CAMARA_BASE = 'https://dadosabertos.camara.leg.br/api/v2';
const PATH = 'public/data/acompanhamento-legislativo.json';
const PALAVRAS_CHAVE = ['segurança pública', 'bombeiro', 'corpo de bombeiros', 'militar', 'desastre'];
const MAX_ITENS_POR_SECAO = 10;

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}
function maisDias(base, dias) {
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
function fmtDataHora(iso) {
  if (!iso) return '';
  const [data, hora] = iso.split('T');
  const [ano, mes, dia] = data.split('-');
  return hora ? `${dia}/${mes} às ${hora.slice(0, 5)}` : `${dia}/${mes}`;
}

// Busca todas as sessões/reuniões da semana e, pra cada uma, sua pauta — cruza com os
// projetos monitorados (por idCamara, já resolvido e gravado por fetch-tramitacoes.js).
async function projetosPautados(monitorados, dataInicio, dataFim) {
  const idsMonitorados = new Map(monitorados.filter((p) => p.idCamara).map((p) => [p.idCamara, p]));
  if (idsMonitorados.size === 0) return [];

  const eventosResp = await getJson(`${CAMARA_BASE}/eventos?dataInicio=${dataInicio}&dataFim=${dataFim}&itens=100&ordenarPor=dataHoraInicio`);
  const eventos = eventosResp?.dados || [];
  const encontrados = [];

  for (const evento of eventos) {
    try {
      const pautaResp = await getJson(`${CAMARA_BASE}/eventos/${evento.id}/pauta`);
      const itensPauta = pautaResp?.dados || [];
      for (const item of itensPauta) {
        const prop = item.proposicao_ || item.proposicao || null;
        if (!prop?.id) continue;
        const monitorado = idsMonitorados.get(prop.id);
        if (!monitorado) continue;
        encontrados.push({
          tipo: monitorado.tipo,
          numero: monitorado.numero,
          orgao: evento.orgaos?.[0]?.nome || evento.orgaos?.[0]?.sigla || 'Câmara dos Deputados',
          quando: fmtDataHora(evento.dataHoraInicio),
        });
      }
    } catch (err) {
      console.warn(`[agenda] falha ao ler pauta do evento ${evento.id}: ${err.message}`);
    }
  }
  return encontrados;
}

// Descobre projetos NOVOS relacionados aos temas de interesse, apresentados recentemente e
// ainda fora do acompanhamento — vira sugestão pro usuário revisar e adicionar manualmente.
async function projetosNovosPorTema(monitorados, dataInicio) {
  const jaMonitorados = new Set(monitorados.map((p) => `${p.tipo}-${p.numero}`));
  const candidatos = [];
  for (const termo of PALAVRAS_CHAVE) {
    try {
      const resp = await getJson(
        `${CAMARA_BASE}/proposicoes?keywords=${encodeURIComponent(termo)}&dataApresentacaoInicio=${dataInicio}&itens=20&ordem=DESC&ordenarPor=id`
      );
      for (const p of resp?.dados || []) {
        const chave = `${p.siglaTipo}-${p.numero}/${p.ano}`;
        if (jaMonitorados.has(chave) || candidatos.some((c) => c.chave === chave)) continue;
        candidatos.push({ chave, tipo: p.siglaTipo, numero: `${p.numero}/${p.ano}`, ementa: (p.ementa || '').trim() });
      }
    } catch (err) {
      console.warn(`[agenda] falha na busca por "${termo}": ${err.message}`);
    }
  }
  return candidatos.slice(0, MAX_ITENS_POR_SECAO);
}

function truncar(texto, max) {
  if (!texto) return '';
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;
}

async function main() {
  const data = JSON.parse(readFileSync(PATH, 'utf-8'));
  const monitorados = (data.proposicoes || []).filter((p) => !p.encerrada);
  const inicio = hojeISO();
  const fim = maisDias(inicio, 7);
  const inicioMenos7 = maisDias(inicio, -7);

  const [pautados, novos] = await Promise.all([
    projetosPautados(monitorados, inicio, fim).catch((err) => {
      console.warn(`[agenda] falha ao checar pauta: ${err.message}`);
      return [];
    }),
    projetosNovosPorTema(monitorados, inicioMenos7).catch((err) => {
      console.warn(`[agenda] falha ao buscar projetos novos: ${err.message}`);
      return [];
    }),
  ]);

  const linhasPauta = pautados.length
    ? pautados.slice(0, MAX_ITENS_POR_SECAO).map((p) => `• ${p.tipo} ${p.numero} — ${p.orgao}, ${p.quando}`).join('\n')
    : 'Nenhum projeto monitorado está pautado nos próximos 7 dias.';

  const linhasNovos = novos.length
    ? novos.map((c) => `• ${c.tipo} ${c.numero} — ${truncar(c.ementa, 110)}`).join('\n')
    : 'Nenhum projeto novo encontrado com os termos monitorados na última semana.';

  const mensagem = [
    `📅 Agenda legislativa (CBM-GO) — ${inicio} a ${fim}`,
    '',
    '🗓️ Projetos monitorados em pauta (Câmara — Senado ainda não coberto):',
    linhasPauta,
    '',
    '🔎 Possíveis projetos novos (segurança pública / bombeiros / desastres / militares) — revisar e adicionar manualmente:',
    linhasNovos,
  ].join('\n');

  console.log(mensagem);
  await notificarWhatsApp(mensagem);
}

main().catch((err) => {
  console.error('[fetch-agenda] falhou:', err);
  process.exit(1);
});
