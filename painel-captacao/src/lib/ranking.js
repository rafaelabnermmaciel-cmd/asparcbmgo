// Gamificação: agrega os cadastros de captação (e seus andamentos) por quartel. Cada quartel
// cadastrado em quarteis.json entra com zero mesmo sem nenhum cadastro ainda (pra aparecer no
// ranking geral e servir de convite/incentivo), e quartéis que só existem nos cadastros (ainda
// não cadastrados oficialmente na lista) também aparecem, pra nada ficar escondido.
export function computeQuartelRanking(captacoes, quarteis, eventos = []) {
  const porQuartel = new Map();
  const quartelPorCaptacao = new Map();

  function garantir(key, nome, municipio) {
    if (!porQuartel.has(key)) {
      porQuartel.set(key, {
        quartelId: key,
        nome,
        municipio,
        qtdArticulacoes: 0,
        qtdReunioes: 0,
        totalPrevisto: 0,
        totalIndicado: 0,
        qtdIndicadas: 0,
      });
    }
    return porQuartel.get(key);
  }

  quarteis.forEach((q) => garantir(q.id, q.nome, q.municipio));

  captacoes.forEach((c) => {
    const key = c.quartelId || 'sem-quartel';
    quartelPorCaptacao.set(c.id, key);
    const q = garantir(key, c.quartelNome || 'Não identificado', c.municipio || '');
    q.qtdArticulacoes += 1;
    q.totalPrevisto += c.valorPrevisto || 0;
    if (c.status === 'Indicado') {
      q.totalIndicado += c.valorPrevisto || 0;
      q.qtdIndicadas += 1;
    }
  });

  // Reuniões = andamentos lançados na linha do tempo de cada captação (ver CaptacaoTimeline.jsx).
  eventos.forEach((e) => {
    const key = quartelPorCaptacao.get(e.captacao_id);
    if (key && porQuartel.has(key)) porQuartel.get(key).qtdReunioes += 1;
  });

  return [...porQuartel.values()];
}

export function rankPorCaptacao(lista) {
  return [...lista].sort((a, b) => b.totalPrevisto - a.totalPrevisto);
}

// "Articulação" pesa cadastros (o esforço de abrir/manter a frente) e reuniões (a
// recorrência do contato) — não é só volume de dinheiro, é o trabalho de relacionamento.
export function rankPorArticulacao(lista) {
  return [...lista].sort((a, b) => (b.qtdArticulacoes * 2 + b.qtdReunioes) - (a.qtdArticulacoes * 2 + a.qtdReunioes));
}

// Faixas de reconhecimento por valor captado (previsto) — limiares arbitrários, ajuste
// livremente conforme a realidade dos valores movimentados pelo CBMGO.
const NIVEIS = [
  { min: 2_000_000, nome: 'Diamante', emoji: '💎' },
  { min: 800_000, nome: 'Ouro', emoji: '🥇' },
  { min: 300_000, nome: 'Prata', emoji: '🥈' },
  { min: 1, nome: 'Bronze', emoji: '🥉' },
  { min: 0, nome: 'Sem captação ainda', emoji: '—' },
];

export function nivelQuartel(totalPrevisto) {
  return NIVEIS.find((n) => totalPrevisto >= n.min) || NIVEIS[NIVEIS.length - 1];
}
