import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, supabaseConfigurado } from './supabase.js';
import { notificarCaptacao } from './emailjs.js';

// Deputados/senadores/votos de Goiás continuam vindo de JSON estático (são dados só de
// leitura, filtrados do painel-nacional — ver scripts/gerar-parlamentares-go.js). Quartéis,
// militares, stakeholders e captações agora vivem no Supabase (banco de verdade, totalmente
// editável pelo próprio site — ver SETUP.md), porque são dados que mudam com o uso do dia a dia.
// O Supabase (PostgREST) só devolve até um certo número de linhas por consulta (o padrão do
// projeto pode ser bem menor que o total de dados, ex.: 100) — isso pegou os quase 3 mil
// militares do Almanaque de surpresa, cortando a lista pela metade. Essa função busca "em
// páginas" até não sobrar mais nada, então nenhuma lista (por maior que fique) volta cortada.
async function fetchAllRows(table, orderCol) {
  const PAGE = 1000;
  let tudo = [];
  let inicio = 0;
  for (;;) {
    const { data, error } = await supabase.from(table).select('*').order(orderCol).range(inicio, inicio + PAGE - 1);
    if (error) throw error;
    tudo = tudo.concat(data || []);
    if (!data || data.length < PAGE) break;
    inicio += PAGE;
  }
  return tudo;
}

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

// Quartéis são totalmente editáveis pelo próprio site (aba Acesso restrito) — adicionar,
// renomear, apagar — sem precisar entrar no Supabase (RLS permite, ver supabase/schema.sql).
export function useQuarteis() {
  const [state, setState] = useState({ loading: true, quarteis: [] });

  const recarregar = useCallback(async () => {
    if (!supabaseConfigurado) { setState({ loading: false, quarteis: [] }); return; }
    try {
      setState({ loading: false, quarteis: await fetchAllRows('quarteis', 'nome') });
    } catch (err) {
      console.warn('[data] falha ao carregar quarteis:', err.message);
      setState({ loading: false, quarteis: [] });
    }
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  const addQuartel = useCallback(async (q) => {
    const { error } = await supabase.from('quarteis').insert(q);
    if (error) throw new Error(error.message);
    await recarregar();
  }, [recarregar]);

  const updateQuartel = useCallback(async (id, patch) => {
    const { error } = await supabase.from('quarteis').update(patch).eq('id', id);
    if (error) throw new Error(error.message);
    await recarregar();
  }, [recarregar]);

  const removeQuartel = useCallback(async (id) => {
    const { error } = await supabase.from('quarteis').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await recarregar();
  }, [recarregar]);

  return { loading: state.loading, quarteis: state.quarteis, addQuartel, updateQuartel, removeQuartel };
}

// Um militar por linha — posto, RG, nome e o quartel (quartel_id), que pode estar vazio pra
// quem ainda não foi vinculado manualmente (ver supabase/schema.sql). Usado como pool de
// "responsável" no Cadastrar primeiro contato, e editável pela aba Acesso restrito (apagar um
// quartel também apaga o vínculo dos militares dele — on delete cascade).
export function useMilitares() {
  const [state, setState] = useState({ loading: true, militares: [] });

  const recarregar = useCallback(async () => {
    if (!supabaseConfigurado) { setState({ loading: false, militares: [] }); return; }
    try {
      setState({ loading: false, militares: await fetchAllRows('militares', 'id') });
    } catch (err) {
      console.warn('[data] falha ao carregar militares:', err.message);
      setState({ loading: false, militares: [] });
    }
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  const addMilitar = useCallback(async (m) => {
    const { error } = await supabase.from('militares').insert(m);
    if (error) throw new Error(error.message);
    await recarregar();
  }, [recarregar]);

  const updateMilitar = useCallback(async (id, patch) => {
    const { error } = await supabase.from('militares').update(patch).eq('id', id);
    if (error) throw new Error(error.message);
    await recarregar();
  }, [recarregar]);

  const removeMilitar = useCallback(async (id) => {
    const { error } = await supabase.from('militares').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await recarregar();
  }, [recarregar]);

  return { loading: state.loading, militares: state.militares, addMilitar, updateMilitar, removeMilitar };
}

// Stakeholders (contatos de captação de cada parlamentar) são totalmente editáveis pelo
// próprio perfil do parlamentar no site — adicionar, editar, apagar — sem precisar entrar no
// Supabase (RLS permite, ver supabase/schema.sql). Pode ter mais de um stakeholder por
// parlamentar.
export function useStakeholders() {
  const [state, setState] = useState({ loading: true, stakeholders: [] });

  const recarregar = useCallback(async () => {
    if (!supabaseConfigurado) { setState({ loading: false, stakeholders: [] }); return; }
    try {
      setState({ loading: false, stakeholders: await fetchAllRows('stakeholders', 'id') });
    } catch (err) {
      console.warn('[data] falha ao carregar stakeholders:', err.message);
      setState({ loading: false, stakeholders: [] });
    }
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  const addStakeholder = useCallback(async (s) => {
    const { error } = await supabase.from('stakeholders').insert(s);
    if (error) throw new Error(error.message);
    await recarregar();
  }, [recarregar]);

  const updateStakeholder = useCallback(async (id, patch) => {
    const { error } = await supabase.from('stakeholders').update(patch).eq('id', id);
    if (error) throw new Error(error.message);
    await recarregar();
  }, [recarregar]);

  const removeStakeholder = useCallback(async (id) => {
    const { error } = await supabase.from('stakeholders').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await recarregar();
  }, [recarregar]);

  return { loading: state.loading, stakeholders: state.stakeholders, addStakeholder, updateStakeholder, removeStakeholder };
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
    status: row.status,
    observacoes: row.observacoes || '',
    anexos: row.anexos || [],
  };
}

// Sobe cada anexo (ainda em base64/dataUrl, gerado pelo FileField) pro Storage e devolve a
// versão final (com "url" pública) — usado tanto no cadastro da captação quanto no lançamento
// de um andamento na linha do tempo, os dois únicos lugares que anexam arquivo.
async function uploadAnexos(lista) {
  const gravados = [];
  for (const anexo of lista || []) {
    if (anexo.url && !anexo.dataUrl) { gravados.push(anexo); continue; } // já veio salvo (edição)
    const blob = await (await fetch(anexo.dataUrl)).blob();
    const caminho = `${crypto.randomUUID()}/${anexo.nome}`;
    const { error: erroUpload } = await supabase.storage.from('anexos').upload(caminho, blob, { contentType: anexo.tipo });
    if (erroUpload) throw new Error(`Falha ao enviar anexo "${anexo.nome}": ${erroUpload.message}`);
    const { data: pub } = supabase.storage.from('anexos').getPublicUrl(caminho);
    gravados.push({ nome: anexo.nome, tipo: anexo.tipo, tamanho: anexo.tamanho || null, url: pub.publicUrl });
  }
  return gravados;
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

    fetchAllRows('captacoes', 'criado_em').then((data) => {
      if (cancelled) return;
      const captacoes = data.map(rowParaCaptacao).sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
      captacoes.forEach((c) => idsConhecidos.current.add(c.id));
      setState({ loading: false, captacoes });
    }).catch((err) => {
      if (cancelled) return;
      console.warn('[data] falha ao carregar captacoes:', err.message);
      setState({ loading: false, captacoes: [] });
    });

    const canal = supabase
      .channel('captacoes-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'captacoes' }, (payload) => {
        const nova = rowParaCaptacao(payload.new);
        if (idsConhecidos.current.has(nova.id)) return; // já veio pelo insert otimista local
        idsConhecidos.current.add(nova.id);
        setState((prev) => ({ ...prev, captacoes: [nova, ...prev.captacoes] }));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'captacoes' }, (payload) => {
        const atualizada = rowParaCaptacao(payload.new);
        setState((prev) => ({ ...prev, captacoes: prev.captacoes.map((c) => (c.id === atualizada.id ? atualizada : c)) }));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'captacoes' }, (payload) => {
        setState((prev) => ({ ...prev, captacoes: prev.captacoes.filter((c) => c.id !== payload.old.id) }));
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(canal); };
  }, []);

  const submitCaptacao = useCallback(async (payload) => {
    if (!supabaseConfigurado) throw new Error('Supabase ainda não foi configurado neste site — ver SETUP.md.');

    // 1) Sobe cada anexo pro Storage antes de gravar a linha — assim a linha só existe se os
    // anexos deram certo (nada fica "meio cadastrado").
    const anexosGravados = await uploadAnexos(payload.anexos);

    // 2) Grava a linha do cadastro — toda captação nasce "Primeiro contato" (sem estágio pra
    // escolher no formulário; o status só muda depois, pela aba de andamentos).
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
        status: 'Primeiro contato',
        observacoes: payload.observacoes || '',
        anexos: anexosGravados,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    const registro = rowParaCaptacao(inserido);
    idsConhecidos.current.add(registro.id);
    setState((prev) => ({ ...prev, captacoes: [registro, ...prev.captacoes] }));
    notificarCaptacao(registro, 'cadastrada'); // não bloqueia o cadastro — falha de e-mail nunca desfaz o que já foi salvo
    return registro;
  }, []);

  // Uma captação cadastrada não fica congelada — o estágio muda com o tempo (ex: "Primeiro
  // contato" → "Em articulação" → "Indicado"), então precisa dar pra editar qualquer campo
  // depois. `patch` usa as mesmas chaves em camelCase do resto do app.
  const updateCaptacao = useCallback(async (id, patch) => {
    const linha = {};
    if ('quartelId' in patch) linha.quartel_id = patch.quartelId;
    if ('quartelNome' in patch) linha.quartel_nome = patch.quartelNome;
    if ('municipio' in patch) linha.municipio = patch.municipio;
    if ('responsavel' in patch) linha.responsavel = patch.responsavel;
    if ('stakeholder' in patch) linha.stakeholder = patch.stakeholder;
    if ('parlamentarNome' in patch) linha.parlamentar_nome = patch.parlamentarNome;
    if ('objeto' in patch) linha.objeto = patch.objeto;
    if ('valorPrevisto' in patch) linha.valor_previsto = patch.valorPrevisto;
    if ('status' in patch) linha.status = patch.status;
    if ('observacoes' in patch) linha.observacoes = patch.observacoes;

    const { data: atualizado, error } = await supabase.from('captacoes').update(linha).eq('id', id).select().single();
    if (error) throw new Error(error.message);

    const registro = rowParaCaptacao(atualizado);
    setState((prev) => ({ ...prev, captacoes: prev.captacoes.map((c) => (c.id === id ? registro : c)) }));
    notificarCaptacao(registro, 'editada');
    return registro;
  }, []);

  const removeCaptacao = useCallback(async (id) => {
    const { data: removido, error } = await supabase.from('captacoes').delete().eq('id', id).select().single();
    if (error) throw new Error(error.message);
    setState((prev) => ({ ...prev, captacoes: prev.captacoes.filter((c) => c.id !== id) }));
    if (removido) notificarCaptacao(rowParaCaptacao(removido), 'excluída');
  }, []);

  return { loading: state.loading, captacoes: state.captacoes, submitCaptacao, updateCaptacao, removeCaptacao };
}

// Andamentos (linha do tempo) de cada captação — data, descrição, quem esteve presente e
// anexos (foto/documento). Carrega tudo de uma vez (como quarteis/militares/stakeholders) e
// cada tela filtra pelo captacao_id que precisa — totalmente editável no site. Lançar o
// primeiro andamento é o que tira a captação de "Primeiro contato" (ver CaptacaoTimeline.jsx).
export function useEventos() {
  const [state, setState] = useState({ loading: true, eventos: [] });

  const recarregar = useCallback(async () => {
    if (!supabaseConfigurado) { setState({ loading: false, eventos: [] }); return; }
    try {
      setState({ loading: false, eventos: await fetchAllRows('captacao_eventos', 'data') });
    } catch (err) {
      console.warn('[data] falha ao carregar eventos:', err.message);
      setState({ loading: false, eventos: [] });
    }
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  const addEvento = useCallback(async (e) => {
    const anexos = await uploadAnexos(e.anexos);
    const { error } = await supabase.from('captacao_eventos').insert({ ...e, anexos });
    if (error) throw new Error(error.message);
    await recarregar();
  }, [recarregar]);

  const removeEvento = useCallback(async (id) => {
    const { error } = await supabase.from('captacao_eventos').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await recarregar();
  }, [recarregar]);

  return { loading: state.loading, eventos: state.eventos, addEvento, removeEvento };
}

// Lista de quem já pediu acesso (aprovado ou não) — usada na aba Acesso restrito → Acessos pra
// aprovar/revogar. RLS só deixa quem já é aprovado editar (ver supabase/schema.sql); ler a
// lista é liberado pra qualquer pessoa logada, mesmo sem aprovação ainda.
export function useUsuariosAprovados() {
  const [state, setState] = useState({ loading: true, usuarios: [] });

  const recarregar = useCallback(async () => {
    if (!supabaseConfigurado) { setState({ loading: false, usuarios: [] }); return; }
    try {
      setState({ loading: false, usuarios: await fetchAllRows('usuarios_aprovados', 'criado_em') });
    } catch (err) {
      console.warn('[data] falha ao carregar usuarios_aprovados:', err.message);
      setState({ loading: false, usuarios: [] });
    }
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  const definirAprovacao = useCallback(async (userId, aprovado) => {
    const { error } = await supabase.from('usuarios_aprovados').update({ aprovado }).eq('user_id', userId);
    if (error) throw new Error(error.message);
    await recarregar();
  }, [recarregar]);

  return { loading: state.loading, usuarios: state.usuarios, definirAprovacao };
}

// Sugere um id curto (sem espaço/acento) a partir do nome do quartel, pra facilitar o
// cadastro pela aba Acesso restrito — a pessoa pode editar antes de salvar.
export function slugify(texto) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

// Este painel acompanha só a articulação — do primeiro contato até um desfecho. Toda captação
// nasce "Primeiro contato" (sem estágio pra escolher no cadastro); vira "Em articulação"
// sozinha assim que o primeiro andamento é lançado na linha do tempo, e só sai daí quando o
// militar responsável marca o desfecho ("Indicado" ou "Arquivado") ali mesmo, na aba de
// andamentos — ver CaptacaoTimeline.jsx. O que acontece depois de "Indicado" (empenho,
// licitação, contratação, entrega) é execução orçamentária/administrativa, acompanhada no
// perfil de cada um no outro painel — não é mais trabalho de quem está captando.
export const STATUS_CAPTACAO = ['Primeiro contato', 'Em articulação', 'Indicado', 'Arquivado'];

// Os 2 primeiros são o funil "em andamento"; os 2 últimos são os desfechos ("Indicado" é o
// desfecho de sucesso — a captação foi indicada/destinada àquele quartel).
export const STATUS_EM_ANDAMENTO = ['Primeiro contato', 'Em articulação'];
export const STATUS_TERMINAL = ['Indicado', 'Arquivado'];
