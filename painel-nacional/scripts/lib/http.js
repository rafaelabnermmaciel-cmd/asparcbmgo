// Cliente HTTP com retry/backoff e limitação de taxa, usado por todos os scripts de coleta.
// Este ambiente de desenvolvimento não tem acesso de rede a dadosabertos.camara.leg.br,
// legis.senado.leg.br nem dadosabertos.tse.jus.br (confirmado por testes diretos) — este
// arquivo nunca foi executado com rede real. Revise com atenção antes do primeiro uso.

const DEFAULT_HEADERS = {
  'User-Agent': 'painel-nacional-parlamentar (uso institucional, contato: definir)',
  Accept: 'application/json',
};

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
      const res = await fetch(url, { headers: { ...DEFAULT_HEADERS, ...headers }, signal: AbortSignal.timeout(timeoutMs) });
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
      if (attempt < retries) {
        const delay = baseDelayMs * 2 ** attempt;
        console.warn(`[http] falha (${err.message}) em ${url} — tentativa ${attempt + 1}/${retries}, aguardando ${delay}ms`);
        await sleep(delay);
      }
    }
  }
  throw new Error(`[http] esgotadas ${retries + 1} tentativas em ${url}: ${lastErr?.message}`);
}

/**
 * Baixa um arquivo (texto/CSV) com retry, sem parsear.
 */
async function getText(url, opts = {}) {
  const { retries = 4, baseDelayMs = 800, timeoutMs = 20000, headers = {} } = opts;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { ...DEFAULT_HEADERS, ...headers }, signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} em ${url}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        const delay = baseDelayMs * 2 ** attempt;
        console.warn(`[http] falha (${err.message}) em ${url} — tentativa ${attempt + 1}/${retries}, aguardando ${delay}ms`);
        await sleep(delay);
      }
    }
  }
  throw new Error(`[http] esgotadas ${retries + 1} tentativas em ${url}: ${lastErr?.message}`);
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
