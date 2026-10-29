// Aplica o resultado da eleição de 2026 em public/data/parlamentares-go.json, a partir do
// que já está gravado em public/data/votos-go-2026.json (gerado por fetch-votos-go-2026.js).
//
// Propositalmente NÃO depende de nenhum arquivo intermediário/temporário — só desses dois
// arquivos que já ficam versionados — porque public/data/parlamentares-go.json é
// REGENERADO DO ZERO toda semana por scripts/gerar-parlamentares-go.js (workflow
// atualizar-dados-alego.yml, que busca os dados oficiais de novo e não sabe nada sobre
// 2026), o que apaga qualquer aviso2026/notaEleicao2026/parlamentar novo marcado aqui. Por
// isso .github/workflows/atualizar-dados-alego.yml roda este script de novo logo depois de
// gerar-parlamentares-go.js — e por isso ele precisa ser idempotente e não depender de
// arquivos que só existem na hora em que fetch-votos-go-2026.js roda.
//
// Regra (pedida pelo usuário): quem não foi reeleito continua no cadastro (nunca é
// removido), só ganha um aviso ("aviso2026"); quem é novo entra com os dados que já tem
// disponíveis, tirados do próprio votos-go-2026.json (o resto fica em branco, a definir);
// quem já estava cadastrado e concorreu (e ganhou) uma casa diferente da que já ocupava —
// ex: um deputado estadual que subiu pra Câmara — mantém o cadastro atual (mesmos
// stakeholders/captações já vinculados por nome) e ganha uma nota ("notaEleicao2026") em
// vez do aviso de não reeleição.
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
  const caminhoVotos = path.resolve(__dirname, '../public/data/votos-go-2026.json');
  const parlamentares = JSON.parse(readFileSync(caminhoParlamentares, 'utf-8'));
  const votos = JSON.parse(readFileSync(caminhoVotos, 'utf-8'));

  const porChave = new Map(parlamentares.map((p) => [`${p.casa}:${p.id}`, p]));

  let marcadosMudanca = 0;
  let adicionados = 0;

  // 1ª passada: casa quem já está cadastrado (pela chave casa:id — sobrevive à regeneração
  // semanal porque os ids vêm das fontes oficiais, que não mudam) e adiciona quem ainda não
  // existe no cadastro (ids sintéticos "2026-N", só pra gente eleita pela 1ª vez em 2026).
  for (const [chave, voto] of Object.entries(votos)) {
    const p = porChave.get(chave);
    if (p) {
      if (voto.eleito && voto.cargo !== p.cargo) {
        p.notaEleicao2026 = `Eleito(a) ${voto.cargo} em 2026 — deixa ${CASA_LEGIVEL[p.casa] || p.casa}.`;
        marcadosMudanca++;
      }
      // Reeleito(a) no mesmo cargo: nada pra marcar — o bloco "Votos recebidos na eleição de
      // 2026" já aparece sozinho no perfil, porque a chave casa:id bate direto.
    } else if (voto.eleito) {
      const [casa, id] = chave.split(':');
      const novo = { id, casa, cargo: voto.cargo, nome: voto.nome, partido: voto.partido || null, uf: 'GO' };
      parlamentares.push(novo);
      porChave.set(chave, novo);
      adicionados++;
    }
  }

  // 2ª passada: quem não tem voto de 2026 registrado (não concorreu, ou concorreu e
  // perdeu) ganha o aviso — exceto quem já ganhou a nota de mudança de casa acima.
  let marcadosAviso = 0;
  for (const p of parlamentares) {
    const chave = `${p.casa}:${p.id}`;
    if (SEM_DISPUTA_EM_2026.has(chave) || p.notaEleicao2026) continue;
    const voto = votos[chave];
    if (!voto || voto.eleito === false) {
      p.aviso2026 = 'Em exercício até 2026.';
      marcadosAviso++;
    }
  }

  writeFileSync(caminhoParlamentares, JSON.stringify(parlamentares, null, 2) + '\n');

  console.log(`[aplicar-resultados-2026] ${marcadosAviso} parlamentar(es) marcado(s) com aviso2026 (não reeleito(s)).`);
  console.log(`[aplicar-resultados-2026] ${marcadosMudanca} parlamentar(es) marcado(s) com notaEleicao2026 (mudaram de casa).`);
  console.log(`[aplicar-resultados-2026] ${adicionados} novo(s) parlamentar(es) adicionado(s) ao cadastro (com voto de 2026 já vinculado).`);
  console.log(`[aplicar-resultados-2026] gravado em ${caminhoParlamentares}`);
}

main();
