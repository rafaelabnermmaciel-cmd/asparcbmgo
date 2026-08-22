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

const parlamentares = [
  ...deputados.filter((d) => d.uf === 'GO').map((d) => ({ ...d, cargo: 'Deputado Federal' })),
  ...senadores.filter((s) => s.uf === 'GO').map((s) => ({ ...s, cargo: 'Senador' })),
].sort((a, b) => a.nome.localeCompare(b.nome));

writeFileSync(destino, JSON.stringify(parlamentares, null, 2) + '\n');
console.log(`[gerar-parlamentares-go] ${parlamentares.length} parlamentares de GO gravados em ${destino}`);
