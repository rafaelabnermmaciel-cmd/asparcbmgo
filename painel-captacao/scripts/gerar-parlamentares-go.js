// Filtra os parlamentares de Goiás a partir dos dados já coletados pelo painel-nacional
// (../painel-nacional/public/data/{deputados,senadores}.json) e grava uma lista única e
// enxuta em public/data/parlamentares-go.json. Rode de novo sempre que o painel-nacional
// atualizar esses arquivos (ver painel-nacional/README.md — GitHub Actions).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fonte = path.resolve(__dirname, '../../painel-nacional/public/data');
const destino = path.resolve(__dirname, '../public/data/parlamentares-go.json');

function lerJson(nome, fallback) {
  try {
    return JSON.parse(readFileSync(path.join(fonte, nome), 'utf-8'));
  } catch (err) {
    console.warn(`[gerar-parlamentares-go] não consegui ler ${nome}: ${err.message}`);
    return fallback;
  }
}

const deputados = lerJson('deputados.json', []);
const senadores = lerJson('senadores.json', []);

// Perfil oficial do Instagram de cada parlamentar. A Câmara já devolve isso pra maioria dos
// deputados dentro de "redeSocial" (ver extrairInstagram abaixo) — essa lista só cobre quem
// não tem Instagram no dado aberto da Câmara/Senado (conferido manualmente, um por um, direto
// no Instagram de cada parlamentar em 01/09/2026). Se um dia a Câmara passar a devolver o
// Instagram desses também, o valor automático (redeSocial) tem prioridade sobre esse aqui.
const INSTAGRAM_MANUAL = {
  204419: 'https://www.instagram.com/glaustindafokus/', // Glaustin da Fokus
  220567: 'https://www.instagram.com/depjeferson10/', // Jeferson Rodrigues
  220566: 'https://www.instagram.com/ledaborgesm/', // Lêda Borges
  74371: 'https://www.instagram.com/rubensotoni/', // Rubens Otoni
  5895: 'https://www.instagram.com/senadorkajuru/', // Jorge Kajuru
  5899: 'https://www.instagram.com/vanderlancardosooficial/', // Vanderlan Cardoso
  5070: 'https://www.instagram.com/wildermorais/', // Wilder Morais
};

function extrairInstagram(p) {
  const doDado = (p.redeSocial || []).find((u) => /instagram\.com/i.test(u));
  return doDado || INSTAGRAM_MANUAL[p.id] || null;
}

const parlamentares = [
  ...deputados.filter((d) => d.uf === 'GO').map((d) => ({ ...d, cargo: 'Deputado Federal' })),
  ...senadores.filter((s) => s.uf === 'GO').map((s) => ({ ...s, cargo: 'Senador' })),
]
  .map((p) => ({ ...p, instagram: extrairInstagram(p) }))
  .sort((a, b) => a.nome.localeCompare(b.nome));

writeFileSync(destino, JSON.stringify(parlamentares, null, 2) + '\n');
console.log(`[gerar-parlamentares-go] ${parlamentares.length} parlamentares de GO gravados em ${destino}`);
