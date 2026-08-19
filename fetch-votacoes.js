#!/usr/bin/env node
// Busca o histórico de votações em plenário de cada parlamentar e grava em public/data/votacoes.json.
// Depende de public/data/deputados.json e public/data/senadores.json já existirem (rode
// fetch-parlamentares.js primeiro).
//
// ⚠️ ATENÇÃO — NUNCA EXECUTADO NESTE AMBIENTE, mesmo aviso de fetch-parlamentares.js.
// Além disso, a Câmara não expõe um endpoint simples "/deputados/{id}/votacoes" na
// documentação pública que eu conheço com certeza — o padrão documentado é: listar
// votações em /api/v2/votacoes (filtrando por data/proposição) e, para cada votação, buscar
// /api/v2/votacoes/{id}/votos para ver como cada deputado votou. Este script tenta primeiro
// o endpoint direto por deputado (conforme solicitado) e, se retornar 404, cai para um aviso
// claro em vez de inventar dados — ajuste a estratégia depois de conferir o Swagger:
// https://dadosabertos.camara.leg.br/swagger/api.html
//
// Uso:
//   node scripts/fetch-votacoes.js
//   node scripts/fetch-votacoes.js --limit 10          # só os N primeiros de cada casa (teste)
//   node scripts/fetch-votacoes.js --resume             # continua de um checkpoint salvo

import { existsSync, readFileSync } from 'node:fs';
import { getJson, mapWithConcurrency } from './lib/http.js';
import { writeJson, loadCheckpoint, saveCheckpoint } from './lib/checkpoint.js';

const CAMARA_BASE = 'https://dadosabertos.camara.leg.br/api/v2';
const SENADO_BASE = 'https://legis.senado.leg.br/dadosabertos';
const CONCURRENCY = 3; // histórico de votações é um endpoint mais pesado — throttle maior
const CHECKPOINT_PATH = 'public/data/.votacoes.checkpoint.json';

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith('--limit'));
const limit = limitArg ? parseInt(args[args.indexOf(limitArg) + 1] || limitArg.split('=')[1] || '0', 10) : 0;
const resume = args.includes('--resume');

function readData(path) {
  if (!existsSync(path)) {
    console.error(`[votacoes] ${path} não encontrado — rode "npm run fetch:parlamentares" primeiro.`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(path, 'utf-8'));
}

async function votacoesDeputado(id) {
  try {
    const resp = await getJson(`${CAMARA_BASE}/deputados/${id}/votacoes?itens=50&ordem=DESC&ordenarPor=dataHoraRegistro`);
    return (resp.dados || []).map((v) => ({
      id: v.id,
      data: v.dataHoraRegistro || v.data || null,
      proposicao: v.proposicaoObjeto || v.uriProposicaoObjeto || null,
      voto: v.voto || null,
      descricao: v.descricao || null,
    }));
  } catch (err) {
    console.warn(`[camara] sem histórico de votações para deputado ${id}: ${err.message}`);
    return [];
  }
}

async function votacoesSenador(id) {
  try {
    const resp = await getJson(`${SENADO_BASE}/senador/${id}/votacoes.json`);
    // ⚠️ chave exata não verificada — ajuste conforme resposta real da API do Senado.
    const lista = resp?.VotacaoParlamentar?.Parlamentar?.Votacoes?.Votacao || [];
    const arr = Array.isArray(lista) ? lista : [lista].filter(Boolean);
    return arr.map((v) => ({
      id: v.CodigoSessaoVotacao || v.SequencialVotacao || null,
      data: v.DataSessao || null,
      materia: v.SiglaMateria && v.NumeroMateria ? `${v.SiglaMateria} ${v.NumeroMateria}/${v.AnoMateria}` : null,
      voto: v.SiglaDescricaoVoto || v.DescricaoVoto || null,
      descricao: v.DescricaoVotacao || null,
    }));
  } catch (err) {
    console.warn(`[senado] sem histórico de votações para senador ${id}: ${err.message}`);
    return [];
  }
}

async function main() {
  const deputados = existsSync('public/data/deputados.json') ? readData('public/data/deputados.json') : [];
  const senadores = existsSync('public/data/senadores.json') ? readData('public/data/senadores.json') : [];
  const depList = limit ? deputados.slice(0, limit) : deputados;
  const senList = limit ? senadores.slice(0, limit) : senadores;

  const checkpoint = resume ? loadCheckpoint(CHECKPOINT_PATH) : {};
  const result = resume ? checkpoint.result || {} : {};
  let done = 0;
  const total = depList.length + senList.length;

  await mapWithConcurrency(depList, CONCURRENCY, async (dep) => {
    const key = `camara:${dep.id}`;
    if (!(key in result)) {
      result[key] = await votacoesDeputado(dep.id);
      saveCheckpoint(CHECKPOINT_PATH, { result });
    }
    done++;
    if (done % 20 === 0) console.log(`[votacoes] ${done}/${total} parlamentares processados...`);
  });

  await mapWithConcurrency(senList, CONCURRENCY, async (sen) => {
    const key = `senado:${sen.id}`;
    if (!(key in result)) {
      result[key] = await votacoesSenador(sen.id);
      saveCheckpoint(CHECKPOINT_PATH, { result });
    }
    done++;
    if (done % 20 === 0) console.log(`[votacoes] ${done}/${total} parlamentares processados...`);
  });

  writeJson('public/data/votacoes.json', result);
  console.log(`[fetch-votacoes] concluído. ${Object.keys(result).length} parlamentares com histórico gravado em public/data/votacoes.json.`);
  console.log('[fetch-votacoes] checkpoint salvo em public/data/.votacoes.checkpoint.json — pode apagar após conferir o resultado.');
}

main().catch((err) => {
  console.error('[fetch-votacoes] falhou:', err);
  process.exit(1);
});
