#!/usr/bin/env node
// Calcula, pra cada parlamentar de Goiás eleito em 2026 (deputados federais, estaduais e
// os 2 senadores), os 10 municípios onde ele mais recebeu votos — e mescla esse campo
// (topMunicipios) em cada entrada já existente de public/data/votos-go-2026.json. Mesma
// ideia de scripts/gerar-municipios-votos-go-2022.js, adaptada pra 2026.
//
// Fonte: o arquivo oficial do TSE "Votação nominal por candidato, por município e zona"
// (https://dadosabertos.tse.jus.br/dataset/resultados-2026, recurso "votacao_candidato_
// munzona_2026.zip" em cdn.tse.jus.br) — diferente do de 2022, esse arquivo respondeu
// normalmente a partir de GitHub Actions (sem o bloqueio de IP de nuvem que os outros
// endpoints do TSE têm — ver fetch-votos-go-2022.js), então pode ser baixado e
// descompactado direto no workflow, sem precisar de passo manual. Mesmo assim o script
// aceita um caminho de arquivo (CSV da UF de Goiás) como argumento, caso precise rodar
// com um arquivo baixado manualmente:
//
//   node scripts/gerar-municipios-votos-go-2026.js /caminho/para/votacao_candidato_munzona_2026_GO.csv
//
// Usa acharParlamentarSeguro (não acharParlamentar) e NÃO filtra o universo de busca por
// casa/cargo antes de casar o nome — igual ao fetch-votos-go-2026.js — porque em 2026 teve
// gente que mudou de casa (ex: um deputado estadual que virou federal); a pessoa já
// cadastrada precisa ser achada pelo nome em QUALQUER casa, e a chave final usa a casa
// ATUAL dela no cadastro (`p.casa:p.id`), não a casa da disputa de 2026.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { normalizeName, acharParlamentarSeguro } from './lib/nomes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CARGOS_RELEVANTES = new Set(['DEPUTADO FEDERAL', 'DEPUTADO ESTADUAL', 'SENADOR']);

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
    console.error('Uso: node scripts/gerar-municipios-votos-go-2026.js <caminho-do-csv-do-tse-GO>');
    process.exit(1);
  }

  console.log(`[municipios-votos-2026] lendo ${caminhoCsv}...`);
  const conteudo = readFileSync(caminhoCsv, 'latin1');
  const linhas = conteudo.split(/\r\n|\n/).filter(Boolean);
  const cabecalho = dividirLinhaCsv(linhas[0]);
  const idx = Object.fromEntries(cabecalho.map((nome, i) => [nome, i]));
  for (const coluna of ['DS_CARGO', 'SQ_CANDIDATO', 'NM_CANDIDATO', 'NM_URNA_CANDIDATO', 'NM_MUNICIPIO', 'QT_VOTOS_NOMINAIS', 'DS_SIT_TOT_TURNO', 'SG_PARTIDO']) {
    if (!(coluna in idx)) throw new Error(`coluna esperada "${coluna}" não encontrada no cabeçalho do CSV`);
  }

  // Agrupa por candidato (SQ_CANDIDATO), somando os votos de cada município (um
  // candidato pode ter várias linhas no mesmo município quando ele tem mais de uma zona
  // eleitoral). Restringe a candidatos ELEITOS: com um universo bem maior de candidatos
  // concorrendo, nomes de urna parecidos geram falso-positivo no casamento por nome
  // aproximado; restringindo a só quem foi eleito, o universo cai bastante e a
  // ambiguidade quase desaparece (e o que sobra, acharParlamentarSeguro blinda).
  const candidatos = new Map();
  for (let i = 1; i < linhas.length; i++) {
    const c = dividirLinhaCsv(linhas[i]);
    const cargo = (c[idx.DS_CARGO] || '').trim().toUpperCase();
    if (!CARGOS_RELEVANTES.has(cargo)) continue;
    if (!c[idx.DS_SIT_TOT_TURNO].startsWith('ELEITO')) continue;

    const sq = c[idx.SQ_CANDIDATO];
    const municipio = c[idx.NM_MUNICIPIO];
    const votos = parseInt(c[idx.QT_VOTOS_NOMINAIS], 10) || 0;

    let cand = candidatos.get(sq);
    if (!cand) {
      cand = {
        cargo: c[idx.DS_CARGO],
        nome: c[idx.NM_CANDIDATO],
        nomeUrna: c[idx.NM_URNA_CANDIDATO],
        partido: c[idx.SG_PARTIDO],
        porMunicipio: new Map(),
      };
      candidatos.set(sq, cand);
    }
    cand.porMunicipio.set(municipio, (cand.porMunicipio.get(municipio) || 0) + votos);
  }
  console.log(`[municipios-votos-2026] ${candidatos.size} candidato(s) eleito(s) (federal+estadual+senador) encontrado(s) no arquivo.`);

  const caminhoParlamentares = path.resolve(__dirname, '../public/data/parlamentares-go.json');
  const parlamentares = JSON.parse(readFileSync(caminhoParlamentares, 'utf-8'));
  const porNome = new Map(parlamentares.map((p) => [normalizeName(p.nome), p]));

  const caminhoVotos = path.resolve(__dirname, '../public/data/votos-go-2026.json');
  const votos = JSON.parse(readFileSync(caminhoVotos, 'utf-8'));

  let casados = 0;
  const naoCasados = [];
  for (const cand of candidatos.values()) {
    const p = acharParlamentarSeguro(porNome, cand.nomeUrna) || acharParlamentarSeguro(porNome, cand.nome);
    if (!p) {
      naoCasados.push(`${cand.cargo}: ${cand.nomeUrna} (não achado no cadastro atual)`);
      continue;
    }

    const municipiosOrdenados = [...cand.porMunicipio.entries()]
      .map(([municipio, votos]) => ({ municipio, votos }))
      .sort((a, b) => b.votos - a.votos);
    if (municipiosOrdenados.length < 10) continue;

    const chave = `${p.casa}:${p.id}`;
    const totalCsv = municipiosOrdenados.reduce((soma, m) => soma + m.votos, 0);
    let entrada = votos[chave];
    if (!entrada) {
      // fetch-votos-go-2026.js não conseguiu casar esse nome — como aqui temos o total
      // oficial do TSE em mãos, cria a entrada do zero.
      entrada = { nome: p.nome, partido: cand.partido, votosNominais: totalCsv, ano: 2026, cargo: p.cargo, eleito: true };
      votos[chave] = entrada;
    }

    if (entrada.votosNominais && Math.abs(totalCsv - entrada.votosNominais) / entrada.votosNominais > 0.01) {
      console.warn(
        `[municipios-votos-2026] aviso: total do CSV para ${p.nome} (${totalCsv}) difere do já registrado (${entrada.votosNominais}) em mais de 1%`
      );
    }

    entrada.topMunicipios = municipiosOrdenados.slice(0, 10);
    casados++;
  }

  console.log(`[municipios-votos-2026] ${casados} parlamentar(es) com detalhamento por município calculado.`);
  if (naoCasados.length) {
    console.warn(`[municipios-votos-2026] ${naoCasados.length} candidato(s) eleito(s) não encontrado(s) no cadastro atual (inesperado — conferir):`);
    naoCasados.forEach((n) => console.warn('  -', n));
  }

  writeFileSync(caminhoVotos, JSON.stringify(votos, null, 2) + '\n');
  console.log(`[municipios-votos-2026] gravado em ${caminhoVotos}`);
}

main();
