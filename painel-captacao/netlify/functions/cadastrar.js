// Recebe o formulário de Cadastro (src/pages/Cadastro.jsx) e persiste o registro commitando
// direto no GitHub — mesmo "banco de dados" (o próprio repositório) usado pelo painel-nacional
// pra dados coletados por automação. A diferença aqui é que quem escreve é gente, pelo
// formulário público do site, então o token do GitHub tem que ficar só aqui no servidor
// (variável de ambiente da function, nunca no navegador) — client nenhum tem acesso a ele.
//
// Variáveis de ambiente necessárias (configurar no painel do Netlify deste site):
//   GITHUB_TOKEN   — fine-grained personal access token, só com "Contents: Read and write"
//                    neste repositório (ver painel-captacao/README.md).
// Opcionais (têm valor padrão já certo pra este monorepo):
//   GITHUB_REPO    — "owner/repo" (padrão: rafaelabnermmaciel-cmd/asparcbmgo)
//   GITHUB_BRANCH  — branch onde commitar (padrão: main)
//   GITHUB_BASE_PATH — caminho da pasta deste app dentro do repo (padrão: painel-captacao)

const GITHUB_API = 'https://api.github.com';

function env(name, fallback) {
  return process.env[name] || fallback;
}

async function githubRequest(path, token, options = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  });
  return res;
}

async function lerArquivo(repo, branch, caminho, token) {
  const res = await githubRequest(`/repos/${repo}/contents/${caminho}?ref=${branch}`, token);
  if (res.status === 404) return { conteudo: null, sha: null };
  if (!res.ok) throw new Error(`Falha ao ler ${caminho} no GitHub (HTTP ${res.status}): ${await res.text()}`);
  const json = await res.json();
  const conteudo = Buffer.from(json.content, 'base64').toString('utf-8');
  return { conteudo, sha: json.sha };
}

async function escreverArquivo(repo, branch, caminho, token, { conteudoBase64, sha, mensagem }) {
  const res = await githubRequest(`/repos/${repo}/contents/${caminho}`, token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: mensagem,
      content: conteudoBase64,
      branch,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Falha ao gravar ${caminho} no GitHub (HTTP ${res.status}): ${await res.text()}`);
  return res.json();
}

function sanitizarNomeArquivo(nome) {
  return (nome || 'arquivo').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-');
}

function gerarId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método não permitido — use POST.' };
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { statusCode: 500, body: 'Configuração ausente no servidor: variável de ambiente GITHUB_TOKEN não definida (ver painel-captacao/README.md).' };
  }

  const repo = env('GITHUB_REPO', 'rafaelabnermmaciel-cmd/asparcbmgo');
  const branch = env('GITHUB_BRANCH', 'main');
  const basePath = env('GITHUB_BASE_PATH', 'painel-captacao');
  const dataPath = `${basePath}/public/data/captacoes.json`;

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Corpo da requisição inválido (esperado JSON).' };
  }

  const obrigatorios = ['quartelId', 'responsavel', 'parlamentarNome', 'objeto', 'status'];
  const faltando = obrigatorios.filter((campo) => !payload[campo] || !String(payload[campo]).trim());
  if (faltando.length) {
    return { statusCode: 400, body: `Campos obrigatórios faltando: ${faltando.join(', ')}.` };
  }

  const id = gerarId();
  const criadoEm = new Date().toISOString();

  try {
    // 1) Sobe cada anexo (se houver) num caminho próprio do registro, antes de tocar no JSON
    // principal — assim, se um anexo falhar, o cadastro inteiro falha (nada fica "meio salvo").
    const anexosCommitados = [];
    for (const anexo of payload.anexos || []) {
      const match = /^data:(.+);base64,(.+)$/.exec(anexo.dataUrl || '');
      if (!match) continue;
      const [, tipoDetectado, base64] = match;
      const nomeSeguro = sanitizarNomeArquivo(anexo.nome);
      const caminhoAnexo = `${basePath}/public/data/anexos/${id}/${nomeSeguro}`;
      await escreverArquivo(repo, branch, caminhoAnexo, token, {
        conteudoBase64: base64,
        mensagem: `chore(captacao): anexo de ${payload.quartelNome || payload.quartelId} — ${nomeSeguro}`,
      });
      anexosCommitados.push({
        nome: anexo.nome,
        tipo: anexo.tipo || tipoDetectado,
        tamanho: anexo.tamanho || null,
        url: `/data/anexos/${id}/${nomeSeguro}`,
      });
    }

    // 2) Lê o captacoes.json atual (pode ainda não existir a primeira vez) e acrescenta o
    // novo registro no fim — nunca reordena/edita os que já existem.
    const { conteudo, sha } = await lerArquivo(repo, branch, dataPath, token);
    const captacoes = conteudo ? JSON.parse(conteudo) : [];

    const registro = {
      id,
      criadoEm,
      quartelId: payload.quartelId,
      quartelNome: payload.quartelNome || payload.quartelId,
      municipio: payload.municipio || '',
      responsavel: String(payload.responsavel).trim(),
      stakeholder: payload.stakeholder ? String(payload.stakeholder).trim() : '',
      parlamentarNome: payload.parlamentarNome,
      objeto: String(payload.objeto).trim(),
      valorPrevisto: Number(payload.valorPrevisto) || 0,
      valorConfirmado: Number(payload.valorConfirmado) || 0,
      numReunioes: Number(payload.numReunioes) || 0,
      status: payload.status,
      dataAgenda: payload.dataAgenda || '',
      observacoes: payload.observacoes ? String(payload.observacoes).trim() : '',
      anexos: anexosCommitados,
    };

    captacoes.push(registro);

    await escreverArquivo(repo, branch, dataPath, token, {
      conteudoBase64: Buffer.from(JSON.stringify(captacoes, null, 2) + '\n', 'utf-8').toString('base64'),
      sha,
      mensagem: `chore(captacao): novo cadastro — ${registro.quartelNome} / ${registro.parlamentarNome}`,
    });

    // A resposta HTTP inclui os dataUrl (base64) dos anexos só pra pré-visualização imediata
    // no navegador de quem cadastrou — isso NUNCA é gravado no captacoes.json (lá só fica a
    // URL definitiva, que só existe de fato depois do próximo deploy do site).
    const anexosParaResposta = registro.anexos.map((a, i) => ({ ...a, dataUrl: (payload.anexos || [])[i]?.dataUrl }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registro: { ...registro, anexos: anexosParaResposta } }),
    };
  } catch (err) {
    console.error('[cadastrar] erro:', err);
    return { statusCode: 500, body: `Erro ao cadastrar: ${err.message}` };
  }
}
