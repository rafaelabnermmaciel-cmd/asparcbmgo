import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, supabaseConfigurado } from './supabase.js';

// Deputados/senadores/votos de Goiás continuam vindo de JSON estático (são dados só de
// leitura, filtrados do painel-nacional — ver scripts/gerar-parlamentares-go.js). Quartéis,
// interlocutores e captações agora vivem no Supabase (banco de verdade, com tela de edição
// pronta em Table Editor — ver SETUP.md), porque são dados que mudam com o uso do dia a dia.
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
  const [state, setState] = useState({ loading: true, quarteis: [] });
  useEffect(() => {
    if (!supabaseConfigurado) { setState({ loading: false, quarteis: [] }); return; }
    let cancelled = false;
    supabase.from('quarteis').select('*').order('nome').then(({ data, error }) => {
      if (cancelled) return;
      if (error) console.warn('[data] falha ao carregar quarteis:', error.message);
      setState({ loading: false, quarteis: data || [] });
    });
    return () => { cancelled = true; };
  }, []);
  return state;
}

// Um militar por linha, exatamente como na Convocação 106/2026 (ver supabase/schema.sql):
// posto, RG, nome de guerra e o quartel (quartel_id). Usado no Cadastro pra sugerir quem já
// está designado pra articulação institucional naquele quartel.
export function useMilitares() {
  const [state, setState] = useState({ loading: true, militares: [] });
  useEffect(() => {
    if (!supabaseConfigurado) { setState({ loading: false, militares: [] }); return; }
    let cancelled = false;
    supabase.from('militares').select('*').then(({ data, error }) => {
      if (cancelled) return;
      if (error) console.warn('[data] falha ao carregar militares:', error.message);
      setState({ loading: false, militares: data || [] });
    });
    return () => { cancelled = true; };
  }, []);
  return state;
}

export function useInterlocutores() {
  const [state, setState] = useState({ loading: true, interlocutores: {} });
  useEffect(() => {
    if (!supabaseConfigurado) { setState({ loading: false, interlocutores: {} }); return; }
    let cancelled = false;
    supabase.from('interlocutores').select('*').then(({ data, error }) => {
      if (cancelled) return;
      if (error) console.warn('[data] falha ao carregar interlocutores:', error.message);
      const porChave = {};
      (data || []).forEach((row) => { porChave[row.parlamentar_key] = row; });
      setState({ loading: false, interlocutores: porChave });
    });
    return () => { cancelled = true; };
  }, []);
  return state;
}

function rowParaCaptacao(row) {
  return {
    id: row.id,
    criadoEm: row.criado_em,
    quartelId: row.quartel_id,
    quartelNome: row.quartel_nome,
    municipio: row.municipio,
    responsavel: row.responsavel,
    stakeholder: row.stakeholder,
    parlamentarNome: row.parlamentar_nome,
    objeto: row.objeto,
    valorPrevisto: Number(row.valor_previsto) || 0,
    valorConfirmado: Number(row.valor_confirmado) || 0,
    numReunioes: row.num_reunioes || 0,
    status: row.status,
    dataAgenda: row.data_agenda || '',
    observacoes: row.observacoes || '',
    anexos: row.anexos || [],
  };
}

// Cadastro de captação: lê e grava direto no Supabase (a "anon key" no navegador só pode o
// que as regras de RLS liberarem — ver supabase/schema.sql). Depois de cadastrar, o próprio
// registro entra na tela na hora (otimista); qualquer outra pessoa com o site aberto recebe o
// mesmo registro via Realtime do Supabase, sem precisar recarregar a página.
export function useCaptacoes() {
  const [state, setState] = useState({ loading: true, captacoes: [] });
  const idsConhecidos = useRef(new Set());

  useEffect(() => {
    if (!supabaseConfigurado) { setState({ loading: false, captacoes: [] }); return; }
    let cancelled = false;

    supabase.from('captacoes').select('*').order('criado_em', { ascending: false }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) console.warn('[data] falha ao carregar captacoes:', error.message);
      const captacoes = (data || []).map(rowParaCaptacao);
      captacoes.forEach((c) => idsConhecidos.current.add(c.id));
      setState({ loading: false, captacoes });
    });

    const canal = supabase
      .channel('captacoes-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'captacoes' }, (payload) => {
        const nova = rowParaCaptacao(payload.new);
        if (idsConhecidos.current.has(nova.id)) return; // já veio pelo insert otimista local
        idsConhecidos.current.add(nova.id);
        setState((prev) => ({ ...prev, captacoes: [nova, ...prev.captacoes] }));
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(canal); };
  }, []);

  const submitCaptacao = useCallback(async (payload) => {
    if (!supabaseConfigurado) throw new Error('Supabase ainda não foi configurado neste site — ver SETUP.md.');

    // 1) Sobe cada anexo pro Storage antes de gravar a linha — assim a linha só existe se os
    // anexos deram certo (nada fica "meio cadastrado").
    const anexosGravados = [];
    for (const anexo of payload.anexos || []) {
      const blob = await (await fetch(anexo.dataUrl)).blob();
      const caminho = `${crypto.randomUUID()}/${anexo.nome}`;
      const { error: erroUpload } = await supabase.storage.from('anexos').upload(caminho, blob, { contentType: anexo.tipo });
      if (erroUpload) throw new Error(`Falha ao enviar anexo "${anexo.nome}": ${erroUpload.message}`);
      const { data: pub } = supabase.storage.from('anexos').getPublicUrl(caminho);
      anexosGravados.push({ nome: anexo.nome, tipo: anexo.tipo, tamanho: anexo.tamanho || null, url: pub.publicUrl });
    }

    // 2) Grava a linha do cadastro.
    const { data: inserido, error } = await supabase
      .from('captacoes')
      .insert({
        quartel_id: payload.quartelId,
        quartel_nome: payload.quartelNome,
        municipio: payload.municipio || '',
        responsavel: payload.responsavel,
        stakeholder: payload.stakeholder || '',
        parlamentar_nome: payload.parlamentarNome,
        objeto: payload.objeto,
        valor_previsto: payload.valorPrevisto || 0,
        valor_confirmado: payload.valorConfirmado || 0,
        num_reunioes: payload.numReunioes || 0,
        status: payload.status,
        data_agenda: payload.dataAgenda || null,
        observacoes: payload.observacoes || '',
        anexos: anexosGravados,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    const registro = rowParaCaptacao(inserido);
    idsConhecidos.current.add(registro.id);
    setState((prev) => ({ ...prev, captacoes: [registro, ...prev.captacoes] }));
    return registro;
  }, []);

  return { loading: state.loading, captacoes: state.captacoes, submitCaptacao };
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
