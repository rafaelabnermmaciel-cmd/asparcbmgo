import { useEffect, useState, useCallback } from 'react';

// Os JSONs em /public/data são a "leitura" do painel. Deputados/senadores/votos vêm filtrados
// do painel-nacional (ver scripts/gerar-parlamentares-go.js); quartéis e captações são
// próprios deste app. cache: 'no-cache' porque captacoes.json é atualizado por commits
// automáticos (ver netlify/functions/cadastrar.js) — cache do navegador esconderia cadastros
// novos de outras pessoas.
async function fetchJson(path, fallback) {
  try {
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${res.status} ao buscar ${path}`);
    return await res.json();
  } catch (err) {
    console.warn(`[data] falha ao carregar ${path}:`, err.message);
    return fallback;
  }
}

export function useParlamentaresGO() {
  const [state, setState] = useState({ loading: true, parlamentares: [] });
  useEffect(() => {
    let cancelled = false;
    fetchJson(`${import.meta.env.BASE_URL}data/parlamentares-go.json`, []).then((parlamentares) => {
      if (!cancelled) setState({ loading: false, parlamentares });
    });
    return () => { cancelled = true; };
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
    return () => { cancelled = true; };
  }, []);
  return state;
}

export function useQuarteis() {
  const [state, setState] = useState({ loading: true, quarteis: [], rascunho: false, observacao: null });
  useEffect(() => {
    let cancelled = false;
    fetchJson(`${import.meta.env.BASE_URL}data/quarteis.json`, { quarteis: [] }).then((data) => {
      if (!cancelled) setState({ loading: false, quarteis: data.quarteis || [], rascunho: !!data.rascunho, observacao: data.observacao || null });
    });
    return () => { cancelled = true; };
  }, []);
  return state;
}

export function useInterlocutores() {
  const [state, setState] = useState({ loading: true, interlocutores: {} });
  useEffect(() => {
    let cancelled = false;
    fetchJson(`${import.meta.env.BASE_URL}data/interlocutores.json`, {}).then((interlocutores) => {
      if (!cancelled) setState({ loading: false, interlocutores });
    });
    return () => { cancelled = true; };
  }, []);
  return state;
}

// Cadastro de captação: leitura vem do JSON estático (commitado via GitHub); a escrita passa
// pela function serverless (que tem o token do GitHub) — o navegador nunca guarda credencial
// nenhuma. Depois de um envio bem-sucedido, o registro entra otimisticamente na lista em
// memória (a pessoa que cadastrou já vê o próprio cadastro na hora), mas ele só aparece pra
// quem mais acessa o site depois que o Netlify termina o novo deploy (segundos a poucos
// minutos) — daí o selo "sincronizando" no registro recém-criado.
export function useCaptacoes() {
  const [state, setState] = useState({ loading: true, captacoes: [] });
  const [pendentes, setPendentes] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchJson(`${import.meta.env.BASE_URL}data/captacoes.json`, []).then((captacoes) => {
      if (!cancelled) setState({ loading: false, captacoes });
    });
    return () => { cancelled = true; };
  }, []);

  const submitCaptacao = useCallback(async (payload) => {
    const res = await fetch('/.netlify/functions/cadastrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const texto = await res.text().catch(() => '');
      throw new Error(texto || `Falha ao cadastrar (HTTP ${res.status})`);
    }
    const { registro } = await res.json();
    // "pendente" é só uma marca local (nunca vem do servidor) — dura até a próxima vez que o
    // JSON estático for buscado do zero (recarregar a página), quando o registro real já
    // publicado assume o lugar dele.
    setPendentes((prev) => [...prev, { ...registro, pendente: true }]);
    return registro;
  }, []);

  return {
    loading: state.loading,
    captacoes: [...state.captacoes, ...pendentes],
    submitCaptacao,
  };
}

export const UFS = ['GO'];

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

export const STATUS_CAPTACAO = [
  'Primeiro contato',
  'Em articulação',
  'Agenda marcada',
  'Indicado',
  'Confirmado',
  'Empenhado',
  'Em licitação',
  'Contratado',
  'Entregue',
];

// Os 3 primeiros estágios são o "relacionamento" (ainda sem valor formalizado); a partir de
// "Indicado" o registro já entrou no funil formal de recurso (mesmo vocabulário do painel-nacional).
export const ESTAGIOS_ARTICULACAO = ['Primeiro contato', 'Em articulação', 'Agenda marcada'];
