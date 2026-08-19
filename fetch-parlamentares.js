#!/usr/bin/env node
// Busca a lista completa de deputados federais (Câmara) e senadores (Senado) em exercício,
// com dados detalhados de cada um (gabinete, telefone, e-mail, foto, UF), e grava em
// public/data/deputados.json e public/data/senadores.json.
//
// ⚠️ ATENÇÃO — NUNCA EXECUTADO NESTE AMBIENTE: o ambiente de desenvolvimento onde este
// script foi escrito não tem acesso de rede a dadosabertos.camara.leg.br nem a
// legis.senado.leg.br (confirmado por teste direto — bloqueio de conexão). O script foi
// escrito com base na documentação pública dessas APIs, mas não pôde ser executado nem
// validado aqui. Rode-o você mesmo (localmente ou no build da Netlify) e revise a saída
// antes de confiar nos dados. Referências oficiais:
//   Câmara: https://dadosabertos.camara.leg.br/swagger/api.html
//   Senado: https://legis.senado.leg.br/dadosabertos/docs/
//
// Uso:
//   node scripts/fetch-parlamentares.js               # busca Câmara + Senado
//   node scripts/fetch-parlamentares.js --so-camara
//   node scripts/fetch-parlamentares.js --so-senado
//   node scripts/fetch-parlamentares.js --limit 10     # só os N primeiros de cada casa (teste)

import { getJson, mapWithConcurrency } from './lib/http.js';
import { writeJson } from './lib/checkpoint.js';

const CAMARA_BASE = 'https://dadosabertos.camara.leg.br/api/v2';
const SENADO_BASE = 'https://legis.senado.leg.br/dadosabertos';
const CONCURRENCY = 5; // não sobrecarregar as APIs públicas

const args = process.argv.slice(2);
const onlyCamara = args.includes('--so-camara');
const onlySenado = args.includes('--so-senado');
const limitArg = args.find((a) => a.startsWith('--limit'));
const limit = limitArg ? parseInt(args[args.indexOf(limitArg) + 1] || limitArg.split('=')[1] || '0', 10) : 0;

async function fetchDeputados() {
  console.log('[camara] buscando lista de deputados em exercício...');
  // itens=1000 traz tudo em uma página só (Câmara tem ~513 deputados titulares em exercício)
  const listaResp = await getJson(`${CAMARA_BASE}/deputados?itens=1000&ordem=ASC&ordenarPor=nome`);
  let lista = listaResp.dados || [];
  if (limit) lista = lista.slice(0, limit);
  console.log(`[camara] ${lista.length} deputados encontrados na listagem. Buscando detalhes...`);

  const detalhados = await mapWithConcurrency(lista, CONCURRENCY, async (dep, i) => {
    if (i % 25 === 0) console.log(`[camara] detalhe ${i + 1}/${lista.length}...`);
    try {
      const detResp = await getJson(`${CAMARA_BASE}/deputados/${dep.id}`);
      const d = detResp.dados;
      const status = d.ultimoStatus || {};
      return {
        id: d.id,
        casa: 'camara',
        nome: status.nome || d.nomeCivil,
        nomeCivil: d.nomeCivil,
        partido: status.siglaPartido || null,
        uf: status.siglaUf || null,
        situacao: status.situacao || null,
        condicaoEleitoral: status.condicaoEleitoral || null,
        foto: status.urlFoto || null,
        email: status.gabinete?.email || status.email || null,
        telefone: status.gabinete?.telefone || null,
        gabinete: status.gabinete
          ? {
              predio: status.gabinete.predio || null,
              sala: status.gabinete.sala || null,
              andar: status.gabinete.andar || null,
            }
          : null,
        dataNascimento: d.dataNascimento || null,
        municipioNascimento: d.municipioNascimento || null,
        ufNascimento: d.ufNascimento || null,
        sexo: d.sexo || null,
        redeSocial: d.redeSocial || [],
        urlCamara: `https://www.camara.leg.br/deputados/${d.id}`,
      };
    } catch (err) {
      console.error(`[camara] falhou ao buscar detalhe do deputado ${dep.id} (${dep.nome}): ${err.message}`);
      return null;
    }
  });

  return detalhados.filter(Boolean);
}

async function fetchSenadores() {
  console.log('[senado] buscando lista de senadores em exercício...');
  // Formato JSON: acrescentar .json ao endpoint (o padrão do Senado retorna XML)
  const listaResp = await getJson(`${SENADO_BASE}/senador/lista/atual.json`);
  // Estrutura observada historicamente: ListaParlamentarEmExercicio.Parlamentares.Parlamentar[]
  // ⚠️ não verificado nesta execução — confirme a chave exata na primeira rodada real.
  let lista =
    listaResp?.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar ||
    listaResp?.listaParlamentarEmExercicio?.parlamentares?.parlamentar ||
    [];
  if (!Array.isArray(lista)) lista = [lista].filter(Boolean);
  if (limit) lista = lista.slice(0, limit);
  console.log(`[senado] ${lista.length} senadores encontrados na listagem. Buscando detalhes...`);

  const detalhados = await mapWithConcurrency(lista, CONCURRENCY, async (sen, i) => {
    const ident = sen.IdentificacaoParlamentar || sen.identificacaoParlamentar || sen;
    const codigo = ident.CodigoParlamentar || ident.codigoParlamentar;
    if (i % 25 === 0) console.log(`[senado] detalhe ${i + 1}/${lista.length}...`);
    try {
      const detResp = await getJson(`${SENADO_BASE}/senador/${codigo}.json`);
      // ⚠️ chave exata do detalhe também não verificada nesta execução — ajuste conforme
      // a resposta real (DetalheParlamentar.Parlamentar.DadosBasicosParlamentar / .Mandato)
      const detalhe =
        detResp?.DetalheParlamentar?.Parlamentar ||
        detResp?.detalheParlamentar?.parlamentar ||
        {};
      const dados = detalhe.DadosBasicosParlamentar || detalhe.dadosBasicosParlamentar || {};
      const mandato = detalhe.Mandato || detalhe.mandato || {};
      const gabinete = detalhe.Telefones?.Telefone || detalhe.telefones?.telefone || null;

      return {
        id: codigo,
        casa: 'senado',
        nome: ident.NomeParlamentar || ident.nomeParlamentar,
        nomeCompleto: dados.NomeCompletoParlamentar || ident.NomeCompletoParlamentar || null,
        partido: ident.SiglaPartidoParlamentar || ident.siglaPartidoParlamentar || null,
        uf: ident.UfParlamentar || ident.ufParlamentar || null,
        situacao: mandato.DescricaoParticipacao || null,
        foto: ident.UrlFotoParlamentar || ident.urlFotoParlamentar || null,
        email: ident.EmailParlamentar || ident.emailParlamentar || null,
        telefone: Array.isArray(gabinete) ? gabinete[0]?.NumeroTelefone : gabinete?.NumeroTelefone || null,
        gabinete: null,
        dataNascimento: dados.DataNascimento || null,
        municipioNascimento: dados.NaturalidadeUF ? null : dados.Naturalidade || null,
        ufNascimento: dados.NaturalidadeUF || null,
        sexo: dados.SexoParlamentar || null,
        redeSocial: [],
        urlSenado: ident.UrlPaginaParlamentar || `https://www25.senado.leg.br/web/senadores/senador/-/perfil/${codigo}`,
      };
    } catch (err) {
      console.error(`[senado] falhou ao buscar detalhe do senador ${codigo} (${ident.NomeParlamentar}): ${err.message}`);
      return null;
    }
  });

  return detalhados.filter(Boolean);
}

async function main() {
  const tasks = [];
  if (!onlySenado) tasks.push(fetchDeputados().then((d) => writeJson('public/data/deputados.json', d)));
  if (!onlyCamara) tasks.push(fetchSenadores().then((d) => writeJson('public/data/senadores.json', d)));
  await Promise.all(tasks);
  console.log('[fetch-parlamentares] concluído. Confira public/data/deputados.json e public/data/senadores.json.');
}

main().catch((err) => {
  console.error('[fetch-parlamentares] falhou:', err);
  process.exit(1);
});
