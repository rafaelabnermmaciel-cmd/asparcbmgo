// Casamento de nomes de parlamentares por aproximação — usado tanto pra casar os
// nomes que saem da Wikipédia (fetch-votos-go-2026.js) quanto os que saem do CSV do
// TSE (gerar-municipios-votos-go-2026.js) contra public/data/parlamentares-go.json.

export function normalizeName(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim();
}

// Títulos/tratamentos que aparecem num nome mas não no outro (ex: a Wikipédia chama de
// "Dr. José Machado" o mesmo deputado que a Alego lista como "José Machado").
const TITULOS = /^(DR\.?|DRA\.?|DELEGAD[OA]|CORONEL|MAJOR|CAPIT[AÃ]O|SARGENTO|PROFESSOR[A]?|PASTOR[A]?)\s+/;

function tirarTitulo(nomeNormalizado) {
  return nomeNormalizado.replace(TITULOS, '').trim();
}

// Casamento em duas etapas: nome normalizado exato primeiro; se não achar, tenta de
// novo sem título/tratamento e aceita quando as palavras de um nome são um subconjunto
// das palavras do outro (cobre apelidos como "Quirino" -> "Ricardo Quirino" e nomes
// parciais/nome de urna como "Wagner Neto" -> "Wagner Camargo Neto").
export function acharParlamentar(porNome, nome) {
  const direto = porNome.get(normalizeName(nome));
  if (direto) return direto;

  const alvo = tirarTitulo(normalizeName(nome));
  const palavrasAlvo = alvo.split(/\s+/).filter(Boolean);
  if (!palavrasAlvo.length) return null;

  for (const [chave, p] of porNome) {
    const candidato = tirarTitulo(chave);
    const palavrasCandidato = candidato.split(/\s+/).filter(Boolean);
    const [menor, maior] = palavrasAlvo.length <= palavrasCandidato.length
      ? [palavrasAlvo, palavrasCandidato]
      : [palavrasCandidato, palavrasAlvo];
    if (menor.length && menor.every((palavra) => maior.includes(palavra))) return p;
  }
  return null;
}

// acharParlamentar() casa por aproximação quando o nome de urna é um subconjunto de
// palavras de um nome já cadastrado — ótimo pra "Wagner Neto" -> "Wagner Camargo Neto",
// mas perigoso quando o nome de urna é uma ÚNICA palavra (ex: "Cardoso", sobrenome comum):
// nesse caso bateria com QUALQUER "Vanderlan Cardoso", "Iris Cardoso" etc. já cadastrado,
// mesmo sendo uma pessoa diferente (aconteceu de verdade com os dados de 2026 — ver
// histórico de fetch-votos-go-2026.js). Exige 2+ palavras no nome de urna antes de tentar a
// aproximação; nome de 1 palavra só casa por igualdade exata.
export function acharParlamentarSeguro(porNome, nome) {
  const direto = porNome.get(normalizeName(nome));
  if (direto) return direto;
  const palavras = (nome || '').trim().split(/\s+/).filter(Boolean);
  if (palavras.length < 2) return null;
  return acharParlamentar(porNome, nome);
}
