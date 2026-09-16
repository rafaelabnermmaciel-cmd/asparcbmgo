#!/usr/bin/env node
// Busca a lista de deputados estaduais da ALEGO (Assembleia Legislativa de Goiás) em
// exercício, direto do Portal da Alego (não é uma API de dados abertos — não existe uma pra
// ALEGO — é HTML mesmo, mas com uma tabela bem regular, então dá pra extrair com regex sem
// precisar de navegador/headless). Grava em public/data/alego.json.
//
// Confirmado rodando de verdade neste ambiente (diferente dos scripts do painel-nacional):
// https://portal.al.go.leg.br/deputados devolve uma tabela HTML com nome, partido, telefone(s)
// e redes sociais de cada deputado; o perfil individual
// (https://portal.al.go.leg.br/deputados/perfil/<id>) tem a foto, número do gabinete e e-mail.
//
// Uso:
//   node scripts/fetch-alego.js
//   node scripts/fetch-alego.js --limit 5   # só os N primeiros (teste)

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DESTINO = path.resolve(__dirname, '../public/data/alego.json');
const BASE = 'https://portal.al.go.leg.br';
const CONCURRENCY = 4;

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith('--limit'));
const limit = limitArg ? parseInt(args[args.indexOf(limitArg) + 1] || limitArg.split('=')[1] || '0', 10) : 0;

async function getText(url, tentativas = 3) {
  for (let i = 0; i <= tentativas; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (painel-captacao-cbmgo; uso institucional)' },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
      return await res.text();
    } catch (err) {
      if (i === tentativas) throw err;
      console.warn(`[fetch-alego] falha (${err.message}) em ${url} — tentativa ${i + 1}/${tentativas}`);
      await new Promise((r) => setTimeout(r, 800 * 2 ** i));
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

function decodeEntidades(s) {
  return (s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// Cada linha da tabela é um <tr data-target="search.filterable" ...>...</tr> — extrai id/nome,
// partido, telefones e os links de rede social/e-mail de dentro dela.
function extrairDeputadosDaLista(html) {
  const linhas = html.match(/<tr data-target="search\.filterable"[\s\S]*?<\/tr>/g) || [];
  const deputados = [];
  for (const linha of linhas) {
    const mNome = linha.match(/href=\/deputados\/perfil\/(\d+)>([^<]+)<\/a>/);
    if (!mNome) continue;
    const id = mNome[1];
    const nome = decodeEntidades(mNome[2]).replace(/\s+/g, ' ').trim();

    const mPartido = linha.match(/data-title="Partido">([^<]+)</);
    const partidoBruto = mPartido ? decodeEntidades(mPartido[1]) : '';
    const mSigla = partidoBruto.match(/^(.*)\s\(([A-Z0-9]+)\)$/);
    const partidoNome = mSigla ? mSigla[1].trim() : partidoBruto || null;
    const partido = mSigla ? mSigla[2] : null;

    const telefones = [...linha.matchAll(/href='tel:\d+'>([^<]+)</g)].map((m) => decodeEntidades(m[1]));

    const redeSocial = [...linha.matchAll(/<a href="(https?:\/\/[^"]+)"/g)]
      .map((m) => m[1])
      .filter((u) => /facebook\.com|instagram\.com|twitter\.com|x\.com|youtube\.com/i.test(u));

    const mEmail = linha.match(/href="mailto:([^"]+)"/);
    const email = mEmail ? mEmail[1] : null;

    deputados.push({ id, nome, partido, partidoNome, telefone: telefones[0] || null, redeSocial, email });
  }
  return deputados;
}

// A foto, o número do gabinete e o e-mail "oficial" (mais confiável que o da listagem, que às
// vezes vem vazio) só aparecem no perfil individual de cada deputado.
function extrairDetalhePerfil(html) {
  const mFoto = html.match(/<img class="foto" src="([^"]+)"/);
  const mGabinete = html.match(/Número do Gabinete:<\/b>\s*<span>([^<]+)<\/span>/);
  const mEmail = html.match(/E-mail:<\/b>\s*<span>([^<]+)<\/span>/);
  // O "?t=<timestamp>" no fim da URL da foto é só cache-busting do CDN da Alego — muda a cada
  // carregamento da página mesmo com a foto igual, o que faria o workflow semanal achar
  // "mudou algo" toda vez e gerar um commit/deploy à toa. Removendo pra manter a URL estável.
  const foto = mFoto ? mFoto[1].replace(/\?t=\d+$/, '') : null;
  return {
    foto,
    gabineteNumero: mGabinete ? decodeEntidades(mGabinete[1]) : null,
    email: mEmail ? decodeEntidades(mEmail[1]) : null,
  };
}

async function main() {
  console.log('[fetch-alego] buscando lista de deputados estaduais em exercício...');
  const html = await getText(`${BASE}/deputados`);
  let lista = extrairDeputadosDaLista(html);
  // A listagem pode repetir o mesmo deputado (ex: presidência aparece 2x) — mantém só 1 por id.
  const vistos = new Set();
  lista = lista.filter((d) => (vistos.has(d.id) ? false : (vistos.add(d.id), true)));
  if (limit) lista = lista.slice(0, limit);
  console.log(`[fetch-alego] ${lista.length} deputados encontrados na listagem. Buscando perfil (foto/gabinete)...`);

  const completos = await mapWithConcurrency(lista, CONCURRENCY, async (d, i) => {
    if (i % 10 === 0) console.log(`[fetch-alego] perfil ${i + 1}/${lista.length}...`);
    try {
      const perfilHtml = await getText(`${BASE}/deputados/perfil/${d.id}`);
      const detalhe = extrairDetalhePerfil(perfilHtml);
      return {
        id: d.id,
        casa: 'alego',
        cargo: 'Deputado Estadual',
        nome: d.nome,
        partido: d.partido,
        partidoNome: d.partidoNome,
        uf: 'GO',
        foto: detalhe.foto,
        email: detalhe.email || d.email,
        telefone: d.telefone,
        gabinete: detalhe.gabineteNumero ? { numero: detalhe.gabineteNumero } : null,
        redeSocial: d.redeSocial,
        urlAlego: `${BASE}/deputados/perfil/${d.id}`,
      };
    } catch (err) {
      console.error(`[fetch-alego] falhou ao buscar perfil ${d.id} (${d.nome}): ${err.message}`);
      return {
        id: d.id,
        casa: 'alego',
        cargo: 'Deputado Estadual',
        nome: d.nome,
        partido: d.partido,
        partidoNome: d.partidoNome,
        uf: 'GO',
        foto: null,
        email: d.email,
        telefone: d.telefone,
        gabinete: null,
        redeSocial: d.redeSocial,
        urlAlego: `${BASE}/deputados/perfil/${d.id}`,
      };
    }
  });

  writeFileSync(DESTINO, JSON.stringify(completos, null, 2) + '\n');
  console.log(`[fetch-alego] concluído. ${completos.length} deputados estaduais gravados em ${DESTINO}`);
}

main().catch((err) => {
  console.error('[fetch-alego] falhou:', err);
  process.exit(1);
});
