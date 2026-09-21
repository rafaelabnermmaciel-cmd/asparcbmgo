#!/usr/bin/env node
// Calcula, pra cada parlamentar de Goiás (deputados federais, estaduais e o senador
// eleitos em 2022), os 10 municípios onde ele mais recebeu votos — e mescla esse campo
// (topMunicipios) em cada entrada já existente de public/data/votos-go-2022.json.
//
// Fonte: o arquivo oficial do TSE "Votação nominal por candidato, por município e
// zona" (dataset "Resultados - 2022" em dadosabertos.tse.jus.br), já filtrado pra
// Goiás. Esse arquivo é grande (~130MB) e dadosabertos.tse.jus.br bloqueia qualquer
// acesso vindo de servidor de nuvem/datacenter (ver o comentário no topo de
// fetch-votos-go-2022.js) — por isso ele não é baixado automaticamente aqui. Baixe-o
// manualmente (num computador comum, sem esse bloqueio) em
// https://dadosabertos.tse.jus.br/dataset/resultados-2022, recurso "Votação nominal
// por candidato" -> arquivo de Goiás, e passe o caminho como argumento:
//
//   node scripts/gerar-municipios-votos-go-2022.js /caminho/para/votacao_candidato_munzona_2022_GO.csv
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { normalizeName, acharParlamentar } from './lib/nomes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CASA_POR_CARGO = {
  'Deputado Federal': 'camara',
  'Deputado Estadual': 'alego',
  Senador: 'senado',
};

// Parser simples de uma linha CSV com ';' como delimitador — os campos de texto vêm
// entre aspas (com "" escapando aspas internas), os numéricos vêm sem aspas.
function dividirLinhaCsv(linha, delimitador = ';') {
  const campos = [];
  let i = 0;
  const n = linha.length;
  while (i <= n) {
    let campo;
    if (linha[i] === '"') {
      i++;
      let buf = '';
      while (i < n) {
        if (linha[i] === '"') {
          if (linha[i + 1] === '"') {
            buf += '"';
            i += 2;
            continue;
          }
          i++;
          break;
        }
        buf += linha[i];
        i++;
      }
      campo = buf;
      while (i < n && linha[i] !== delimitador) i++;
    } else {
      const inicio = i;
      while (i < n && linha[i] !== delimitador) i++;
      campo = linha.slice(inicio, i);
    }
    campos.push(campo);
    if (i < n && linha[i] === delimitador) i++;
    else break;
  }
  return campos;
}

function main() {
  const caminhoCsv = process.argv[2];
  if (!caminhoCsv) {
    console.error('Uso: node scripts/gerar-municipios-votos-go-2022.js <caminho-do-csv-do-tse>');
    process.exit(1);
  }

  console.log(`[municipios-votos] lendo ${caminhoCsv}...`);
  const conteudo = readFileSync(caminhoCsv, 'latin1');
  const linhas = conteudo.split(/\r\n|\n/).filter(Boolean);
  const cabecalho = dividirLinhaCsv(linhas[0]);
  const idx = Object.fromEntries(cabecalho.map((nome, i) => [nome, i]));
  for (const coluna of ['DS_CARGO', 'SQ_CANDIDATO', 'NM_CANDIDATO', 'NM_URNA_CANDIDATO', 'NM_MUNICIPIO', 'QT_VOTOS_NOMINAIS', 'DS_SIT_TOT_TURNO', 'SG_PARTIDO']) {
    if (!(coluna in idx)) throw new Error(`coluna esperada "${coluna}" não encontrada no cabeçalho do CSV`);
  }

  // Agrupa por candidato (SQ_CANDIDATO), somando os votos de cada município (um
  // candidato pode ter várias linhas no mesmo município quando ele tem mais de uma
  // zona eleitoral). Restringe a candidatos ELEITOS: com ~1000 candidatos concorrendo
  // (a maioria não eleita), nomes de urna parecidos — "Major X", "Delegado Y" — geram
  // falso-positivo no casamento por nome aproximado (acharParlamentar); restringindo a
  // só quem foi eleito, o universo cai pra ~60 pessoas e a ambiguidade desaparece.
  const candidatos = new Map();
  for (let i = 1; i < linhas.length; i++) {
    const c = dividirLinhaCsv(linhas[i]);
    const cargo = c[idx.DS_CARGO];
    if (!(cargo in CASA_POR_CARGO)) continue;
    if (!c[idx.DS_SIT_TOT_TURNO].startsWith('ELEITO')) continue;

    const sq = c[idx.SQ_CANDIDATO];
    const municipio = c[idx.NM_MUNICIPIO];
    const votos = parseInt(c[idx.QT_VOTOS_NOMINAIS], 10) || 0;

    let cand = candidatos.get(sq);
    if (!cand) {
      cand = {
        cargo,
        nome: c[idx.NM_CANDIDATO],
        nomeUrna: c[idx.NM_URNA_CANDIDATO],
        partido: c[idx.SG_PARTIDO],
        porMunicipio: new Map(),
      };
      candidatos.set(sq, cand);
    }
    cand.porMunicipio.set(municipio, (cand.porMunicipio.get(municipio) || 0) + votos);
  }
  console.log(`[municipios-votos] ${candidatos.size} candidatos (federal+estadual+senador) encontrados no arquivo.`);

  const caminhoParlamentares = path.resolve(__dirname, '../public/data/parlamentares-go.json');
  const parlamentares = JSON.parse(readFileSync(caminhoParlamentares, 'utf-8'));
  const porNomePorCasa = { camara: new Map(), alego: new Map(), senado: new Map() };
  for (const p of parlamentares) {
    if (porNomePorCasa[p.casa]) porNomePorCasa[p.casa].set(normalizeName(p.nome), p);
  }

  const caminhoVotos = path.resolve(__dirname, '../public/data/votos-go-2022.json');
  const votos = JSON.parse(readFileSync(caminhoVotos, 'utf-8'));

  let casados = 0;
  const naoCasados = [];
  for (const cand of candidatos.values()) {
    const casa = CASA_POR_CARGO[cand.cargo];
    const porNome = porNomePorCasa[casa];
    const p = acharParlamentar(porNome, cand.nomeUrna) || acharParlamentar(porNome, cand.nome);
    if (!p) continue; // maioria são candidatos não eleitos — esperado, não é erro.

    const municipiosOrdenados = [...cand.porMunicipio.entries()]
      .map(([municipio, votos]) => ({ municipio, votos }))
      .sort((a, b) => b.votos - a.votos);
    if (municipiosOrdenados.length < 10) continue;

    const chave = `${p.casa}:${p.id}`;
    const totalCsv = municipiosOrdenados.reduce((soma, m) => soma + m.votos, 0);
    let entrada = votos[chave];
    if (!entrada) {
      // O fetch-votos-go-2022.js (baseado na Wikipédia) não conseguiu casar esse nome —
      // como aqui temos o total oficial do TSE em mãos, cria a entrada do zero.
      entrada = { nome: p.nome, partido: cand.partido, votosNominais: totalCsv, ano: 2022, cargo: p.cargo };
      votos[chave] = entrada;
      naoCasados.push(`${cand.cargo}: ${cand.nomeUrna} (${chave} não existia em votos-go-2022.json — criada agora com os dados do TSE)`);
    }

    if (entrada.votosNominais && Math.abs(totalCsv - entrada.votosNominais) / entrada.votosNominais > 0.01) {
      console.warn(
        `[municipios-votos] aviso: total do CSV para ${p.nome} (${totalCsv}) difere do já registrado (${entrada.votosNominais}) em mais de 1%`
      );
    }

    entrada.topMunicipios = municipiosOrdenados.slice(0, 10);
    delete entrada.bottomMunicipios;
    casados++;
  }

  console.log(`[municipios-votos] ${casados} parlamentar(es) com detalhamento por município calculado.`);
  if (naoCasados.length) {
    console.warn(`[municipios-votos] ${naoCasados.length} candidato(s) casaram com um parlamentar, mas sem entrada correspondente em votos-go-2022.json:`);
    naoCasados.forEach((n) => console.warn('  -', n));
  }

  writeFileSync(caminhoVotos, JSON.stringify(votos, null, 2) + '\n');
  console.log(`[municipios-votos] gravado em ${caminhoVotos}`);
}

main();
