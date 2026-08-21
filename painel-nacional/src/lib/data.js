import { useEffect, useState } from 'react';

// Os JSONs em /public/data são gerados pelos scripts em /scripts (ver README). Em
// desenvolvimento local, antes de rodar os scripts, os arquivos existem mas estão vazios
// ([] ou {}) — o app deve funcionar (com estado vazio) mesmo sem dados reais ainda.

async function fetchJson(path, fallback) {
  try {
    // no-cache: revalida com o servidor a cada carregamento — esses JSONs são atualizados
    // por automação (GitHub Actions), e cache heurístico do navegador esconderia dados novos.
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${res.status} ao buscar ${path}`);
    return await res.json();
  } catch (err) {
    console.warn(`[data] falha ao carregar ${path}:`, err.message);
    return fallback;
  }
}

/** Carrega deputados + senadores e devolve uma lista única normalizada. */
export function useParlamentares() {
  const [state, setState] = useState({ loading: true, parlamentares: [], error: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [deputados, senadores] = await Promise.all([
        fetchJson(`${import.meta.env.BASE_URL}data/deputados.json`, []),
        fetchJson(`${import.meta.env.BASE_URL}data/senadores.json`, []),
      ]);
      if (cancelled) return;
      const parlamentares = [
        ...deputados.map((d) => ({ ...d, cargo: 'Deputado Federal' })),
        ...senadores.map((s) => ({ ...s, cargo: 'Senador' })),
      ];
      setState({ loading: false, parlamentares, error: null });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export function useVotacoes() {
  const [state, setState] = useState({ loading: true, votacoes: {} });
  useEffect(() => {
    let cancelled = false;
    fetchJson(`${import.meta.env.BASE_URL}data/votacoes.json`, {}).then((votacoes) => {
      if (!cancelled) setState({ loading: false, votacoes });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

export function useResultadosEleitorais() {
  const [state, setState] = useState({ loading: true, resultados: {} });
  useEffect(() => {
    let cancelled = false;
    fetchJson(`${import.meta.env.BASE_URL}data/resultados-eleitorais.json`, {}).then((resultados) => {
      if (!cancelled) setState({ loading: false, resultados });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB',
  'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

/** Parlamentares com aniversário nos próximos `dias` dias (hoje incluso), mais próximo primeiro. */
export function proximosAniversarios(parlamentares, dias = 14) {
  const hoje = new Date();
  const hojeUTC = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return parlamentares
    .map((p) => {
      const partes = p.dataNascimento?.split('-');
      if (!partes || partes.length < 3) return null;
      const mes = parseInt(partes[1], 10) - 1;
      const dia = parseInt(partes[2], 10);
      let proxUTC = Date.UTC(hoje.getFullYear(), mes, dia);
      if (proxUTC < hojeUTC) proxUTC = Date.UTC(hoje.getFullYear() + 1, mes, dia);
      const diffDias = Math.round((proxUTC - hojeUTC) / 86400000);
      return diffDias <= dias ? { ...p, diffDias } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.diffDias - b.diffDias);
}

export function initials(name) {
  if (!name) return '';
  return name
    .split(' ')
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}
