import { useEffect, useState } from 'react';

// Os JSONs em /public/data são gerados pelos scripts em /scripts (ver README). Em
// desenvolvimento local, antes de rodar os scripts, os arquivos existem mas estão vazios
// ([] ou {}) — o app deve funcionar (com estado vazio) mesmo sem dados reais ainda.

async function fetchJson(path, fallback) {
  try {
    const res = await fetch(path);
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
        fetchJson('/data/deputados.json', []),
        fetchJson('/data/senadores.json', []),
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
    fetchJson('/data/votacoes.json', {}).then((votacoes) => {
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
    fetchJson('/data/resultados-eleitorais.json', {}).then((resultados) => {
      if (!cancelled) setState({ loading: false, resultados });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

export function useLegislativo() {
  const [state, setState] = useState({ loading: true, dados: null });
  useEffect(() => {
    let cancelled = false;
    fetchJson('/data/acompanhamento-legislativo.json', null).then((dados) => {
      if (!cancelled) setState({ loading: false, dados });
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
