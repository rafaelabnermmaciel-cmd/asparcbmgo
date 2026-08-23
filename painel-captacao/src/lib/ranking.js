// Gamificação: agrega os cadastros de captação por quartel. Cada quartel cadastrado em
// quarteis.json entra com zero mesmo sem nenhum cadastro ainda (pra aparecer no ranking geral
// e servir de convite/incentivo), e quartéis que só existem nos cadastros (ainda não cadastrados
// oficialmente na lista) também aparecem, pra nada ficar escondido.
export function computeQuartelRanking(captacoes, quarteis) {
  const porQuartel = new Map();

  quarteis.forEach((q) => {
    porQuartel.set(q.id, {
      quartelId: q.id,
      nome: q.nome,
      municipio: q.municipio,
      qtdArticulacoes: 0,
      qtdReunioes: 0,
      totalPrevisto: 0,
      totalConfirmado: 0,
      qtdDestinadas: 0,
    });
  });

  captacoes.forEach((c) => {
    const key = c.quartelId || 'sem-quartel';
    if (!porQuartel.has(key)) {
      porQuartel.set(key, {
        quartelId: key,
        nome: c.quartelNome || 'Não identificado',
        municipio: c.municipio || '',
        qtdArticulacoes: 0,
        qtdReunioes: 0,
        totalPrevisto: 0,
        totalConfirmado: 0,
        qtdDestinadas: 0,
      });
    }
    const q = porQuartel.get(key);
    q.qtdArticulacoes += 1;
    q.qtdReunioes += c.numReunioes || 0;
    q.totalPrevisto += c.valorPrevisto || 0;
    q.totalConfirmado += c.valorConfirmado || 0;
    if (c.status === 'Destinado') q.qtdDestinadas += 1;
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
