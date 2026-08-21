import { createContext, useContext, useEffect, useState } from 'react';

const STORE_KEY = 'painel-nacional-store-v2';
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

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persist(store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function nextId(list) {
  return list.reduce((max, x) => Math.max(max, x.id), 0) + 1;
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

export function StoreProvider({ children }) {
  const [store, setStore] = useState(null);

  useEffect(() => {
    (async () => {
      let persisted = loadPersisted();
      // Migração: navegadores que já tinham o antigo "legislativoNacional" separado (bug
      // corrigido — essa lista sempre foi, na prática, a mesma coisa que projetos de lei)
      // ganham esses itens fundidos dentro de projetos, uma única vez.
      if (persisted && persisted.legislativoNacional) {
        const jaExistem = new Set((persisted.projetos || []).map((p) => `${p.tipo}-${p.numero}`));
        const novos = persisted.legislativoNacional
          .map(nacionalToProjeto)
          .filter((p) => !jaExistem.has(`${p.tipo}-${p.numero}`));
        const projetosBase = persisted.projetos || [];
        const migrados = novos.map((p, i) => ({ ...p, id: nextId(projetosBase) + i }));
        persisted = {
          ...persisted,
          projetos: [...projetosBase, ...migrados],
          projetosFonte: persisted.legislativoFonte || persisted.projetosFonte || null,
        };
        delete persisted.legislativoNacional;
        delete persisted.legislativoFonte;
        persist(persisted);
      }
      // Migração: projetos já fundidos numa sessão anterior (com o antigo campo
      // parlamentarNome) ganham autor/relator extraídos do relatório ASPAR, uma única vez.
      if (persisted?.projetos?.some((p) => p.origemNacional && p.autor === undefined)) {
        persisted = {
          ...persisted,
          projetos: persisted.projetos.map((p) => {
            if (!p.origemNacional || p.autor !== undefined) return p;
            const autorRelator = AUTOR_RELATOR_NACIONAL[`${p.tipo}-${p.numero}`] || {};
            const { parlamentarNome, ...resto } = p;
            return { ...resto, autor: autorRelator.autor || null, relator: autorRelator.relator || null };
          }),
        };
        persist(persisted);
      }
      // Migração: "acordo verbal" era um campo booleano à parte (tirava o item do ano
      // normal) — virou o primeiro status do fluxo, pra 2027 continuar navegável como
      // qualquer outro ano. Quem já tinha o campo booleano marcado vira status.
      if (persisted?.destinacoes?.some((d) => d.acordoVerbal !== undefined)) {
        persisted = {
          ...persisted,
          destinacoes: persisted.destinacoes.map((d) => {
            if (d.acordoVerbal === undefined) return d;
            const { acordoVerbal, ...resto } = d;
            return acordoVerbal ? { ...resto, status: 'Acordo Verbal' } : resto;
          }),
        };
        persist(persisted);
      }
      // Sincronização leve dos projetos de origem nacional: o GitHub Actions atualiza
      // acompanhamento-legislativo.json quando alguma proposição monitorada tem movimentação
      // nova (ver scripts/fetch-tramitacoes.js). Sem este passo, um navegador que já visitou o
      // app uma vez nunca mais veria essa atualização — o resto do estado vem só do
      // localStorage. Só os campos "de fonte" (ultimaMovimentacao/casaAtual/link/situacao) são
      // sobrescritos; qualquer edição manual do usuário (status, responsável, próximo passo
      // etc.) fica intacta.
      if (persisted) {
        try {
          const legislativoRaw = await fetchJson(`${import.meta.env.BASE_URL}data/acompanhamento-legislativo.json`, null);
          if (legislativoRaw) {
            const porChave = new Map((legislativoRaw.proposicoes || []).map((p) => [`${p.tipo}-${p.numero}`, p]));
            let mudou = false;
            const projetosAtualizados = (persisted.projetos || []).map((proj) => {
              if (!proj.origemNacional) return proj;
              const fresco = porChave.get(`${proj.tipo}-${proj.numero}`);
              if (!fresco?.ultimaMovimentacao) return proj;
              const igual = proj.ultimaMovimentacao?.data === fresco.ultimaMovimentacao.data && proj.ultimaMovimentacao?.descricao === fresco.ultimaMovimentacao.descricao;
              if (igual) return proj;
              mudou = true;
              return { ...proj, ultimaMovimentacao: fresco.ultimaMovimentacao, casaAtual: fresco.casaAtual ?? proj.casaAtual, link: fresco.link ?? proj.link };
            });
            const fonteAtualizada = { fonte: legislativoRaw.fonte, observacao: legislativoRaw.observacao, atualizacoesRecentes: legislativoRaw.atualizacoesRecentes };
            const fonteMudou = JSON.stringify(fonteAtualizada.atualizacoesRecentes) !== JSON.stringify(persisted.projetosFonte?.atualizacoesRecentes);
            if (mudou || fonteMudou) {
              persisted = { ...persisted, projetos: projetosAtualizados, projetosFonte: fonteAtualizada };
              persist(persisted);
            }
          }
        } catch (err) {
          console.warn('[store] falha ao sincronizar acompanhamento-legislativo.json:', err.message);
        }
      }

      if (persisted) {
        setStore(persisted);
        return;
      }
      const [destinacoes, legislativoRaw] = await Promise.all([
        fetchJson(`${import.meta.env.BASE_URL}data/destinacoes-seed.json`, []),
        fetchJson(`${import.meta.env.BASE_URL}data/acompanhamento-legislativo.json`, null),
      ]);
      const projetosNacionais = (legislativoRaw?.proposicoes || []).map((p, i) => ({ ...nacionalToProjeto(p), id: i + 1 }));
      const initial = {
        destinacoes,
        projetos: projetosNacionais,
        eventos: [],
        projetosFonte: legislativoRaw ? { fonte: legislativoRaw.fonte, observacao: legislativoRaw.observacao, atualizacoesRecentes: legislativoRaw.atualizacoesRecentes } : null,
        parlamentarNotas: {},
      };
      persist(initial);
      setStore(initial);
    })();
  }, []);

  function update(mutator) {
    setStore((prev) => {
      const next = mutator(structuredClone(prev));
      persist(next);
      return next;
    });
  }

  const api = {
    loading: store === null,
    destinacoes: store?.destinacoes || [],
    projetos: store?.projetos || [],
    eventos: store?.eventos || [],
    projetosFonte: store?.projetosFonte || null,
    parlamentarNotas: store?.parlamentarNotas || {},

    addDestinacao(dest) {
      update((s) => {
        s.destinacoes.push({ ...dest, etapas: statusToEtapas(dest.status), id: nextId(s.destinacoes) });
        return s;
      });
    },
    updateDestinacao(id, patch) {
      update((s) => {
        const i = s.destinacoes.findIndex((d) => d.id === id);
        if (i >= 0) {
          const merged = { ...s.destinacoes[i], ...patch };
          // Se o status mudou via formulário, deriva as etapas correspondentes
          if (patch.status && patch.status !== s.destinacoes[i].status) merged.etapas = statusToEtapas(patch.status);
          s.destinacoes[i] = merged;
        }
        return s;
      });
    },
    removeDestinacao(id) {
      update((s) => {
        s.destinacoes = s.destinacoes.filter((d) => d.id !== id);
        return s;
      });
    },
    toggleDestinacaoEtapa(id, key) {
      update((s) => {
        const i = s.destinacoes.findIndex((d) => d.id === id);
        if (i < 0) return s;
        const d = { ...s.destinacoes[i], etapas: { ...s.destinacoes[i].etapas } };
        const clickedIdx = ETAPAS_ORDEM.indexOf(key);
        const marcar = !d.etapas[key];
        ETAPAS_ORDEM.forEach((k, idx) => {
          if (marcar && idx <= clickedIdx) d.etapas[k] = 1;
          if (!marcar && idx >= clickedIdx) d.etapas[k] = 0;
        });
        d.status = etapasToStatus(d.etapas);
        s.destinacoes[i] = d;
        return s;
      });
    },

    addProjeto(proj) {
      update((s) => {
        s.projetos.push({ ...proj, id: nextId(s.projetos) });
        return s;
      });
    },
    updateProjeto(id, patch) {
      update((s) => {
        const i = s.projetos.findIndex((p) => p.id === id);
        if (i >= 0) s.projetos[i] = { ...s.projetos[i], ...patch };
        return s;
      });
    },
    removeProjeto(id) {
      update((s) => {
        s.projetos = s.projetos.filter((p) => p.id !== id);
        return s;
      });
    },

    addEvento(ev) {
      update((s) => {
        s.eventos = s.eventos || [];
        s.eventos.push({ ...ev, id: nextId(s.eventos) });
        return s;
      });
    },
    updateEvento(id, patch) {
      update((s) => {
        const i = (s.eventos || []).findIndex((x) => x.id === id);
        if (i >= 0) s.eventos[i] = { ...s.eventos[i], ...patch };
        return s;
      });
    },
    removeEvento(id) {
      update((s) => {
        s.eventos = (s.eventos || []).filter((x) => x.id !== id);
        return s;
      });
    },

    setParlamentarNota(key, nota) {
      update((s) => {
        s.parlamentarNotas[key] = { ...s.parlamentarNotas[key], ...nota };
        return s;
      });
    },

    exportJson() {
      return JSON.stringify(store, null, 2);
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
