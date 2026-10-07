// Busca os votos nominais da eleição de 2026 (deputados federais, deputados estaduais da
// ALEGO e os 2 senadores eleitos) no artigo "Eleições estaduais em Goiás em 2026" da
// Wikipédia e grava em public/data/votos-go-2026.json — mesma fonte e mesmo motivo do
// fetch-votos-go-2022.js (TSE bloqueia IP de nuvem/datacenter com 403/WAF).
//
// O wikitext de 2026 usa um formato de tabela DIFERENTE do de 2022: cada célula fica numa
// linha própria do wikitext (em vez de células separadas por "||" numa única linha), e o
// candidato eleito é marcado com `style="background:#BBFFBB;"` + negrito em toda célula da
// linha (mesma cor de "Eleito" de 2022, só que sem precisar do rodapé {{legenda|...}} —
// o estilo já vem direto em cada linha).
//
// As tabelas de deputado (federal/estadual) têm 5 colunas: Nome | Sigla do partido |
// Partido (wikilink, redundante) | Votos | Percentual. A tabela de senador ainda usa o
// formato de 2022 — nome e partido juntos numa célula, ex: "'''[[Nome]] ([[Partido
// Liberal (2006)|PL]])'''" — por isso reaproveita a mesma lógica de limpeza.
//
// ⚠️ NUNCA EXECUTADO NESTE AMBIENTE (sandbox sem acesso à internet externa) — rodar via
// GitHub Actions ou localmente com internet.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { normalizeName, acharParlamentar } from './lib/nomes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAGINA = 'Eleições estaduais em Goiás em 2026';

async function getWikitext() {
  const url = `https://pt.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(PAGINA)}&prop=wikitext&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'painel-captacao-cbmgo/1.0 (uso interno, sem fins comerciais)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ao buscar a página da Wikipédia`);
  const data = await res.json();
  const wikitext = data?.parse?.wikitext?.['*'];
  if (!wikitext) throw new Error('resposta da Wikipédia sem wikitext — a API pode ter mudado.');
  return wikitext;
}

// Isola o conteúdo de uma seção "== Nome ==" (ou "=== Nome ===" se nivel for '===') até o
// próximo cabeçalho do mesmo nível ou mais raso — um cabeçalho MAIS fundo (ex: "===" dentro
// de uma seção "==") não conta como fim, senão a extração para cedo demais na primeira
// subseção que aparecer (mesma função do fetch-votos-go-2022.js).
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

// Wikitext de uma célula vira nome "limpo": tira negrito, resolve [[link|texto]] -> texto
// (ou [[texto]] -> texto), e tira o "(PARTIDO)" do final.
function limparNomeCelula(celula) {
  let s = celula.trim();
  s = s.replace(/'''/g, '');
  s = s.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2');
  s = s.replace(/\[\[([^\]]+)\]\]/g, '$1');
  s = s.replace(/\s*\([^)]*\)\s*$/, '');
  return s.trim();
}

// Extrai a sigla do partido do "(PARTIDO)" ou "([[Nome do Partido|SIGLA]])" no final da
// célula — o "(" de abertura é sempre o primeiro e o ")" de fechamento é sempre o último.
function extrairPartidoCelula(celula) {
  const m = celula.match(/\(([\s\S]*)\)\s*$/);
  if (!m) return null;
  let partido = m[1].trim();
  const mLink = partido.match(/\[\[([^\]|]+)\|([^\]]+)\]\]/) || partido.match(/\[\[([^\]]+)\]\]/);
  if (mLink) partido = mLink[2] || mLink[1];
  return partido.trim() || null;
}

// Uma linha de tabela (entre "|-" e o próximo "|-") vem com uma célula por linha de
// wikitext (ex: `| style="background:#BBFFBB;" | '''Nome'''`) — tira o `|` inicial e,
// quando presente, o atributo `style="..."` colado antes do conteúdo. Não usa split('|')
// porque o conteúdo de uma célula pode ter "|" dentro (ex: link com texto alternativo
// [[Partido Liberal (2006)|PL]]), o que cortaria a célula errado.
function celulasDaLinha(blocoLinha) {
  return blocoLinha
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && !l.startsWith('|-') && !l.startsWith('|}'))
    .map((l) => l.replace(/^\|\s*(?:style="[^"]*"\s*\|)?\s*/, '').trim());
}

// O candidato eleito tem toda a linha marcada com esse fundo verde (mesma cor de "Eleito"
// usada em 2022, só que em 2026 o estilo já vem inline em cada célula, sem precisar de
// rodapé {{legenda|...}} pra identificar).
function eleito(blocoLinha) {
  return /background:\s*#BBFFBB/i.test(blocoLinha);
}

// Pega o número de votos de uma linha: entre as células, a última que for só dígitos/pontos
// (depois de tirar o negrito) — robusto tanto pra tabela de deputado (5 colunas) quanto pra
// de senador (4 colunas), já que em ambas o campo de votos é o penúltimo antes do percentual.
function extrairVotosDaLinha(celulas) {
  const candidatas = celulas
    .map((c) => c.replace(/'''/g, '').trim())
    .filter((c) => /^[\d.]+$/.test(c));
  if (!candidatas.length) return null;
  const votos = parseInt(candidatas[candidatas.length - 1].replace(/\./g, ''), 10);
  return Number.isFinite(votos) ? votos : null;
}

// Tabela de deputado federal/estadual: 5 células por linha — Nome | Sigla | Partido
// (wikilink) | Votos | Percentual.
function parseTabelaDeputados(blocoTabela) {
  const linhas = blocoTabela.split(/\n\|-/).slice(1);
  const resultados = [];
  for (const blocoLinha of linhas) {
    const celulas = celulasDaLinha(blocoLinha);
    if (celulas.length < 2) continue;
    const primeira = celulas[0].replace(/'''/g, '').trim();
    if (!primeira || /^(Nome|Candidato|Total|Branco|Nulo|Abstenç)/i.test(primeira)) continue;
    const votos = extrairVotosDaLinha(celulas);
    if (votos == null) continue;
    const nome = limparNomeCelula(celulas[0]);
    const partido = celulas[1] ? celulas[1].replace(/'''/g, '').trim() : null;
    if (!nome) continue;
    resultados.push({ nome, partido, votos, eleito: eleito(blocoLinha) });
  }
  return resultados;
}

// Tabela do senador: ainda no formato de 2022 — "'''[[Nome]] ([[Partido|SIGLA]])''' |
// '''1.639.247''' | '''24,53%'''" — nome e partido juntos na primeira célula.
function parseTabelaSenador(blocoTabela) {
  const linhas = blocoTabela.split(/\n\|-/).slice(1);
  const resultados = [];
  for (const blocoLinha of linhas) {
    const celulas = celulasDaLinha(blocoLinha);
    if (celulas.length < 2) continue;
    const primeira = celulas[0].replace(/'''/g, '').trim();
    if (!primeira || /→|Total|Abstenç/i.test(primeira)) continue;
    const votos = extrairVotosDaLinha(celulas);
    if (votos == null) continue;
    const nome = limparNomeCelula(celulas[0]);
    const partido = extrairPartidoCelula(celulas[0].replace(/'''/g, ''));
    if (!nome) continue;
    resultados.push({ nome, partido, votos, eleito: eleito(blocoLinha) });
  }
  return resultados;
}

async function main() {
  console.log('[fetch-votos-2026] buscando página da Wikipédia sobre a eleição de 2026 em Goiás...');
  const wikitext = await getWikitext();

  // "Governador", "Senador", "Deputados federais" e "Deputados estaduais" são todas
  // subseções de nível 3 (=== ... ===) dentro de "== Resultados ==" — mesma estrutura de
  // 2022 (confirmado inspecionando os cabeçalhos reais do artigo com um script de depuração
  // via GitHub Actions; o artigo não usa nível 2 pra essas subseções como se chegou a supor
  // numa investigação anterior).
  const secaoResultados = extrairSecao(wikitext, 'Resultados');
  const secaoFederais = secaoResultados ? extrairSecao(secaoResultados, 'Deputados federais', '===') : null;
  const secaoEstaduais = secaoResultados ? extrairSecao(secaoResultados, 'Deputados estaduais', '===') : null;
  const secaoSenador = secaoResultados ? extrairSecao(secaoResultados, 'Senador', '===') : null;

  if (!secaoFederais || !secaoEstaduais || !secaoSenador) {
    throw new Error(
      'Não achei uma das seções esperadas no artigo da Wikipédia (o artigo pode ter sido reestruturado) — ' +
        `federais=${!!secaoFederais} estaduais=${!!secaoEstaduais} senador=${!!secaoSenador}`
    );
  }

  const federais = parseTabelaDeputados(secaoFederais);
  const estaduais = parseTabelaDeputados(secaoEstaduais);
  const senadores = parseTabelaSenador(secaoSenador);

  console.log(
    `[fetch-votos-2026] extraído da Wikipédia: ${federais.length} candidato(s) a deputado federal ` +
      `(${federais.filter((c) => c.eleito).length} eleitos), ${estaduais.length} candidato(s) a deputado estadual ` +
      `(${estaduais.filter((c) => c.eleito).length} eleitos), ${senadores.length} candidato(s) a senador ` +
      `(${senadores.filter((c) => c.eleito).length} eleitos).`
  );

  const caminhoParlamentares = path.resolve(__dirname, '../public/data/parlamentares-go.json');
  const parlamentares = JSON.parse(readFileSync(caminhoParlamentares, 'utf-8'));

  const porNome = new Map();
  for (const p of parlamentares) porNome.set(normalizeName(p.nome), p);

  const resultados = {};
  const novosEleitos = [];
  const naoCasados = [];

  function casar(lista, origem, cargo) {
    for (const { nome, partido, votos, eleito: foiEleito } of lista) {
      const p = acharParlamentar(porNome, nome);
      if (p) {
        resultados[`${p.casa}:${p.id}`] = { nome: p.nome, partido, votosNominais: votos, ano: 2026, cargo: p.cargo, eleito: foiEleito };
      } else if (foiEleito) {
        novosEleitos.push({ nome, partido, votos, cargo, origem });
      } else {
        naoCasados.push(`${origem} (não eleito, sem registro prévio): ${nome} — ${votos} votos`);
      }
    }
  }

  casar(federais, 'deputado federal', 'Deputado Federal');
  casar(estaduais, 'deputado estadual', 'Deputado Estadual');
  casar(senadores, 'senador', 'Senador');

  console.log(`[fetch-votos-2026] ${Object.keys(resultados).length} parlamentar(es) já cadastrado(s) casado(s) com sucesso.`);
  console.log(`[fetch-votos-2026] ${novosEleitos.length} candidato(s) eleito(s) em 2026 que NÃO estão no cadastro atual (novos parlamentares a adicionar):`);
  novosEleitos.forEach((n) => console.log(`  - ${n.nome} (${n.partido || 'sem partido identificado'}) — ${n.cargo} — ${n.votos} votos [${n.origem}]`));
  if (naoCasados.length) {
    console.warn(`[fetch-votos-2026] ${naoCasados.length} candidato(s) não eleito(s) sem registro prévio (ignorados, esperado):`);
    naoCasados.forEach((n) => console.warn('  -', n));
  }

  const destino = path.resolve(__dirname, '../public/data/votos-go-2026.json');
  writeFileSync(destino, JSON.stringify(resultados, null, 2) + '\n');
  console.log(`[fetch-votos-2026] gravado em ${destino}`);

  const destinoNovos = path.resolve(__dirname, '../novos-eleitos-2026.json');
  writeFileSync(destinoNovos, JSON.stringify(novosEleitos, null, 2) + '\n');
  console.log(`[fetch-votos-2026] lista de novos eleitos gravada em ${destinoNovos}`);
}

main().catch((err) => {
  console.error('[fetch-votos-2026] falhou:', err);
  process.exit(1);
});
