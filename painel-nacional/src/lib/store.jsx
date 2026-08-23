import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, supabaseConfigurado } from './supabase.js';

const StoreContext = createContext(null);

async function fetchJson(path, fallback) {
  try {
    // no-cache: revalida com o servidor a cada carregamento em vez de confiar em cache
    // heurístico do navegador — esses JSONs são atualizados por automação (GitHub Actions) e
    // um retorno "à toa" do cache faria a sincronização de novidades nunca aparecer.
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${res.status} ao buscar ${path}`);
    return await res.json();
  } catch (err) {
    console.warn(`[store] falha ao carregar ${path}:`, err.message);
    return fallback;
  }
}

export const ETAPAS_ORDEM = ['ind', 'cad', 'apv', 'emp', 'lic', 'con', 'entr'];
export const ETAPAS_NOMES = { ind: 'Indicação', cad: 'Cadastro', apv: 'Aprovação', emp: 'Empenho', lic: 'Licitação', con: 'Contratação', entr: 'Entrega' };

const STATUS_TO_ETAPAS = {
  'Acordo Verbal': { ind: 0, cad: 0, apv: 0, emp: 0, lic: 0, con: 0, entr: 0 },
  'Em articulação': { ind: 1, cad: 0, apv: 0, emp: 0, lic: 0, con: 0, entr: 0 },
  Indicado: { ind: 1, cad: 1, apv: 0, emp: 0, lic: 0, con: 0, entr: 0 },
  Confirmado: { ind: 1, cad: 1, apv: 1, emp: 0, lic: 0, con: 0, entr: 0 },
  Empenhado: { ind: 1, cad: 1, apv: 1, emp: 1, lic: 0, con: 0, entr: 0 },
  'Em licitação': { ind: 1, cad: 1, apv: 1, emp: 1, lic: 1, con: 0, entr: 0 },
  Contratado: { ind: 1, cad: 1, apv: 1, emp: 1, lic: 1, con: 1, entr: 0 },
  Entregue: { ind: 1, cad: 1, apv: 1, emp: 1, lic: 1, con: 1, entr: 1 },
};

const ETAPAS_TO_STATUS = [
  { key: 'entr', status: 'Entregue' },
  { key: 'con', status: 'Contratado' },
  { key: 'lic', status: 'Em licitação' },
  { key: 'emp', status: 'Empenhado' },
  { key: 'apv', status: 'Confirmado' },
  { key: 'cad', status: 'Indicado' },
  { key: 'ind', status: 'Em articulação' },
];

export function etapasToStatus(et) {
  for (const { key, status } of ETAPAS_TO_STATUS) {
    if (et?.[key]) return status;
  }
  return 'Em articulação';
}

export function statusToEtapas(status) {
  return { ...(STATUS_TO_ETAPAS[status] || STATUS_TO_ETAPAS['Em articulação']) };
}

export const ESTAGIOS_LEGISLATIVOS = ['Protocolado', 'Aguardando Despacho', 'Em Comissão', 'Aprovado em Comissão', 'Em Plenário', 'Aprovado/Sancionado', 'Arquivado'];

// Ponte entre o vocabulário de estágio usado na importação nacional (ESTAGIOS_LEGISLATIVOS)
// e o vocabulário de status usado nos projetos de lei geridos manualmente (STATUS_PROJETO) —
// usada só na hora de compor um projeto a partir do relatório ASPAR (ver nacionalToProjeto).
const ESTAGIO_PARA_STATUS_PROJETO = {
  Protocolado: 'Protocolado',
  'Aguardando Despacho': 'Aguardando Relator',
  'Em Comissão': 'Em Comissão',
  'Aprovado em Comissão': 'Aprovado em Comissão',
  'Em Plenário': 'Em Plenário',
  'Aprovado/Sancionado': 'Aprovado',
  Arquivado: 'Arquivado',
};

// Classificação automática (best-effort) do estágio a partir do texto real de "situação" —
// usada só como ponto de partida visual; o texto original nunca é alterado, e o estágio
// pode ser corrigido manualmente a qualquer momento em Gerenciamento.
function classificarEstagio(situacao) {
  const s = (situacao || '').toLowerCase();
  if (s.includes('sancionad') || s.includes('virou lei') || /lei (complementar )?n[ºo°]/.test(s)) return 'Aprovado/Sancionado';
  if (s.includes('arquivad')) return 'Arquivado';
  if (s.includes('aprovado em comiss') || s.includes('redação final aprovada') || s.includes('aprovada a redação final') || s.includes('aprovado na c')) return 'Aprovado em Comissão';
  if (s.includes('plenário') && (s.includes('pautad') || s.includes('deliberação') || s.includes('votad'))) return 'Em Plenário';
  if (s.includes('aguardando despacho') || s.includes('aguardando apreciação') || s.includes('aguardando recebimento')) return 'Aguardando Despacho';
  if (s.includes('comiss') || s.includes('relator')) return 'Em Comissão';
  if (s.includes('apresentad') || s.includes('autuad') || s.includes('protocolad')) return 'Protocolado';
  return 'Protocolado';
}

// O relatório ASPAR não tem um campo estruturado de autor/relator — quando cita esses nomes,
// eles aparecem soltos no texto de "assunto"/"situacao" (ver observacao no próprio JSON). Essa
// tabela foi montada lendo cada um dos 20 itens uma vez (chave "tipo-numero"); autor/relator
// null significa que o relatório não menciona ninguém nesse papel para aquele item específico.
const AUTOR_RELATOR_NACIONAL = {
  'PLP-18/2021': { relator: 'Sen. Nelsinho Trad' },
  'PL-317/2022': { relator: 'Dep. Sargento Portugal' },
  'PL-241/2023': { relator: 'Dep. Cabo Gilberto Silva' },
  'PL-4.804/2025': { relator: 'Dep. Allan Garcês' },
  'PL-1.274/2024': { relator: 'Dep. Alex Manente' },
  'PL-1.958/2023': { relator: 'Dep. Josenildo (PDT-AP)' },
  'PL-1.451/2023': { relator: 'Sen. Efraim Filho' },
  'PL-3.268/2020': { relator: 'Sen. Weverton' },
  'PL-458/2024': { autor: 'Sen. Jayme Campos (União-MT)', relator: 'Sen. Hamilton Mourão' },
  'PL-2.557/2026': { autor: 'Sen. Izalci Lucas' },
  'PEC-17/2025': { autor: 'Dep. Coronel Meira (PL-PE), Dep. Delegado Fabio Costa (PP-AL) e Dep. Alfredo Gaspar (União-AL)' },
  'PEC-10/2026': { relator: 'Sen. Styvenson Valentim' },
};

// Retira títulos/parênteses pra comparar nomes vindos de texto livre (ex: "Sen. Hamilton
// Mourão") com o nome oficial do parlamentar na base (ex: "Hamilton Mourão").
function normalizaNomeParlamentar(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(sen|sen\.|dep|dep\.|senador|senadora|deputado|deputada)\b\.?/gi, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
export function nomesCorrespondem(a, b) {
  const na = normalizaNomeParlamentar(a);
  const nb = normalizaNomeParlamentar(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

// O relatório ASPAR (acompanhamento-legislativo.json) descreve proposições nacionais de
// interesse do CBM-GO — isso É um projeto de lei de interesse, não uma categoria à parte.
// Esta função converte cada item do relatório para o mesmo formato usado pelos projetos
// cadastrados manualmente (ver emptyProj em Gerenciamento.jsx), para viverem na mesma lista.
function nacionalToProjeto(p) {
  const estagio = p.estagio || classificarEstagio(p.situacao);
  const autorRelator = AUTOR_RELATOR_NACIONAL[`${p.tipo}-${p.numero}`] || {};
  return {
    autor: autorRelator.autor || null,
    relator: autorRelator.relator || null,
    tipo: p.tipo,
    numero: p.numero,
    ementa: p.assunto,
    status: ESTAGIO_PARA_STATUS_PROJETO[estagio] || 'Protocolado',
    posicao: 'em análise',
    prioridade: 'média',
    responsavel: '',
    proximoPasso: p.proximosPassos || '',
    observacoes: [p.situacao, p.pontoAtencao].filter(Boolean).join(' — '),
    casaAtual: p.casaAtual || null,
    link: p.link || null,
    ultimaMovimentacao: p.ultimaMovimentacao || null,
    origemNacional: true,
  };
}

// ============================================================================
// Mapeamento linha do banco (snake_case) <-> objeto do app (camelCase). Os componentes
// continuam usando os mesmos nomes de campo de sempre — só esta camada sabe que agora os
// dados vêm do Supabase.
// ============================================================================

function rowToDestinacao(r) {
  return {
    id: r.id,
    parlamentarNome: r.parlamentar_nome,
    ano: r.ano,
    municipio: r.municipio,
    objeto: r.objeto,
    valorPrevisto: Number(r.valor_previsto) || 0,
    valorConfirmado: Number(r.valor_confirmado) || 0,
    status: r.status,
    sei: r.sei,
    responsavel: r.responsavel,
    proximoPasso: r.proximo_passo,
    riscos: r.riscos,
    observacoes: r.observacoes,
    etapas: statusToEtapas(r.status),
  };
}
function destinacaoToRow(d) {
  return {
    parlamentar_nome: d.parlamentarNome ?? '',
    ano: d.ano ?? new Date().getFullYear(),
    municipio: d.municipio ?? '',
    objeto: d.objeto ?? '',
    valor_previsto: d.valorPrevisto ?? 0,
    valor_confirmado: d.valorConfirmado ?? 0,
    status: d.status ?? 'Em articulação',
    sei: d.sei ?? '',
    responsavel: d.responsavel ?? '',
    proximo_passo: d.proximoPasso ?? '',
    riscos: d.riscos ?? '',
    observacoes: d.observacoes ?? '',
  };
}
const DEST_FIELD_MAP = {
  parlamentarNome: 'parlamentar_nome', ano: 'ano', municipio: 'municipio', objeto: 'objeto',
  valorPrevisto: 'valor_previsto', valorConfirmado: 'valor_confirmado', status: 'status', sei: 'sei',
  responsavel: 'responsavel', proximoPasso: 'proximo_passo', riscos: 'riscos', observacoes: 'observacoes',
};

function rowToProjeto(r) {
  return {
    id: r.id,
    autor: r.autor || null,
    relator: r.relator || null,
    tipo: r.tipo,
    numero: r.numero,
    ementa: r.ementa,
    status: r.status,
    posicao: r.posicao,
    prioridade: r.prioridade,
    responsavel: r.responsavel,
    proximoPasso: r.proximo_passo,
    observacoes: r.observacoes,
    casaAtual: r.casa_atual,
    link: r.link,
    ultimaMovimentacao: r.ultima_movimentacao,
    origemNacional: r.origem_nacional,
  };
}
function projetoToRow(p) {
  return {
    autor: p.autor || '',
    relator: p.relator || '',
    tipo: p.tipo ?? 'PL',
    numero: p.numero ?? '',
    ementa: p.ementa ?? '',
    status: p.status ?? 'Protocolado',
    posicao: p.posicao ?? 'em análise',
    prioridade: p.prioridade ?? 'média',
    responsavel: p.responsavel ?? '',
    proximo_passo: p.proximoPasso ?? '',
    observacoes: p.observacoes ?? '',
    casa_atual: p.casaAtual ?? null,
    link: p.link ?? null,
    ultima_movimentacao: p.ultimaMovimentacao ?? null,
    origem_nacional: !!p.origemNacional,
  };
}
const PROJ_FIELD_MAP = {
  autor: 'autor', relator: 'relator', tipo: 'tipo', numero: 'numero', ementa: 'ementa', status: 'status',
  posicao: 'posicao', prioridade: 'prioridade', responsavel: 'responsavel', proximoPasso: 'proximo_passo',
  observacoes: 'observacoes', casaAtual: 'casa_atual', link: 'link', ultimaMovimentacao: 'ultima_movimentacao',
  origemNacional: 'origem_nacional',
};

function rowToEvento(r) {
  return {
    id: r.id,
    titulo: r.titulo,
    data: r.data,
    hora: r.hora,
    tipo: r.tipo,
    parlamentarNome: r.parlamentar_nome,
    destinacaoId: r.destinacao_id,
    projetoId: r.projeto_id,
    local: r.local,
    tipoReuniao: r.tipo_reuniao,
    status: r.status,
    pauta: r.pauta,
    resultado: r.resultado,
    responsavel: r.responsavel,
    observacoes: r.observacoes,
    anexos: r.anexos || [],
  };
}
function eventoToRow(e) {
  return {
    titulo: e.titulo ?? '',
    data: e.data || null,
    hora: e.hora ?? '',
    tipo: e.tipo ?? 'div',
    parlamentar_nome: e.parlamentarNome ?? '',
    destinacao_id: e.destinacaoId ?? null,
    projeto_id: e.projetoId ?? null,
    local: e.local ?? '',
    tipo_reuniao: e.tipoReuniao ?? 'Reunião institucional',
    status: e.status ?? 'Prevista',
    pauta: e.pauta ?? '',
    resultado: e.resultado ?? '',
    responsavel: e.responsavel ?? '',
    observacoes: e.observacoes ?? '',
    anexos: e.anexos ?? [],
  };
}
const EVENTO_FIELD_MAP = {
  titulo: 'titulo', data: 'data', hora: 'hora', tipo: 'tipo', parlamentarNome: 'parlamentar_nome',
  destinacaoId: 'destinacao_id', projetoId: 'projeto_id', local: 'local', tipoReuniao: 'tipo_reuniao',
  status: 'status', pauta: 'pauta', resultado: 'resultado', responsavel: 'responsavel',
  observacoes: 'observacoes', anexos: 'anexos',
};

// Converte só as chaves presentes no patch (update parcial) — nunca usar o *ToRow de inserção
// pra isso, porque ele preenche os campos ausentes com valor-padrão e sobrescreveria o resto
// da linha no banco.
function patchToRow(patch, fieldMap) {
  const row = {};
  for (const [k, v] of Object.entries(patch)) {
    if (fieldMap[k]) row[fieldMap[k]] = v === undefined ? null : v;
  }
  return row;
}

const LOCALSTORAGE_LEGADO_KEY = 'painel-nacional-store-v2';

export function StoreProvider({ children }) {
  const [destinacoes, setDestinacoes] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [parlamentarNotas, setParlamentarNotas] = useState({});
  const [projetosFonte, setProjetosFonte] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sem Supabase configurado, o store fica "carregando" pra sempre — as páginas que dependem
    // dele já lidam com isso (`if (store.loading) return null`). Configure
    // src/lib/supabase-config.js pra habilitar.
    if (!supabaseConfigurado) return;

    let cancelado = false;
    (async () => {
      const [destResp, projResp, evtResp, notaResp] = await Promise.all([
        supabase.from('destinacoes').select('*').order('id'),
        supabase.from('projetos').select('*').order('id'),
        supabase.from('eventos').select('*').order('id'),
        supabase.from('parlamentar_notas').select('*'),
      ]);
      if (cancelado) return;

      let destinacoesAtuais = (destResp.data || []).map(rowToDestinacao);
      let projetosAtuais = (projResp.data || []).map(rowToProjeto);
      let eventosAtuais = (evtResp.data || []).map(rowToEvento);
      let notasAtuais = Object.fromEntries((notaResp.data || []).map((r) => [r.parlamentar_key, r.conteudo]));

      // Migração única: quem já tinha dados no localStorage (versão anterior, antes do
      // Supabase) tem esse conteúdo importado pro banco na primeira carga — só quando as 3
      // tabelas principais ainda estão vazias, pra nunca duplicar em cargas seguintes.
      if (destinacoesAtuais.length === 0 && projetosAtuais.length === 0 && eventosAtuais.length === 0) {
        try {
          const raw = localStorage.getItem(LOCALSTORAGE_LEGADO_KEY);
          const legado = raw ? JSON.parse(raw) : null;
          if (legado && ((legado.destinacoes?.length || 0) + (legado.projetos?.length || 0) + (legado.eventos?.length || 0) > 0)) {
            console.log('[store] importando dados locais (versão anterior, sem banco) pro Supabase — só acontece uma vez.');
            if (legado.destinacoes?.length) {
              const { data } = await supabase.from('destinacoes').insert(legado.destinacoes.map(destinacaoToRow)).select();
              destinacoesAtuais = (data || []).map(rowToDestinacao);
            }
            if (legado.projetos?.length) {
              const { data } = await supabase.from('projetos').insert(legado.projetos.map(projetoToRow)).select();
              projetosAtuais = (data || []).map(rowToProjeto);
            }
            if (legado.eventos?.length) {
              // destinacaoId/projetoId antigos não valem mais (IDs novos gerados pelo banco) —
              // preserva o resto do evento, mas solta o vínculo pra não apontar pro item errado.
              const { data } = await supabase
                .from('eventos')
                .insert(legado.eventos.map((e) => eventoToRow({ ...e, destinacaoId: null, projetoId: null })))
                .select();
              eventosAtuais = (data || []).map(rowToEvento);
            }
            if (legado.parlamentarNotas && Object.keys(legado.parlamentarNotas).length) {
              const linhas = Object.entries(legado.parlamentarNotas).map(([parlamentar_key, conteudo]) => ({ parlamentar_key, conteudo }));
              await supabase.from('parlamentar_notas').insert(linhas);
              notasAtuais = legado.parlamentarNotas;
            }
          }
        } catch (err) {
          console.warn('[store] falha ao importar dados locais antigos:', err.message);
        }
      }

      // Sincroniza os projetos de origem nacional (acompanhamento-legislativo.json, atualizado
      // por GitHub Actions) pro banco — assim uma movimentação nova chega pra todo mundo (via
      // tempo real), não só a quem recarregar depois de já ter uma cópia local. Roda em toda
      // carga; upsert por (tipo, numero) evita duplicar quando mais de um navegador faz isso ao
      // mesmo tempo. Só os campos "de fonte" são sobrescritos — qualquer edição manual (status,
      // responsável, próximo passo etc.) que já esteja no banco fica intacta.
      const legislativoRaw = await fetchJson(`${import.meta.env.BASE_URL}data/acompanhamento-legislativo.json`, null);
      if (legislativoRaw?.proposicoes?.length) {
        const porChave = new Map(projetosAtuais.filter((p) => p.origemNacional).map((p) => [`${p.tipo}-${p.numero}`, p]));
        const linhas = legislativoRaw.proposicoes.map((p) => {
          const existente = porChave.get(`${p.tipo}-${p.numero}`);
          const base = existente || nacionalToProjeto(p);
          return projetoToRow({
            ...base,
            casaAtual: p.casaAtual ?? base.casaAtual,
            link: p.link ?? base.link,
            ultimaMovimentacao: p.ultimaMovimentacao ?? base.ultimaMovimentacao,
            origemNacional: true,
          });
        });
        const { data: upsertados, error } = await supabase.from('projetos').upsert(linhas, { onConflict: 'tipo,numero' }).select();
        if (error) {
          console.warn('[store] falha ao sincronizar projetos nacionais:', error.message);
        } else if (upsertados) {
          const porId = new Map(projetosAtuais.map((p) => [p.id, p]));
          upsertados.map(rowToProjeto).forEach((p) => porId.set(p.id, p));
          projetosAtuais = [...porId.values()];
        }
        setProjetosFonte({
          fonte: legislativoRaw.fonte,
          observacao: legislativoRaw.observacao,
          atualizacoesRecentes: legislativoRaw.atualizacoesRecentes,
          ultimaVerificacaoEm: legislativoRaw.ultimaVerificacaoEm,
        });
      }

      if (cancelado) return;
      setDestinacoes(destinacoesAtuais);
      setProjetos(projetosAtuais);
      setEventos(eventosAtuais);
      setParlamentarNotas(notasAtuais);
      setLoading(false);
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  // Tempo real: reflete no estado local qualquer inserção/edição/remoção feita por qualquer
  // navegador (o próprio ou outro) — é o que faz uma pessoa ver aparecer, sem recarregar, o
  // que outra acabou de cadastrar.
  useEffect(() => {
    if (!supabaseConfigurado) return;

    function aplicarEm(setter, rowToObj) {
      return (payload) => {
        setter((atual) => {
          if (payload.eventType === 'DELETE') return atual.filter((x) => x.id !== payload.old.id);
          const obj = rowToObj(payload.new);
          const i = atual.findIndex((x) => x.id === obj.id);
          if (i < 0) return [...atual, obj];
          const copia = [...atual];
          copia[i] = obj;
          return copia;
        });
      };
    }

    const canal = supabase
      .channel('painel-nacional-store')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'destinacoes' }, aplicarEm(setDestinacoes, rowToDestinacao))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projetos' }, aplicarEm(setProjetos, rowToProjeto))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eventos' }, aplicarEm(setEventos, rowToEvento))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parlamentar_notas' }, (payload) => {
        setParlamentarNotas((atual) => {
          if (payload.eventType === 'DELETE') {
            const { [payload.old.parlamentar_key]: _omitida, ...resto } = atual;
            return resto;
          }
          return { ...atual, [payload.new.parlamentar_key]: payload.new.conteudo };
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  const api = {
    loading,
    destinacoes,
    projetos,
    eventos,
    projetosFonte,
    parlamentarNotas,

    async addDestinacao(dest) {
      const { data, error } = await supabase.from('destinacoes').insert(destinacaoToRow(dest)).select().single();
      if (error) return console.warn('[store] falha ao adicionar destinação:', error.message);
      setDestinacoes((atual) => [...atual, rowToDestinacao(data)]);
    },
    async updateDestinacao(id, patch) {
      setDestinacoes((atual) =>
        atual.map((d) => (d.id === id ? { ...d, ...patch, etapas: patch.status ? statusToEtapas(patch.status) : d.etapas } : d))
      );
      const { error } = await supabase.from('destinacoes').update(patchToRow(patch, DEST_FIELD_MAP)).eq('id', id);
      if (error) console.warn('[store] falha ao atualizar destinação:', error.message);
    },
    async removeDestinacao(id) {
      setDestinacoes((atual) => atual.filter((d) => d.id !== id));
      const { error } = await supabase.from('destinacoes').delete().eq('id', id);
      if (error) console.warn('[store] falha ao remover destinação:', error.message);
    },
    toggleDestinacaoEtapa(id, key) {
      const atual = destinacoes.find((d) => d.id === id);
      if (!atual) return;
      const etapas = { ...atual.etapas };
      const clickedIdx = ETAPAS_ORDEM.indexOf(key);
      const marcar = !etapas[key];
      ETAPAS_ORDEM.forEach((k, idx) => {
        if (marcar && idx <= clickedIdx) etapas[k] = 1;
        if (!marcar && idx >= clickedIdx) etapas[k] = 0;
      });
      api.updateDestinacao(id, { status: etapasToStatus(etapas) });
    },

    async addProjeto(proj) {
      const { data, error } = await supabase.from('projetos').insert(projetoToRow(proj)).select().single();
      if (error) return console.warn('[store] falha ao adicionar projeto:', error.message);
      setProjetos((atual) => [...atual, rowToProjeto(data)]);
    },
    async updateProjeto(id, patch) {
      setProjetos((atual) => atual.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      const { error } = await supabase.from('projetos').update(patchToRow(patch, PROJ_FIELD_MAP)).eq('id', id);
      if (error) console.warn('[store] falha ao atualizar projeto:', error.message);
    },
    async removeProjeto(id) {
      setProjetos((atual) => atual.filter((p) => p.id !== id));
      const { error } = await supabase.from('projetos').delete().eq('id', id);
      if (error) console.warn('[store] falha ao remover projeto:', error.message);
    },

    async addEvento(ev) {
      const { data, error } = await supabase.from('eventos').insert(eventoToRow(ev)).select().single();
      if (error) return console.warn('[store] falha ao adicionar evento:', error.message);
      setEventos((atual) => [...atual, rowToEvento(data)]);
    },
    async updateEvento(id, patch) {
      setEventos((atual) => atual.map((x) => (x.id === id ? { ...x, ...patch } : x)));
      const { error } = await supabase.from('eventos').update(patchToRow(patch, EVENTO_FIELD_MAP)).eq('id', id);
      if (error) console.warn('[store] falha ao atualizar evento:', error.message);
    },
    async removeEvento(id) {
      setEventos((atual) => atual.filter((x) => x.id !== id));
      const { error } = await supabase.from('eventos').delete().eq('id', id);
      if (error) console.warn('[store] falha ao remover evento:', error.message);
    },

    async setParlamentarNota(key, nota) {
      const conteudo = { ...(parlamentarNotas[key] || {}), ...nota };
      setParlamentarNotas((atual) => ({ ...atual, [key]: conteudo }));
      const { error } = await supabase.from('parlamentar_notas').upsert({ parlamentar_key: key, conteudo });
      if (error) console.warn('[store] falha ao salvar nota do parlamentar:', error.message);
    },

    exportJson() {
      return JSON.stringify({ destinacoes, projetos, eventos, parlamentarNotas }, null, 2);
    },
  };

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore precisa estar dentro de um StoreProvider');
  return ctx;
}

// Gargalo de contato é por TAREFA (uma destinação ou um projeto específico), não por
// parlamentar em geral — só começa a contar depois que o primeiro contato acontece (uma
// reunião "Realizada" vinculada àquele item). Quem nunca teve o primeiro contato não gera
// alerta: pode ser que aquele parlamentar/tema simplesmente ainda não precisou de um contato.
export function ultimoContatoItem(tipo, itemId, eventos) {
  const campo = tipo === 'destinacao' ? 'destinacaoId' : 'projetoId';
  const relevantes = (eventos || []).filter((e) => e.status === 'Realizada' && e.data && e[campo] === itemId);
  if (!relevantes.length) return null;
  return relevantes.reduce((max, e) => (e.data > max ? e.data : max), relevantes[0].data);
}

export function diasSemContatoItem(tipo, itemId, eventos) {
  const ultima = ultimoContatoItem(tipo, itemId, eventos);
  if (!ultima) return null;
  const hoje = new Date();
  const hojeUTC = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const [y, m, d] = ultima.split('-').map(Number);
  return Math.floor((hojeUTC - Date.UTC(y, m - 1, d)) / 86400000);
}

// null (ainda sem primeiro contato) não gera alerta — só depois que o relacionamento pra
// aquela tarefa foi estabelecido é que faz sentido cobrar recorrência.
export function nivelGargalo(dias) {
  if (dias === null || dias === undefined) return null;
  if (dias > 30) return 'vermelho';
  if (dias > 15) return 'amarelo';
  return null;
}

// Uma tarefa só entra no radar de gargalo enquanto ainda está em aberto — destinação já
// entregue ou projeto já aprovado/arquivado "perdeu a necessidade de acompanhamento".
export function destinacaoAtiva(d) {
  return d.status !== 'Entregue';
}
export function projetoAtivo(p) {
  return p.status !== 'Aprovado' && p.status !== 'Arquivado';
}

// "Acordo Verbal" é o primeiro estágio do fluxo — uma promessa ainda não formalizada. Conta
// no total previsto do próprio ano (é a previsão real daquele ano), mas fica de fora das
// médias/ranking "quem mais destinou" (que olham só o que já saiu de mera promessa) até
// evoluir de estágio — a exclusão é dinâmica pelo status atual, não uma marcação fixa.
export function destinacaoConfirmada(d) {
  return d.status !== 'Acordo Verbal';
}

export const STATUS_DESTINACAO = ['Acordo Verbal', 'Em articulação', 'Indicado', 'Confirmado', 'Empenhado', 'Em licitação', 'Contratado', 'Entregue'];
export const STATUS_PROJETO = ['Protocolado', 'Em Análise Técnica', 'Aguardando Relator', 'Em Comissão', 'Aprovado em Comissão', 'Em Plenário', 'Aprovado', 'Arquivado'];
export const TIPOS_PROJETO = ['PL', 'PLP', 'PEC', 'REQ', 'MPV'];

export const TIPOS_EVENTO = { leg: 'Legislativo', rec: 'Captação', div: 'Assunto Diverso' };
export const TIPOS_REUNIAO = ['Reunião institucional', 'Audiência', 'Contato informal', 'Visita a gabinete', 'Evento institucional', 'Reunião de captação', 'Outro'];
export const STATUS_EVENTO = ['Prevista', 'Realizada', 'Cancelada', 'Remarcada'];
