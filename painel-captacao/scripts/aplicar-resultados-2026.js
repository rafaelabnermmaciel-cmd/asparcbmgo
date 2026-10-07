// Aplica o resultado da eleição de 2026 em public/data/parlamentares-go.json, a partir dos
// arquivos gerados por fetch-votos-go-2026.js (votos-go-2026.json, novos-eleitos-2026.json,
// mudancas-casa-2026.json). Não roda sozinho — sempre depois do fetch, na mesma pipeline
// (ver .github/workflows/publicar-painel-captacao.yml ou o workflow que chamou este script).
//
// Regra (pedida pelo usuário): quem não foi reeleito continua no cadastro (nunca é
// removido), só ganha um aviso ("aviso2026"); quem é novo entra com os dados que já tem
// disponíveis (o resto fica em branco, a definir); quem já estava cadastrado e concorreu
// (e ganhou) uma casa diferente da que já ocupava — ex: um deputado estadual que subiu pra
// Câmara — mantém o cadastro atual (mesmos stakeholders/captações já vinculados por nome)
// e ganha uma nota ("notaEleicao2026") em vez do aviso de não reeleição.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CASA_LEGIVEL = {
  camara: 'Câmara dos Deputados',
  senado: 'Senado Federal',
  alego: 'Assembleia Legislativa (ALEGO)',
};

// Único caso em que "não apareceu no resultado de 2026" NÃO significa "não foi reeleito":
// Wilder Morais foi eleito senador em 2022 (mandato até 2031, cadeira não disputada em
// 2026) — em 2026 ele concorreu a governador e perdeu, mas isso não afeta o mandato de
// senador que já tem. Ver scripts/fetch-votos-go-2022.js pra mais contexto sobre o
// escalonamento das vagas do Senado (1/3 e 2/3 alternados a cada eleição).
const SEM_DISPUTA_EM_2026 = new Set(['senado:5070']);

function main() {
  const caminhoParlamentares = path.resolve(__dirname, '../public/data/parlamentares-go.json');
  const parlamentares = JSON.parse(readFileSync(caminhoParlamentares, 'utf-8'));

  const votos = JSON.parse(readFileSync(path.resolve(__dirname, '../public/data/votos-go-2026.json'), 'utf-8'));
  const novosEleitos = JSON.parse(readFileSync(path.resolve(__dirname, '../novos-eleitos-2026.json'), 'utf-8'));
  const mudancasDeCasa = JSON.parse(readFileSync(path.resolve(__dirname, '../mudancas-casa-2026.json'), 'utf-8'));
  const mudancaPorChave = new Map(mudancasDeCasa.map((m) => [m.chave, m]));

  let marcadosAviso = 0;
  let marcadosMudanca = 0;

  for (const p of parlamentares) {
    const chave = `${p.casa}:${p.id}`;
    if (SEM_DISPUTA_EM_2026.has(chave)) continue;

    const voto = votos[chave];
    const mudanca = mudancaPorChave.get(chave);

    if (mudanca && voto?.eleito) {
      p.notaEleicao2026 = `Eleito(a) ${mudanca.cargoNovo} em 2026 — deixa ${CASA_LEGIVEL[mudanca.casaAnterior] || mudanca.casaAnterior}.`;
      marcadosMudanca++;
    } else if (!voto || voto.eleito === false) {
      p.aviso2026 = 'Em exercício até 2026.';
      marcadosAviso++;
    }
  }

  let proximoId = 1;
  for (const n of novosEleitos) {
    const id = `2026-${proximoId++}`;
    parlamentares.push({
      id,
      casa: n.casa,
      cargo: n.cargo,
      nome: n.nome,
      partido: n.partido || null,
      uf: 'GO',
    });
    // Sem isso o novo parlamentar nunca ganha o bloco "Votos recebidos na eleição de 2026"
    // no perfil (useResultadosEleitorais busca em votos-go-2026.json pela chave casa:id, e
    // só agora, com o id sintético definido, dá pra saber essa chave).
    votos[`${n.casa}:${id}`] = { nome: n.nome, partido: n.partido || null, votosNominais: n.votos, ano: 2026, cargo: n.cargo, eleito: true };
  }

  writeFileSync(caminhoParlamentares, JSON.stringify(parlamentares, null, 2) + '\n');
  writeFileSync(path.resolve(__dirname, '../public/data/votos-go-2026.json'), JSON.stringify(votos, null, 2) + '\n');

  console.log(`[aplicar-resultados-2026] ${marcadosAviso} parlamentar(es) marcado(s) com aviso2026 (não reeleito(s)).`);
  console.log(`[aplicar-resultados-2026] ${marcadosMudanca} parlamentar(es) marcado(s) com notaEleicao2026 (mudaram de casa).`);
  console.log(`[aplicar-resultados-2026] ${novosEleitos.length} novo(s) parlamentar(es) adicionado(s) ao cadastro (com voto de 2026 já vinculado).`);
  console.log(`[aplicar-resultados-2026] gravado em ${caminhoParlamentares}`);
}

main();
