#!/usr/bin/env node
// Busca as comissões (e cargos — presidente, vice-presidente, titular, suplente) de cada
// deputado federal e senador de Goiás, direto dos dados abertos da Câmara e do Senado, e
// grava em public/data/comissoes-go.json, no formato { "<casa>:<id>": [{ nome, sigla, cargo,
// dataInicio }, ...] } — só a assessoria parlamentar vê isso no site (ver ParlamentarPerfil.jsx).
//
// ALEGO (deputados estaduais) ainda não entra aqui: não tem API de dados abertos, só dá pra
// pegar via "raspagem" do HTML do perfil de cada deputado (como fetch-alego.js já faz pra
// foto/gabinete/e-mail) — fica pra uma próxima rodada depois de confirmar o formato da página.
//
// Confirmado rodando de verdade via GitHub Actions (não pelo sandbox de desenvolvimento, que
// não tem acesso a nenhum dos dois domínios — ver workflow probe-comissoes-temp.yml usado pra
// validar o formato da resposta antes de escrever este script).
//
// Uso:
//   node scripts/gerar-comissoes.js
//   node scripts/gerar-comissoes.js --limit 5   # só os N primeiros de cada casa (teste)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONTE = path.resolve(__dirname, '../public/data/parlamentares-go.json');
const DESTINO = path.resolve(__dirname, '../public/data/comissoes-go.json');
const CAMARA_BASE = 'https://dadosabertos.camara.leg.br/api/v2';
const SENADO_BASE = 'https://legis.senado.leg.br/dadosabertos';
const CONCURRENCY = 4;
const UA = 'painel-captacao-cbmgo/1.0 (uso interno, sem fins comerciais)';

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith('--limit'));
const limit = limitArg ? parseInt(args[args.indexOf(limitArg) + 1] || limitArg.split('=')[1] || '0', 10) : 0;

async function getJson(url, tentativas = 3) {
  for (let i = 0; i <= tentativas; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(25000) });
      if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
      return await res.json();
    } catch (err) {
      if (i === tentativas) throw err;
      console.warn(`[comissoes] falha (${err.message}) em ${url} — tentativa ${i + 1}/${tentativas}`);
      await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
    }
  }
}

async function mapWithConcurrency(items, n, fn) {
  const out = Array.from({ length: items.length });
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}

// Câmara: GET /deputados/{id}/orgaos devolve o histórico inteiro de órgãos (comissões, mesa
// diretora, lideranças etc.) — "dataFim": null é quem está em exercício agora. Mantém tudo que
// estiver em exercício, sem filtrar por tipo de órgão (todos são relevantes pra assessoria).
async function comissoesDeputado(id) {
  const resp = await getJson(`${CAMARA_BASE}/deputados/${id}/orgaos?itens=100`);
  return (resp.dados || [])
    .filter((o) => !o.dataFim)
    .map((o) => ({ nome: o.nomePublicacao || o.nomeOrgao, sigla: o.siglaOrgao, cargo: o.titulo, dataInicio: o.dataInicio }))
    .sort((a, b) => (a.cargo === 'Presidente' ? -1 : b.cargo === 'Presidente' ? 1 : 0));
}

// Senado: GET /senador/{codigo}/comissoes.json devolve o histórico inteiro também, com a mesma
// comissão repetida por período — fica só com o mandato mais recente de cada uma (sem
// "DataFim" = em exercício agora) e tira as Frentes/Grupos Parlamentares (são articulações
// informais entre parlamentares, não comissões de verdade com poder de relator/pauta).
async function comissoesSenador(codigo) {
  const resp = await getJson(`${SENADO_BASE}/senador/${codigo}/comissoes.json`);
  const lista = resp?.MembroComissaoParlamentar?.Parlamentar?.MembroComissoes?.Comissao || [];
  const arr = Array.isArray(lista) ? lista : [lista].filter(Boolean);

  const porCodigo = new Map();
  for (const c of arr) {
    const ident = c.IdentificacaoComissao || {};
    if (/^(Frente|Grupo) Parlamentar/i.test(ident.NomeComissao || '')) continue;
    if (c.DataFim) continue; // só o que está em exercício agora
    const atual = porCodigo.get(ident.CodigoComissao);
    if (!atual || (c.DataInicio || '') > (atual.dataInicio || '')) {
      porCodigo.set(ident.CodigoComissao, { nome: ident.NomeComissao, sigla: ident.SiglaComissao, cargo: c.DescricaoParticipacao, dataInicio: c.DataInicio });
    }
  }
  return [...porCodigo.values()].sort((a, b) => (a.cargo === 'Presidente' ? -1 : b.cargo === 'Presidente' ? 1 : 0));
}

async function main() {
  const todos = JSON.parse(readFileSync(FONTE, 'utf-8'));
  let camara = todos.filter((p) => p.casa === 'camara');
  let senado = todos.filter((p) => p.casa === 'senado');
  if (limit) { camara = camara.slice(0, limit); senado = senado.slice(0, limit); }

  console.log(`[comissoes] buscando ${camara.length} deputado(s) federal(is) e ${senado.length} senador(es) de Goiás...`);

  const resultado = {};

  await mapWithConcurrency(camara, CONCURRENCY, async (p, i) => {
    if (i % 5 === 0) console.log(`[comissoes] câmara ${i + 1}/${camara.length}...`);
    try {
      resultado[`camara:${p.id}`] = await comissoesDeputado(p.id);
    } catch (err) {
      console.error(`[comissoes] falhou ${p.nome} (camara:${p.id}): ${err.message}`);
    }
  });

  await mapWithConcurrency(senado, CONCURRENCY, async (p, i) => {
    console.log(`[comissoes] senado ${i + 1}/${senado.length}...`);
    try {
      resultado[`senado:${p.id}`] = await comissoesSenador(p.id);
    } catch (err) {
      console.error(`[comissoes] falhou ${p.nome} (senado:${p.id}): ${err.message}`);
    }
  });

  writeFileSync(DESTINO, JSON.stringify(resultado, null, 2) + '\n');
  const total = Object.values(resultado).reduce((s, l) => s + l.length, 0);
  console.log(`[comissoes] concluído. ${Object.keys(resultado).length} parlamentar(es), ${total} comissão(ões) ao todo, gravado em ${DESTINO}`);
}

main().catch((err) => {
  console.error('[comissoes] falhou:', err);
  process.exit(1);
});
