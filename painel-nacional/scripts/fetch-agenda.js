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
// A pauta do Senado (pautaSenadoDaSemana) via /dadosabertos/agenda nunca respondeu — 4 formatos
// de URL testados, todos 404 (endpoint descontinuado de vez, não só mudou de formato). A fonte
// real agora é a página pública congressonacional.leg.br/sessoes/agenda-do-congresso-senado-e-
// camara (sugestão do usuário): ela tem um calendário mensal pronto no HTML com um link por dia
// (/-/agenda/YYYY-MM-DD), e cada página de dia lista as sessões de verdade (hora, órgão, título,
// descrição) num formato HTML confirmado com uma execução real — ver extrairSessoesDoDia.
//
// Uso:
//   node scripts/fetch-agenda.js
//   CALLMEBOT_PHONE=... CALLMEBOT_APIKEY=... node scripts/fetch-agenda.js

import { readFileSync } from 'node:fs';
import { getJson, getText, mapWithConcurrency } from './lib/http.js';
import { notificarWhatsApp } from './lib/callmebot.js';

const CAMARA_BASE = 'https://dadosabertos.camara.leg.br/api/v2';
const CONGRESSO_URL = 'https://www.congressonacional.leg.br/sessoes/agenda-do-congresso-senado-e-camara';
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
// Domingo da semana que contém diaISO — janela fixa domingo–sábado, não "hoje + 7 dias corridos".
// Rodando todo dia às 8h, uma janela rolante (hoje+7) ia empurrando o fim pra dentro da semana
// seguinte a cada dia que passava (ex: rodando numa terça, já incluía o domingo seguinte) —
// confirmado pelo usuário recebendo pauta do dia 1º/set numa semana que ia até 29/ago. Com a
// semana fixa, o domingo à noite (quando a janela "vira") já cai no próximo domingo por si só.
function inicioDaSemanaISO(diaISO) {
  const d = new Date(`${diaISO}T00:00:00Z`);
  return maisDias(diaISO, -d.getUTCDay());
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

  // retries: 2 (não o padrão de 4) — visto na prática: quando a Câmara está lenta, ela demora
  // igualmente em TODAS as tentativas (nunca "só uma vez sim"), então retry a mais só multiplica
  // o tempo perdido (chegou a 5+ minutos numa execução) sem melhorar a chance de sucesso.
  const eventosResp = await getJson(
    `${CAMARA_BASE}/eventos?dataInicio=${dataInicio}&dataFim=${dataFim}&itens=100&ordenarPor=dataHoraInicio`,
    { retries: 2 }
  );
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

function textoSemTags(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Cada linha de sessão vem como <div class="cn-agenda-casas-tabela-linha" data-casa="SF|CD|CN">
// com hora, órgão, título (link em negrito), descrição (blockquote) e status — formato confirmado
// com uma execução real (24/08). split() com grupo de captura intercala os "data-casa" capturados
// entre os trechos de HTML, então partes[i] é a casa e partes[i+1] é o conteúdo daquela linha (e
// do que vem depois, mas as regexes abaixo pegam sempre a primeira ocorrência de cada campo,
// que é a da própria linha).
function extrairSessoesDoDia(html) {
  const marcador = html.search(/id=["']main-content["']/i);
  const corpo = marcador >= 0 ? html.slice(marcador) : html;
  // A página de cada dia repete o widget de calendário mensal inteiro antes do conteúdo do dia —
  // pula pro último trecho que ainda menciona "sf-calendario" (fim do widget).
  const fimCalendario = corpo.lastIndexOf('sf-calendario');
  const corpoDia = fimCalendario >= 0 ? corpo.slice(fimCalendario) : corpo;

  const partes = corpoDia.split(/<div class="cn-agenda-casas-tabela-linha" data-casa="([^"]+)">/);
  const linhas = [];
  for (let i = 1; i < partes.length; i += 2) {
    const casa = partes[i];
    const chunk = partes[i + 1] || '';
    const horaMatch = chunk.match(/cn-agenda-casas-hora[^"]*"[^>]*>\s*<span>([\s\S]*?)<\/span>/);
    const hora = horaMatch ? textoSemTags(horaMatch[1]).replace(/\s+/g, '') : '';
    const orgaoMatch = chunk.match(/cn-agenda-casas-orgao[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    const orgao = orgaoMatch ? textoSemTags(orgaoMatch[1]) : '';
    const tituloMatch = chunk.match(/<a[^>]*>\s*<strong>([^<]+)<\/strong>\s*<\/a>/);
    const titulo = tituloMatch ? tituloMatch[1].trim() : '';
    const descMatch = chunk.match(/<blockquote class="cn-agenda-casas-descricao">([^<]*)<\/blockquote>/);
    const descricao = descMatch ? descMatch[1].trim() : '';
    if (!titulo) continue;
    linhas.push({ casa, hora, orgao, titulo, descricao });
  }
  return linhas;
}

// Fonte: página pública congressonacional.leg.br (sugestão do usuário) — ver ressalva no topo do
// arquivo. Cobre Senado Federal (SF) e Congresso Nacional (CN, sessão conjunta); ignora Câmara
// (CD) aqui porque pautaDaSemana() já cobre a Câmara via API própria, e listar dos dois lugares
// duplicaria os mesmos itens na mensagem.
async function pautaSenadoDaSemana(monitorados, dataInicio, dataFim) {
  const html = await getText(CONGRESSO_URL, { retries: 1 });
  const linksDeDia = [...html.matchAll(/href=["'](https:\/\/www\.congressonacional\.leg\.br\/sessoes\/agenda-do-congresso-senado-e-camara\/-\/agenda\/([\d-]+))["']/g)]
    .map((m) => ({ url: m[1], dia: m[2] }))
    .filter((l, idx, arr) => arr.findIndex((x) => x.dia === l.dia) === idx);
  const diasNaJanela = linksDeDia.filter((l) => l.dia >= dataInicio && l.dia <= dataFim);
  if (diasNaJanela.length === 0) {
    throw new Error(`calendário do Congresso não trouxe nenhum dia entre ${dataInicio} e ${dataFim} — página pode ter mudado`);
  }

  const porDia = new Map();
  for (const { url, dia } of diasNaJanela) {
    try {
      const htmlDia = await getText(url, { retries: 1 });
      const sessoes = extrairSessoesDoDia(htmlDia).filter((s) => s.casa === 'SF' || s.casa === 'CN');
      const relevantes = sessoes.filter((s) => bateComPalavraChave(`${s.titulo} ${s.descricao}`));
      if (relevantes.length === 0) continue;
      porDia.set(
        dia,
        relevantes.map((s) => ({
          hora: s.hora,
          orgao: s.casa === 'CN' ? `Congresso Nacional — ${s.orgao || s.titulo}` : `Senado Federal — ${s.orgao || s.titulo}`,
          itens: [{ rotulo: s.titulo, ementa: truncar(s.descricao, 220) }],
        }))
      );
    } catch (err) {
      console.warn(`[agenda] falha ao ler a página do dia ${dia} (congressonacional.leg.br): ${err.message}`);
    }
  }
  return porDia;
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
        `${CAMARA_BASE}/proposicoes?keywords=${encodeURIComponent(termo)}&dataApresentacaoInicio=${dataInicio}&itens=20&ordem=DESC&ordenarPor=id`,
        { retries: 2 }
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
  const hoje = hojeISO();
  const inicio = inicioDaSemanaISO(hoje);
  const fim = maisDias(inicio, 6);
  const inicioMenos7 = maisDias(hoje, -7);

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
  ].join('\n'),

  console.log(mensagem);
  await notificarWhatsApp(mensagem);
}

main().catch((err) => {
  console.error('[fetch-agenda] falhou:', err);
  process.exit(1);
});
