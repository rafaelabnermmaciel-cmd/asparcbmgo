// Cliente HTTP com retry/backoff e limitação de taxa, usado por todos os scripts de coleta.
// Este ambiente de desenvolvimento não tem acesso de rede a dadosabertos.camara.leg.br,
// legis.senado.leg.br nem dadosabertos.tse.jus.br (confirmado por testes diretos) — este
// arquivo nunca foi executado com rede real. Revise com atenção antes do primeiro uso.

// Usa o fetch do próprio pacote "undici" (não o fetch global do Node) porque o dispatcher
// customizado abaixo só é compatível com o fetch da MESMA versão do undici que o criou — passar
// esse Agent pro fetch global do Node (que embute sua própria cópia interna, de outra versão)
// quebra com "UND_ERR_INVALID_ARG: invalid onRequestStart method" (visto na prática ao testar).
import { fetch, Agent } from 'undici';

const DEFAULT_HEADERS = {
  'User-Agent': 'painel-nacional-parlamentar (uso institucional, contato: definir)',
  Accept: 'application/json',
};

// O fetch global do Node usa um Agent undici padrão com timeout de CONEXÃO (TCP, antes de
// qualquer resposta) de só 10s — visto na prática: a Câmara às vezes demora mais que isso só pra
// aceitar a conexão (erro real: UND_ERR_CONNECT_TIMEOUT, não uma resposta lenta). 20s dá mais
// folga sem deixar o script travado indefinidamente numa conexão morta.
const dispatcher = new Agent({ connect: { timeout: 20000 } });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Faz um GET com retry exponencial. Lança erro se todas as tentativas falharem.
 * @param {string} url
 * @param {object} opts
 * @param {number} [opts.retries=4]
 * @param {number} [opts.baseDelayMs=800]
 * @param {number} [opts.timeoutMs=20000] corta a requisição se travar sem resposta
 * @param {Record<string,string>} [opts.headers]
 */
async function getJson(url, opts = {}) {
  const { retries = 4, baseDelayMs = 800, timeoutMs = 20000, headers = {} } = opts;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { ...DEFAULT_HEADERS, ...headers }, signal: AbortSignal.timeout(timeoutMs), dispatcher });
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get('retry-after')) || baseDelayMs * 2 ** attempt / 1000;
        console.warn(`[http] 429 rate limited em ${url} — aguardando ${retryAfter}s`);
        await sleep(retryAfter * 1000);
        continue;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText} em ${url}`);
      }
      return await res.json();
    } catch (err) {
      lastErr = err;
      // 4xx (exceto 429, já tratado no getJson) é erro permanente — endpoint errado, parâmetro
      // inválido etc. — nunca muda com retry. Insistir só atrasa o script à toa (visto na
      // prática: um 404 de endpoint chutado errado gastou ~12s em retries inúteis).
      const permanente = /^HTTP 4\d\d/.test(err.message);
      if (permanente) break;
      if (attempt < retries) {
        const delay = baseDelayMs * 2 ** attempt;
        console.warn(`[http] falha (${detalheErro(err)}) em ${url} — tentativa ${attempt + 1}/${retries}, aguardando ${delay}ms`);
        await sleep(delay);
      }
    }
  }
  throw new Error(`[http] esgotadas tentativas em ${url}: ${detalheErro(lastErr)}`);
}

/**
 * Baixa um arquivo (texto/CSV) com retry, sem parsear.
 */
async function getText(url, opts = {}) {
  const { retries = 4, baseDelayMs = 800, timeoutMs = 20000, headers = {} } = opts;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { ...DEFAULT_HEADERS, ...headers }, signal: AbortSignal.timeout(timeoutMs), dispatcher });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} em ${url}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
      // 4xx (exceto 429, já tratado no getJson) é erro permanente — endpoint errado, parâmetro
      // inválido etc. — nunca muda com retry. Insistir só atrasa o script à toa (visto na
      // prática: um 404 de endpoint chutado errado gastou ~12s em retries inúteis).
      const permanente = /^HTTP 4\d\d/.test(err.message);
      if (permanente) break;
      if (attempt < retries) {
        const delay = baseDelayMs * 2 ** attempt;
        console.warn(`[http] falha (${detalheErro(err)}) em ${url} — tentativa ${attempt + 1}/${retries}, aguardando ${delay}ms`);
        await sleep(delay);
      }
    }
  }
  throw new Error(`[http] esgotadas tentativas em ${url}: ${detalheErro(lastErr)}`);
}

// "fetch failed" (erro genérico do undici/Node) esconde o motivo real dentro de err.cause —
// pode ser DNS (ENOTFOUND), conexão recusada (ECONNREFUSED), TLS, timeout etc. Sem isso logado,
// uma falha de rede inteira (como a de todas as chamadas à Câmara numa mesma execução) vira só
// "fetch failed" repetido, sem dar pra saber se é a API fora do ar, DNS, ou outra coisa.
function detalheErro(err) {
  if (!err) return 'erro desconhecido';
  const causa = err.cause;
  if (causa) {
    const codigo = causa.code ? ` código=${causa.code}` : '';
    return `${err.message} (causa: ${causa.message || causa}${codigo})`;
  }
  return err.message;
}

/**
 * Processa uma lista em lotes com concorrência limitada, para não sobrecarregar as APIs
 * públicas (594 parlamentares × múltiplas chamadas cada = milhares de requisições).
 */
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

export { getJson, getText, sleep, mapWithConcurrency };
