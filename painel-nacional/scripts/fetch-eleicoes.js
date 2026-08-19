#!/usr/bin/env node
// Cruza cada parlamentar com os votos que recebeu na eleição, usando o portal de dados
// abertos do TSE, e grava em public/data/resultados-eleitorais.json.
//
// ⚠️ ATENÇÃO — NUNCA EXECUTADO NESTE AMBIENTE (mesmo motivo dos outros scripts) — e esta é
// a parte MENOS confiável do pipeline. Diferente da Câmara e do Senado, o TSE não oferece
// uma API REST simples "dá o nome, devolve os votos": dadosabertos.tse.jus.br é um portal
// CKAN que distribui arquivos CSV grandes (um por UF/ano) com a votação nominal por
// candidato/município/zona. Este script:
//   1. Usa a API de busca do CKAN (padrão em portais CKAN: /api/3/action/package_search)
//      para localizar o pacote de "votação nominal por município e zona" do ano/eleição
//      informados — o nome exato do pacote (ex: "votacao-candidato-munzona-2022") não foi
//      confirmado aqui e pode ter mudado.
//   2. Baixa o CSV do estado (UF) de cada parlamentar (os arquivos são grandes — dezenas de
//      MB por UF) e filtra pelo número e/ou nome do candidato.
//   3. Os CSVs do TSE historicamente vêm com separador ";", codificação Latin-1 (ISO-8859-1)
//      e nomes de coluna como NR_CANDIDATO, NM_CANDIDATO, NM_URNA_CANDIDATO, SG_UF,
//      QT_VOTOS_NOMINAIS, DS_CARGO — confirme essas colunas no arquivo real antes de confiar
//      no resultado, pois o layout muda entre anos de eleição.
//
// Por isso o parâmetro --limit existe e o padrão é 10 (conforme pedido): teste com poucos
// parlamentares, confira manualmente os números batendo com o resultado oficial no site do
// TSE, e só então rode com --all.
//
// Uso:
//   node scripts/fetch-eleicoes.js --ano 2022                  # padrão: só 10 primeiros
//   node scripts/fetch-eleicoes.js --ano 2022 --limit 30
//   node scripts/fetch-eleicoes.js --ano 2022 --all             # roda todos os 594

import { existsSync, readFileSync } from 'node:fs';
import { getJson, getText, mapWithConcurrency } from './lib/http.js';
import { writeJson } from './lib/checkpoint.js';

const TSE_CKAN_BASE = 'https://dadosabertos.tse.jus.br/api/3/action';
const CONCURRENCY = 2; // arquivos grandes — não paralelizar demais

const args = process.argv.slice(2);
const anoArg = args.find((a) => a.startsWith('--ano'));
const ano = anoArg ? args[args.indexOf(anoArg) + 1] || anoArg.split('=')[1] : '2022';
const all = args.includes('--all');
const limitArg = args.find((a) => a.startsWith('--limit'));
const limit = all ? 0 : limitArg ? parseInt(args[args.indexOf(limitArg) + 1] || limitArg.split('=')[1] || '10', 10) : 10;

function normalizeName(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim();
}

// Faz o parse manual de um CSV do TSE (separador ";", possivelmente com aspas).
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { header: [], rows: [] };
  const header = lines[0].split(';').map((h) => h.replace(/"/g, '').trim());
  const rows = lines.slice(1).map((line) => {
    const cols = line.split(';').map((c) => c.replace(/"/g, '').trim());
    const row = {};
    header.forEach((h, i) => (row[h] = cols[i]));
    return row;
  });
  return { header, rows };
}

async function findPackage(ano) {
  console.log(`[tse] procurando pacote de votação nominal por candidato para ${ano}...`);
  const resp = await getJson(
    `${TSE_CKAN_BASE}/package_search?q=votacao+candidato+munzona+${ano}&rows=5`
  );
  const pkgs = resp?.result?.results || [];
  if (!pkgs.length) {
    throw new Error(
      `Nenhum pacote encontrado para "votacao candidato munzona ${ano}". Busque manualmente em ` +
        `https://dadosabertos.tse.jus.br e ajuste a query/slug neste script.`
    );
  }
  console.log(`[tse] pacote candidato: "${pkgs[0].title}" (${pkgs[0].name})`);
  return pkgs[0];
}

function findResourceForUf(pkg, uf) {
  const resources = pkg.resources || [];
  const match = resources.find(
    (r) => r.format?.toUpperCase() === 'CSV' && r.name?.toUpperCase().includes(uf.toUpperCase())
  );
  return match || resources.find((r) => r.format?.toUpperCase() === 'CSV');
}

async function main() {
  if (!existsSync('public/data/deputados.json') && !existsSync('public/data/senadores.json')) {
    console.error('[eleicoes] rode "npm run fetch:parlamentares" primeiro.');
    process.exit(1);
  }
  const deputados = existsSync('public/data/deputados.json') ? JSON.parse(readFileSync('public/data/deputados.json', 'utf-8')) : [];
  const senadores = existsSync('public/data/senadores.json') ? JSON.parse(readFileSync('public/data/senadores.json', 'utf-8')) : [];
  let parlamentares = [...deputados, ...senadores];
  if (limit) parlamentares = parlamentares.slice(0, limit);
  console.log(`[eleicoes] processando ${parlamentares.length} parlamentar(es)${limit ? ' (modo teste — use --all para rodar todos)' : ''}.`);

  const pkg = await findPackage(ano);
  const porUf = new Map(); // uf -> {header, rows} (cache para não baixar 2x a mesma UF)

  async function getRowsForUf(uf) {
    if (porUf.has(uf)) return porUf.get(uf);
    const resource = findResourceForUf(pkg, uf);
    if (!resource) {
      console.warn(`[tse] nenhum recurso CSV encontrado para UF ${uf} no pacote ${pkg.name}`);
      porUf.set(uf, { header: [], rows: [] });
      return porUf.get(uf);
    }
    console.log(`[tse] baixando ${resource.name} (${uf})...`);
    const text = await getText(resource.url);
    const parsed = parseCsv(text);
    porUf.set(uf, parsed);
    return parsed;
  }

  const resultados = {};
  await mapWithConcurrency(parlamentares, CONCURRENCY, async (p) => {
    if (!p.uf) {
      console.warn(`[eleicoes] ${p.nome} sem UF cadastrada — pulando.`);
      return;
    }
    try {
      const { rows } = await getRowsForUf(p.uf);
      const alvo = normalizeName(p.nome);
      const candidatos = rows.filter((r) => {
        const nomeUrna = normalizeName(r.NM_URNA_CANDIDATO);
        const nomeCompleto = normalizeName(r.NM_CANDIDATO);
        return nomeUrna === alvo || nomeCompleto === alvo || nomeUrna.includes(alvo) || alvo.includes(nomeUrna);
      });
      if (!candidatos.length) {
        console.warn(`[eleicoes] nenhum candidato TSE encontrado para "${p.nome}" (UF ${p.uf}) — confira o nome de urna manualmente.`);
        return;
      }
      const totalVotos = candidatos.reduce((s, r) => s + (parseInt(r.QT_VOTOS_NOMINAIS, 10) || 0), 0);
      resultados[`${p.casa}:${p.id}`] = {
        nome: p.nome,
        uf: p.uf,
        ano,
        numeroCandidato: candidatos[0]?.NR_CANDIDATO || null,
        nomeUrna: candidatos[0]?.NM_URNA_CANDIDATO || null,
        cargo: candidatos[0]?.DS_CARGO || null,
        votosNominais: totalVotos,
        linhasEncontradas: candidatos.length,
      };
      console.log(`[eleicoes] ${p.nome}: ${totalVotos} votos nominais (${candidatos.length} linha(s) casadas).`);
    } catch (err) {
      console.error(`[eleicoes] falhou para ${p.nome}: ${err.message}`);
    }
  });

  writeJson('public/data/resultados-eleitorais.json', resultados);
  console.log(
    `[fetch-eleicoes] concluído. ${Object.keys(resultados).length}/${parlamentares.length} parlamentares casados. ` +
      `Confira manualmente alguns valores no site oficial do TSE antes de confiar nos números.`
  );
}

main().catch((err) => {
  console.error('[fetch-eleicoes] falhou:', err);
  process.exit(1);
});
