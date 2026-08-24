#!/usr/bin/env node
// Agenda legislativa semanal (CBM-GO): dois avisos por WhatsApp num único envio —
//  1) a pauta real da semana na Câmara (sessões de plenário/comissão), organizada por dia,
//     mostrando qualquer item cujo assunto bata com as palavras-chave de interesse (segurança
//     pública, bombeiros, desastres, militares) OU que já esteja monitorado — não só os já
//     monitorados, pra pegar também comissões como a CSPCCO mesmo com projetos novos;
//  2) projetos NOVOS (ainda não monitorados) que a Câmara filtra pelas mesmas palavras-chave,
//     apresentados nos últimos 7 dias — pra você decidir manualmente quais adicionar ao
//     acompanhamento; este script nunca adiciona nada sozinho.
//
// Roda sempre (domingo à noite e toda manhã, ver .github/workflows/agenda-legislativa.yml) e
// sempre manda a mensagem, mesmo sem nada de novo — é um resumo periódico, não um alerta de
// mudança (esse é o fetch-tramitacoes.js).
//
// ⚠️ A pauta do Senado (pautaSenadoDaSemana) usa um endpoint cujo formato de resposta nunca foi
// confirmado com uma execução real — o mesmo aconteceu com a checagem de tramitação do Senado
// (fetch-tramitacoes.js) e o "formato documentado" acabou nem batendo com a resposta de verdade.
// Por isso ela sempre loga a resposta bruta, além de tentar um parsing best-effort: se o
// palpite de formato estiver errado, a lista fica vazia por enquanto e o log é o que permite
// corrigir de verdade na próxima rodada, sem chutar de novo às cegas.
//
// Uso:
//   node scripts/fetch-agenda.js
//   CALLMEBOT_PHONE=... CALLMEBOT_APIKEY=... node scripts/fetch-agenda.js

import { readFileSync } from 'node:fs';
import { getJson, mapWithConcurrency } from './lib/http.js';
import { notificarWhatsApp } from './lib/callmebot.js';

const CAMARA_BASE = 'https://dadosabertos.camara.leg.br/api/v2';
const SENADO_BASE = 'https://legis.senado.leg.br/dadosabertos';
const PATH = 'public/data/acompanhamento-legislativo.json';
// Cobre os eixos que o CBM-GO acompanha (bombeiros, polícia militar, militares estaduais,
// segurança pública/defesa civil em geral) evitando termos soltos demais como só "militar" ou
// só "polícia", que trariam ruído de assuntos sem relação (Forças Armadas federais etc.).
// Polícia civil fica de fora — não é o foco do acompanhamento.
const PALAVRAS_CHAVE = [
  'segurança pública',
  'bombeiro',
  'corpo de bombeiros',
  'bombeiro militar',
  'polícia militar',
  'policial militar',
  'militares estaduais',
  'defesa civil',
  'desastre',
  'catástrofe',
  'calamidade',
  'emergência',
];
const MAX_ITENS_POR_SECAO = 10;

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}
function maisDias(base, dias) {
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
function fmtHora(iso) {
  const hora = (iso || '').split('T')[1];
  return hora ? hora.slice(0, 5) : '';
}
function fmtDiaCurto(diaISO) {
  const [, mes, dia] = diaISO.split('-');
  return `${dia}/${mes}`;
}
function nomeDiaSemana(diaISO) {
  const nome = new Date(`${diaISO}T00:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' });
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}
function bateComPalavraChave(texto) {
  const t = (texto || '').toLowerCase();
  return PALAVRAS_CHAVE.some((p) => t.includes(p));
}

// Busca todas as sessões/reuniões da semana na Câmara e, pra cada uma, sua pauta — mostra
// qualquer item cujo assunto bata com as palavras-chave OU que já esteja monitorado (cobre tanto
// comissões inteiras de segurança, tipo a CSPCCO, quanto projetos específicos que já
// acompanhamos em outras comissões). Organiza o resultado por dia.
async function pautaDaSemana(monitorados, dataInicio, dataFim) {
  const idsMonitorados = new Set(monitorados.filter((p) => p.idCamara).map((p) => p.idCamara));

  const eventosResp = await getJson(`${CAMARA_BASE}/eventos?dataInicio=${dataInicio}&dataFim=${dataFim}&itens=100&ordenarPor=dataHoraInicio`);
  const eventos = eventosResp?.dados || [];
  // A primeira execução real veio com 0 eventos e sem nenhum log — sem isso, não dava pra saber
  // se a semana realmente não tem sessão nenhuma ou se a busca em si veio vazia/quebrada.
  console.log(`[agenda] eventos encontrados entre ${dataInicio} e ${dataFim}: ${eventos.length}`);
  if (eventos.length === 0) {
    console.log(`[agenda] resposta bruta de /eventos: ${JSON.stringify(eventosResp).slice(0, 1000)}`);
  }

  // Uma semana pode ter dezenas de eventos (plenário + várias comissões) — busca as pautas
  // com concorrência limitada em vez de uma de cada vez.
  const porEvento = await mapWithConcurrency(eventos, 4, async (evento) => {
    try {
      const pautaResp = await getJson(`${CAMARA_BASE}/eventos/${evento.id}/pauta`);
      return { evento, itensPauta: pautaResp?.dados || [] };
    } catch (err) {
      console.warn(`[agenda] falha ao ler pauta do evento ${evento.id}: ${err.message}`);
      return { evento, itensPauta: [] };
    }
  });

  // Loga o primeiro item de pauta real que aparecer — os nomes exatos dos campos
  // (proposicao_.ementa, titulo etc.) nunca foram confirmados com uma resposta de verdade.
  let logouExemplo = false;

  const porDia = new Map(); // 'YYYY-MM-DD' -> [{ hora, orgao, itens: [{ rotulo, ementa }] }]
  let totalItensPauta = 0;
  let totalRelevantes = 0;
  for (const { evento, itensPauta } of porEvento) {
    totalItensPauta += itensPauta.length;
    if (!logouExemplo && itensPauta.length > 0) {
      logouExemplo = true;
      console.log(`[agenda] exemplo de item de pauta (evento ${evento.id}): ${JSON.stringify(itensPauta[0]).slice(0, 1500)}`);
    }
    const relevantes = [];
    for (const item of itensPauta) {
      const prop = item.proposicao_ || item.proposicao || null;
      const ementa = prop?.ementa || item.titulo || '';
      const relevante = (prop?.id && idsMonitorados.has(prop.id)) || bateComPalavraChave(ementa);
      if (!relevante) continue;
      const rotulo =
        prop?.siglaTipo && prop?.numero
          ? `${prop.siglaTipo} ${prop.numero}${prop.ano ? `/${prop.ano}` : ''}`
          : (item.titulo || '').split(' - ')[0] || 'Item da pauta';
      relevantes.push({ rotulo, ementa: truncar(ementa, 220) });
    }
    totalRelevantes += relevantes.length;
    if (relevantes.length === 0) continue;
    const dia = (evento.dataHoraInicio || '').slice(0, 10);
    if (!dia) continue;
    if (!porDia.has(dia)) porDia.set(dia, []);
    porDia.get(dia).push({
      hora: fmtHora(evento.dataHoraInicio),
      orgao: evento.orgaos?.[0]?.nome || evento.orgaos?.[0]?.sigla || 'Câmara dos Deputados',
      itens: relevantes,
    });
  }
  console.log(`[agenda] total de itens de pauta na semana: ${totalItensPauta}, relevantes (palavra-chave ou monitorado): ${totalRelevantes}`);
  return porDia;
}

// Busca a agenda do Senado (plenário + comissões) pra mesma janela — ver a ressalva no topo do
// arquivo: o formato de resposta é especulativo, então sempre loga a resposta bruta e nunca
// deixa uma falha de parsing derrubar o script (só volta um Map vazio nesse caso).
async function pautaSenadoDaSemana(monitorados, dataInicio, dataFim) {
  const idsMonitorados = new Set(monitorados.filter((p) => p.idSenado).map((p) => p.idSenado));
  // O primeiro palpite (/agenda/{dataInicio}/{dataFim}, formato de segmento) deu 404 — errado
  // de vez, não só formato diferente. Tenta mais candidatos até um responder 200; loga qual
  // funcionou (ou que nenhum funcionou) pra não precisar chutar de novo depois. Barato agora que
  // getJson não fica reinsistindo em 404 (erro permanente).
  const candidatos = [
    `${SENADO_BASE}/agenda?dataInicio=${dataInicio}&dataFim=${dataFim}`,
    `${SENADO_BASE}/plenario/agenda/${dataInicio}/${dataFim}`,
    `${SENADO_BASE}/agenda/senado/${dataInicio}/${dataFim}`,
  ];
  let resp;
  let urlCerta;
  for (const url of candidatos) {
    try {
      resp = await getJson(url, { retries: 1 });
      urlCerta = url;
      break;
    } catch (err) {
      console.warn(`[agenda] agenda do Senado — ${url} falhou: ${err.message}`);
    }
  }
  if (!urlCerta) {
    throw new Error('nenhum dos candidatos de URL da agenda do Senado respondeu');
  }
  console.log(`[agenda] agenda do Senado respondeu em: ${urlCerta}`);
  console.log(`[agenda] resposta bruta da agenda do Senado (formato ainda não confirmado): ${JSON.stringify(resp).slice(0, 2000)}`);

  try {
    const reunioes = resp?.AgendaReunioes?.Reunioes?.Reuniao || resp?.Reunioes?.Reuniao || resp?.agenda?.reunioes || [];
    const lista = Array.isArray(reunioes) ? reunioes : [reunioes].filter(Boolean);

    const porDia = new Map();
    for (const r of lista) {
      const dataReuniao = r?.Data || r?.data || '';
      const dia = dataReuniao.slice(0, 10);
      if (!dia) continue;
      const orgao = r?.NomeOrgao || r?.Colegiado || r?.nomeOrgao || 'Senado Federal';
      const itensBrutos = r?.Materias?.Materia || r?.Itens?.Item || [];
      const itens = (Array.isArray(itensBrutos) ? itensBrutos : [itensBrutos].filter(Boolean))
        .map((m) => {
          const ementa = m?.Ementa || m?.ementa || '';
          const relevante = (m?.Codigo && idsMonitorados.has(m.Codigo)) || bateComPalavraChave(ementa);
          if (!relevante) return null;
          const rotulo = m?.Sigla && m?.Numero ? `${m.Sigla} ${m.Numero}${m.Ano ? `/${m.Ano}` : ''}` : 'Item da pauta';
          return { rotulo, ementa: truncar(ementa, 220) };
        })
        .filter(Boolean);
      if (itens.length === 0) continue;
      if (!porDia.has(dia)) porDia.set(dia, []);
      porDia.get(dia).push({ hora: r?.Hora || r?.hora || '', orgao, itens });
    }
    return porDia;
  } catch (err) {
    console.warn(`[agenda] resposta da agenda do Senado veio num formato inesperado, ignorando desta vez: ${err.message}`);
    return new Map();
  }
}

function mesclarPorDia(...mapas) {
  const combinado = new Map();
  for (const mapa of mapas) {
    for (const [dia, sessoes] of mapa) {
      if (!combinado.has(dia)) combinado.set(dia, []);
      combinado.get(dia).push(...sessoes);
    }
  }
  return combinado;
}

function formatarPauta(porDia) {
  if (porDia.size === 0) {
    return 'Nenhuma sessão com item de interesse do CBM-GO na Câmara ou no Senado nos próximos 7 dias.';
  }
  const dias = [...porDia.keys()].sort();
  return dias
    .map((dia) => {
      const sessoes = [...porDia.get(dia)].sort((a, b) => a.hora.localeCompare(b.hora));
      const blocoSessoes = sessoes
        .map((s) => {
          const cabecalho = s.hora ? `${s.hora} — ${s.orgao}` : s.orgao;
          const itens = s.itens.map((i) => `-${i.rotulo} — ${i.ementa}`).join('\n');
          return `${cabecalho}\n${itens}`;
        })
        .join('\n');
      return `📍${fmtDiaCurto(dia)} (${nomeDiaSemana(dia)})\n${blocoSessoes}`;
    })
    .join('\n\n');
}

// Descobre projetos NOVOS relacionados aos temas de interesse, apresentados recentemente e
// ainda fora do acompanhamento — vira sugestão pro usuário revisar e adicionar manualmente.
// Busca os termos com concorrência limitada (não em série) — com 15 termos, um por vez
// deixaria o script bem mais lento à toa.
async function projetosNovosPorTema(monitorados, dataInicio) {
  const jaMonitorados = new Set(monitorados.map((p) => `${p.tipo}-${p.numero}`));
  let falhas = 0;
  const porTermo = await mapWithConcurrency(PALAVRAS_CHAVE, 4, async (termo) => {
    try {
      const resp = await getJson(
        `${CAMARA_BASE}/proposicoes?keywords=${encodeURIComponent(termo)}&dataApresentacaoInicio=${dataInicio}&itens=20&ordem=DESC&ordenarPor=id`
      );
      return resp?.dados || [];
    } catch (err) {
      console.warn(`[agenda] falha na busca por "${termo}": ${err.message}`);
      falhas += 1;
      return [];
    }
  });
  // Se TODAS as buscas falharam, a lista vazia resultante não significa "nada encontrado" — significa
  // que a checagem nem rodou de verdade (ex.: Câmara fora do ar). Sinaliza como falha pra não passar
  // uma lista vazia por resultado real (ver camaraFalhouNovos em main()).
  if (falhas === PALAVRAS_CHAVE.length) {
    throw new Error(`todas as ${falhas} buscas por palavra-chave falharam`);
  }

  const candidatos = [];
  for (const dados of porTermo) {
    for (const p of dados) {
      const chave = `${p.siglaTipo}-${p.numero}/${p.ano}`;
      if (jaMonitorados.has(chave) || candidatos.some((c) => c.chave === chave)) continue;
      candidatos.push({ chave, tipo: p.siglaTipo, numero: `${p.numero}/${p.ano}`, ementa: (p.ementa || '').trim() });
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

  let camaraFalhou = false;
  let senadoFalhou = false;
  let novosFalhou = false;
  const [porDiaCamara, porDiaSenado, novos] = await Promise.all([
    pautaDaSemana(monitorados, inicio, fim).catch((err) => {
      console.warn(`[agenda] falha ao checar pauta da Câmara: ${err.message}`);
      camaraFalhou = true;
      return new Map();
    }),
    pautaSenadoDaSemana(monitorados, inicio, fim).catch((err) => {
      console.warn(`[agenda] falha ao checar pauta do Senado: ${err.message}`);
      senadoFalhou = true;
      return new Map();
    }),
    projetosNovosPorTema(monitorados, inicioMenos7).catch((err) => {
      console.warn(`[agenda] falha ao buscar projetos novos: ${err.message}`);
      novosFalhou = true;
      return [];
    }),
  ]);
  const porDia = mesclarPorDia(porDiaCamara, porDiaSenado);

  const linhasNovos = novos.length
    ? novos.map((c) => `• ${c.tipo} ${c.numero} — ${truncar(c.ementa, 180)}`).join('\n')
    : novosFalhou
      ? '(busca falhou, ver abaixo)'
      : 'Nenhum projeto novo encontrado com os termos monitorados na última semana.';

  // Uma checagem que falhou não pode virar "nada encontrado" na mensagem — quem lê precisa saber
  // que o resultado pode estar incompleto, não que está tudo limpo.
  const falhas = [];
  if (camaraFalhou) falhas.push('Câmara (pauta da semana)');
  if (senadoFalhou) falhas.push('Senado (pauta da semana)');
  if (novosFalhou) falhas.push('Câmara (busca de projetos novos)');
  const avisoFalha = falhas.length
    ? `⚠️ Checagem incompleta — falhou ao consultar: ${falhas.join(', ')}. O que aparece abaixo pode estar faltando itens.`
    : '';

  const mensagem = [
    `📅 Agenda legislativa (CBM-GO) — ${inicio} a ${fim}`,
    ...(avisoFalha ? ['', avisoFalha] : []),
    '',
    formatarPauta(porDia),
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
