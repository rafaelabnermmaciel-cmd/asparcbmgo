// Busca os votos nominais recebidos por cada parlamentar de Goiás na eleição de 2022
// (deputados federais, deputados estaduais da ALEGO e o senador eleito) e grava em
// public/data/votos-go-2022.json, casando por nome com o que já está em
// public/data/parlamentares-go.json.
//
// Fonte dos números: a própria Wikipédia, no artigo "Eleições estaduais em Goiás em
// 2022" — as tabelas de resultado ali são preenchidas a partir do TSE e citam
// diretamente resultados.tse.jus.br como fonte (ver as referências <ref> no wikitext).
//
// Por que não direto do TSE? dadosabertos.tse.jus.br, cdn.tse.jus.br e
// divulgacandcontas.tse.jus.br bloqueiam com 403 (WAF) qualquer requisição vinda de IP
// de nuvem/datacenter (confirmado testando de dentro do GitHub Actions) — só aceitam
// tráfego de IP residencial/nacional. O site de resultados em tempo real
// (resultados.tse.jus.br) não tem essa proteção, mas seu catálogo atual só mantém as
// eleições municipais recentes (2024+), não a eleição geral de 2022 (o pleito de
// deputados/senador). A Wikipédia, sendo um domínio completamente diferente e aberto,
// não tem esse bloqueio e já republica esses números oficiais em tabela.
//
// ⚠️ NUNCA EXECUTADO NESTE AMBIENTE — mesmo motivo dos outros scripts (sandbox sem
// acesso à internet externa). Rode via GitHub Actions ou localmente com internet.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { normalizeName, acharParlamentar } from './lib/nomes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAGINA = 'Eleições estaduais em Goiás em 2022';

async function getWikitext() {
  const url = `https://pt.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(PAGINA)}&prop=wikitext&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'painel-captacao-cbmgo/1.0 (uso interno, sem fins comerciais)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ao buscar a página da Wikipédia`);
  const data = await res.json();
  const wikitext = data?.parse?.wikitext?.['*'];
  if (!wikitext) throw new Error('resposta da Wikipédia sem wikitext — a API pode ter mudado.');
  return wikitext;
}

// Isola o conteúdo de uma seção "== Nome ==" (ou "=== Nome ===" se nivel for '===')
// até o próximo cabeçalho do mesmo nível ou mais raso (menos "="s) — um cabeçalho MAIS
// fundo (ex: "====" dentro de uma seção "===") não conta como fim, senão a extração
// para cedo demais na primeira subseção que aparecer.
function extrairSecao(texto, nomeSecao, nivel = '==') {
  const escapado = nomeSecao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${nivel}+\\s*${escapado}\\s*${nivel}+$`, 'm');
  const m = re.exec(texto);
  if (!m) return null;
  const inicio = m.index + m[0].length;
  const resto = texto.slice(inicio);
  const marcadorFim = resto.search(new RegExp(`^={2,${nivel.length}}(?!=)`, 'm'));
  return marcadorFim === -1 ? resto : resto.slice(0, marcadorFim);
}

// Wikitext de uma célula de tabela vira nome "limpo": tira negrito, resolve
// [[link|texto]] -> texto (ou [[texto]] -> texto), e tira o "(PARTIDO)" do final.
function limparNomeCelula(celula) {
  let s = celula.trim();
  s = s.replace(/'''/g, '');
  s = s.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2');
  s = s.replace(/\[\[([^\]]+)\]\]/g, '$1');
  s = s.replace(/\s*\([^)]*\)\s*$/, '');
  return s.trim();
}

// Extrai a sigla do partido do "(PARTIDO)" ou "([[Nome do Partido|SIGLA]])" no final da
// célula — o nome do partido às vezes tem parênteses dentro (ex: "Partido Liberal
// (2006)"), então o "(" de abertura é sempre o primeiro e o ")" de fechamento é sempre
// o último da célula (guloso, não [^)]*).
function extrairPartidoCelula(celula) {
  const m = celula.match(/\(([\s\S]*)\)\s*$/);
  if (!m) return null;
  let partido = m[1].trim();
  const mLink = partido.match(/\[\[([^\]|]+)\|([^\]]+)\]\]/) || partido.match(/\[\[([^\]]+)\]\]/);
  if (mLink) partido = mLink[2] || mLink[1];
  return partido.trim() || null;
}

// Uma linha de tabela pode trazer um atributo de estilo colado no mesmo "|-"
// (ex: `|- style="background:#98FB98;"` seguido, na linha de baixo, do conteúdo real
// da célula) — tira essa linha de atributo antes de procurar as células de verdade.
function tirarLinhaDeEstilo(linha) {
  return linha.replace(/^[^\n|!]*\n/, '');
}

// Tabelas de deputados federais/estaduais: "|[[Nome]] (PARTIDO)|| pct ||123.456 votos||cidade"
function parseTabelaCandidatoVotos(blocoTabela) {
  const linhas = blocoTabela.split(/\n\|-/).slice(1);
  const resultados = [];
  for (const linhaBruta of linhas) {
    const linha = tirarLinhaDeEstilo(linhaBruta);
    if (!/votos/.test(linha)) continue;
    const celulas = linha.split('||').map((c) => c.replace(/^\s*\n?\|/, '').trim());
    if (!celulas.length) continue;
    const nome = limparNomeCelula(celulas[0]);
    const partido = extrairPartidoCelula(celulas[0]);
    const celulaVotos = celulas.find((c) => /votos/.test(c));
    if (!nome || !celulaVotos) continue;
    const mVotos = celulaVotos.match(/([\d.]+)\s*votos/);
    if (!mVotos) continue;
    const votos = parseInt(mVotos[1].replace(/\./g, ''), 10);
    if (!Number.isFinite(votos)) continue;
    resultados.push({ nome, partido, votos });
  }
  return resultados;
}

// Tabela do senador: "| '''[[Nome]] (PARTIDO)''' || '''799.022''' || '''25,25%'''"
// (linhas de resumo como "Total de votos válidos"/"Abstenções" são ignoradas).
function parseTabelaSenador(blocoTabela) {
  const linhas = blocoTabela.split(/\n\|-/).slice(1);
  const resultados = [];
  for (const linhaBruta of linhas) {
    const linha = tirarLinhaDeEstilo(linhaBruta);
    const celulas = linha.split('||').map((c) => c.replace(/^\s*\n?[|!]/, '').replace(/'''/g, '').trim());
    if (celulas.length < 2) continue;
    const primeira = celulas[0];
    if (/→|Total|Abstenç/i.test(primeira)) continue;
    const nome = limparNomeCelula(primeira);
    const partido = extrairPartidoCelula(primeira);
    const votosStr = celulas[1];
    if (!/^[\d.]+$/.test(votosStr)) continue;
    const votos = parseInt(votosStr.replace(/\./g, ''), 10);
    if (!nome || !Number.isFinite(votos)) continue;
    resultados.push({ nome, partido, votos });
  }
  return resultados;
}

async function main() {
  console.log('[fetch-votos] buscando página da Wikipédia sobre a eleição de 2022 em Goiás...');
  const wikitext = await getWikitext();

  // "Deputados federais...", "Deputados estaduais..." e "Senador" são todos
  // subseções (nível 3) dentro de "== Resultados ==" (junto de "Governador", que não
  // nos interessa aqui) — extrair de dentro dela evita que uma subseção "vaze" pra
  // dentro da seguinte quando ela é a última da página.
  const secaoResultados = extrairSecao(wikitext, 'Resultados');
  const secaoFederais = secaoResultados ? extrairSecao(secaoResultados, 'Deputados federais eleitos por Goiás', '===') : null;
  const secaoEstaduais = secaoResultados ? extrairSecao(secaoResultados, 'Deputados estaduais eleitos em Goiás', '===') : null;
  const secaoSenador = secaoResultados ? extrairSecao(secaoResultados, 'Senador', '===') : null;

  if (!secaoFederais || !secaoEstaduais || !secaoSenador) {
    throw new Error(
      'Não achei uma das seções esperadas no artigo da Wikipédia (o artigo pode ter sido reestruturado) — ' +
        `federais=${!!secaoFederais} estaduais=${!!secaoEstaduais} senador=${!!secaoSenador}`
    );
  }

  const federais = parseTabelaCandidatoVotos(secaoFederais);
  const estaduais = parseTabelaCandidatoVotos(secaoEstaduais);
  const senadores = parseTabelaSenador(secaoSenador);

  console.log(
    `[fetch-votos] extraído da Wikipédia: ${federais.length} deputados federais, ` +
      `${estaduais.length} deputados estaduais, ${senadores.length} candidato(s) a senador.`
  );

  const caminhoParlamentares = path.resolve(__dirname, '../public/data/parlamentares-go.json');
  const parlamentares = JSON.parse(readFileSync(caminhoParlamentares, 'utf-8'));

  const porNome = new Map();
  for (const p of parlamentares) porNome.set(normalizeName(p.nome), p);

  const resultados = {};
  const naoCasados = [];

  function casar(lista, origem) {
    for (const { nome, partido, votos } of lista) {
      const p = acharParlamentar(porNome, nome);
      if (!p) {
        naoCasados.push(`${origem}: ${nome}`);
        continue;
      }
      resultados[`${p.casa}:${p.id}`] = { nome: p.nome, partido, votosNominais: votos, ano: 2022, cargo: p.cargo };
    }
  }

  casar(federais, 'deputado federal');
  casar(estaduais, 'deputado estadual');
  casar(senadores, 'senador');

  // O Senado tem mandato de 8 anos, com metade das vagas renovadas a cada eleição geral
  // (1 ou 2 por vez, alternando) — por isso só 1 dos 3 senadores de GO (Wilder Morais)
  // veio da eleição de 2022; os outros dois (Jorge Kajuru e Vanderlan Cardoso) foram
  // eleitos em 2018. O artigo da Wikipédia de 2018 não organiza os resultados por cargo
  // em subseções como o de 2022 (tudo fica dentro de uma única tabela em "Turno Único"
  // com colunas de suplente/coligação bem diferentes), então em vez de escrever outro
  // parser só pra isso, os números — já conferidos contra a mesma tabela oficial citando
  // o TSE, e batendo com o valor citado na própria página biográfica do Vanderlan Cardoso
  // na Wikipédia — foram anotados aqui direto (mesmo padrão do INSTAGRAM_MANUAL em
  // scripts/gerar-parlamentares-go.js).
  const VOTOS_SENADO_2018 = [
    { nome: 'Vanderlan Cardoso', partido: 'PP', votos: 1729637 },
    { nome: 'Jorge Kajuru', partido: 'PRP', votos: 1557415 },
  ];
  for (const { nome, partido, votos } of VOTOS_SENADO_2018) {
    const p = acharParlamentar(porNome, nome);
    if (!p) {
      naoCasados.push(`senador (2018, manual): ${nome}`);
      continue;
    }
    resultados[`${p.casa}:${p.id}`] = { nome: p.nome, partido, votosNominais: votos, ano: 2018, cargo: p.cargo };
  }

  console.log(`[fetch-votos] ${Object.keys(resultados).length} parlamentar(es) casado(s) com sucesso.`);
  if (naoCasados.length) {
    console.warn(`[fetch-votos] não consegui casar ${naoCasados.length} nome(s) (podem ser candidatos não eleitos, ou suplentes que assumiram sem ter concorrido diretamente):`);
    naoCasados.forEach((n) => console.warn('  -', n));
  }

  const destino = path.resolve(__dirname, '../public/data/votos-go-2022.json');
  writeFileSync(destino, JSON.stringify(resultados, null, 2) + '\n');
  console.log(`[fetch-votos] gravado em ${destino}`);
}

main().catch((err) => {
  console.error('[fetch-votos] falhou:', err);
  process.exit(1);
});
