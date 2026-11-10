#!/usr/bin/env node
// Preenche public/data/resultados-eleitorais.json com os votos recebidos em 2022 E em 2026
// (com os 10 municípios onde cada parlamentar mais recebeu votos) pros deputados federais e
// senadores de Goiás, e garante que os parlamentares eleitos pela 1ª vez em 2026 — ainda sem
// registro nas APIs oficiais da Câmara/Senado, que só vão refletir a nova legislatura quando
// ela tomar posse (fev/2027) — apareçam no painel mesmo assim.
//
// Não busca nada na internet: reaproveita o trabalho já feito e validado em
// ../painel-captacao/scripts/{fetch-votos-go-2022,fetch-votos-go-2026,gerar-municipios-votos-go-*}.js,
// cujo resultado já está gravado (e confirmado manualmente contra o TSE) em
// ../painel-captacao/public/data/votos-go-{2022,2026}.json. O TSE bloqueia IP de nuvem/
// datacenter com 403 pra consulta direta (motivo de scripts/fetch-eleicoes.js nunca ter sido
// confiável nesse ambiente) — esses arquivos da painel-captacao usaram outras fontes (Wikipédia
// pros nomes/votos totais + o CSV oficial de "votação por município" pro detalhamento, que esse
// sim respondeu normal a partir do GitHub Actions) pra contornar isso.
//
// Idempotente e seguro de rodar depois de "npm run fetch:parlamentares" (que REGENERA
// deputados.json/senadores.json do zero a partir da Câmara/Senado oficiais a cada rodada
// semanal) — mesma razão e mesmo desenho de
// ../painel-captacao/scripts/aplicar-resultados-2026.js: sem reaplicar isso depois de toda
// atualização, os parlamentares novos de 2026 e os avisos de não reeleição desapareceriam de
// novo na primeira segunda-feira (ver .github/workflows/atualizar-dados-painel-nacional.yml).
//
// Uso:
//   node scripts/sync-resultados-go.js

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { writeJson } from './lib/checkpoint.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR_CAPTACAO = path.resolve(__dirname, '../../painel-captacao/public/data');

// Único caso em que "não apareceu no resultado de 2026" NÃO significa "não foi reeleito":
// Wilder Morais foi eleito senador em 2022 (mandato até 2031 — o Senado renova 1/3 e 2/3 das
// cadeiras alternadamente a cada eleição, e a dele não estava em disputa em 2026). Mesma
// ressalva de ../painel-captacao/scripts/aplicar-resultados-2026.js.
const SEM_DISPUTA_EM_2026 = new Set(['senado:5070']);

const CASA_LEGIVEL = { camara: 'Câmara dos Deputados', senado: 'Senado Federal' };

function lerJson(base, nome, fallback) {
  try {
    return JSON.parse(readFileSync(path.join(base, nome), 'utf-8'));
  } catch (err) {
    console.warn(`[sync-resultados-go] não consegui ler ${nome}: ${err.message}`);
    return fallback;
  }
}

function main() {
  const votos2022 = lerJson(DIR_CAPTACAO, 'votos-go-2022.json', {});
  const votos2026 = lerJson(DIR_CAPTACAO, 'votos-go-2026.json', {});
  const deputados = lerJson(path.resolve(__dirname, '../public/data'), 'deputados.json', []);
  const senadores = lerJson(path.resolve(__dirname, '../public/data'), 'senadores.json', []);

  // --- 1) Monta resultados-eleitorais.json: um array por parlamentar, mais recente primeiro ---
  // Só casa:id de Câmara/Senado — votos-go-{2022,2026}.json também tem deputados estaduais da
  // ALEGO (casa "alego"), fora do escopo deste painel nacional.
  const resultados = {};
  function empilhar(votos, ano) {
    for (const [chave, v] of Object.entries(votos)) {
      const casa = chave.split(':')[0];
      if (casa !== 'camara' && casa !== 'senado') continue;
      // Alguns senadores (ex.: Vanderlan Cardoso nos dois anos, Jorge Kajuru em 2022) têm
      // votosNominais mas nunca ganharam o detalhamento por município (gerar-municipios-votos-
      // go-20XX.js não achou linha suficiente/não casou) — mantém o total mesmo assim; a seção
      // de "top municípios" no perfil já esconde sozinha quando a lista vem vazia.
      (resultados[chave] ||= []).push({
        ano,
        partido: v.partido || null,
        votosNominais: v.votosNominais || 0,
        cargo: v.cargo || null,
        eleito: v.eleito ?? true, // 2022 não grava "eleito" — estar na lista já implica que venceu naquela eleição
        topMunicipios: v.topMunicipios || [],
      });
    }
  }
  empilhar(votos2026, 2026);
  empilhar(votos2022, 2022);
  for (const lista of Object.values(resultados)) lista.sort((a, b) => b.ano - a.ano);

  writeJson('public/data/resultados-eleitorais.json', resultados);
  console.log(`[sync-resultados-go] ${Object.keys(resultados).length} parlamentar(es) de GO com resultado eleitoral (2022 e/ou 2026, top 10 municípios).`);

  // --- 2) Aplica o resultado de 2026 em deputados.json/senadores.json: adiciona quem é novo,
  // avisa quem não foi reeleito, marca quem mudou de casa (ex.: deputado -> senador) ---
  // deputados.json/senadores.json (vindos direto da API oficial) não gravam um campo "cargo"
  // no arquivo — ele só existe depois, calculado em tempo de execução no front-end (ver
  // useParlamentares em lib/data.js: "Deputado Federal"/"Senador" conforme a lista de onde veio).
  // Por isso o cargo "atual" de quem já está cadastrado é implícito pela própria casa, nunca lido
  // do objeto — comparar com um "existente.cargo" inexistente faria TODO reeleito no mesmo cargo
  // bater como "mudança de casa" (visto na prática: 12 falsos positivos antes desta checagem usar
  // CARGO_DA_CASA em vez de existente.cargo).
  const CARGO_DA_CASA = { camara: 'Deputado Federal', senado: 'Senador' };

  function aplicar(lista, casa, chavesDoCadastro) {
    let adicionados = 0;
    let mudancasDeCasa = 0;
    for (const [chave, v] of Object.entries(votos2026)) {
      const [casaVoto, id] = chave.split(':');
      if (casaVoto !== casa) continue;
      const existente = chavesDoCadastro.get(chave);
      if (existente) {
        if (v.eleito && v.cargo && v.cargo !== CARGO_DA_CASA[casa]) {
          existente.notaEleicao2026 = `Eleito(a) ${v.cargo} em 2026 — deixa ${CASA_LEGIVEL[casa]}.`;
          mudancasDeCasa++;
        }
      } else if (v.eleito) {
        // Parlamentar eleito pela 1ª vez em 2026, ainda sem registro oficial da Câmara/Senado
        // (só vai aparecer lá quando a nova legislatura tomar posse) — entra com o que já se
        // sabe (nome, partido); o resto (foto, gabinete, e-mail...) fica em branco até lá.
        const novo = {
          id,
          casa,
          nome: v.nome,
          nomeCivil: null,
          partido: v.partido || null,
          uf: 'GO',
          situacao: 'Eleito(a) em 2026 — aguardando posse da nova legislatura (fev/2027)',
          condicaoEleitoral: null,
          foto: null,
          email: null,
          telefone: null,
          gabinete: null,
          dataNascimento: null,
          municipioNascimento: null,
          ufNascimento: null,
          sexo: null,
          redeSocial: [],
          [casa === 'camara' ? 'urlCamara' : 'urlSenado']: null,
        };
        lista.push(novo);
        chavesDoCadastro.set(chave, novo);
        adicionados++;
      }
    }

    let avisos = 0;
    for (const p of lista) {
      if (p.uf !== 'GO') continue; // só GO tem resultado eleitoral carregado aqui
      const chave = `${casa}:${p.id}`;
      if (SEM_DISPUTA_EM_2026.has(chave) || p.notaEleicao2026) continue;
      const voto = votos2026[chave];
      if (!voto || voto.eleito === false) {
        p.aviso2026 = 'Em exercício até o fim da legislatura atual — não concorreu ou não se reelegeu em 2026.';
        avisos++;
      }
    }
    return { adicionados, mudancasDeCasa, avisos };
  }

  const chavesDeputados = new Map(deputados.map((d) => [`camara:${d.id}`, d]));
  const chavesSenadores = new Map(senadores.map((s) => [`senado:${s.id}`, s]));
  const resCamara = aplicar(deputados, 'camara', chavesDeputados);
  const resSenado = aplicar(senadores, 'senado', chavesSenadores);

  writeJson('public/data/deputados.json', deputados);
  writeJson('public/data/senadores.json', senadores);

  console.log(
    `[sync-resultados-go] Câmara(GO): ${resCamara.adicionados} novo(s), ${resCamara.mudancasDeCasa} mudança(s) de casa, ${resCamara.avisos} aviso(s) de não reeleição.`
  );
  console.log(
    `[sync-resultados-go] Senado(GO): ${resSenado.adicionados} novo(s), ${resSenado.mudancasDeCasa} mudança(s) de casa, ${resSenado.avisos} aviso(s) de não reeleição.`
  );
}

main();
