# Painel Parlamentar — Congresso Nacional

Painel estático com dados dos 594 parlamentares do Brasil (513 deputados federais + 81
senadores): listagem com busca/filtro por UF e partido, ficha individual (foto, partido, UF,
gabinete, contato, histórico de votações e votos recebidos na eleição) e acompanhamento
legislativo. Pensado para hospedar no Netlify como site estático.

Complementa o dashboard SGPAR (CBM-GO), que continua existindo em `../index.html` — este é um
projeto novo e independente, na raiz `/painel-nacional`.

## 🚀 Caminho mais fácil (sem instalar nada) — GitHub Actions

Se você não quer instalar Node.js nem usar terminal, use a automação já configurada em
`.github/workflows/atualizar-dados-painel-nacional.yml`:

1. Vá na aba **Actions** deste repositório no GitHub.
2. Clique em **"Atualizar dados — Painel Parlamentar Nacional"** na lista à esquerda.
3. Clique no botão **"Run workflow"** (canto direito) e confirme.
4. Aguarde alguns minutos — ele busca os dados reais da Câmara, do Senado e (se você marcar a
   opção) do TSE, direto na nuvem do GitHub, que tem acesso normal à internet.
5. Se algo mudou, ele mesmo cria um commit com os arquivos atualizados em `public/data/`.
6. Se o site já estiver conectado ao Netlify, isso dispara um novo deploy automaticamente.

Essa automação também roda sozinha toda segunda-feira, mantendo os dados em dia.


## ⚠️ Leia antes de rodar os scripts de coleta

Este projeto foi escrito num ambiente de desenvolvimento **sem acesso de rede** a
`dadosabertos.camara.leg.br`, `legis.senado.leg.br` e `dadosabertos.tse.jus.br` (testei
diretamente — as três conexões são bloqueadas pelo proxy de rede da sessão). Por isso:

- Os scripts em `/scripts` foram escritos com base na documentação pública dessas APIs, mas
  **nunca foram executados nem testados de fato**. Rode-os você mesmo (localmente, onde a rede
  não tem essa restrição) e revise a saída antes de confiar nos dados.
- `scripts/fetch-parlamentares.js` (Câmara + Senado) é o mais simples e o que tenho mais
  confiança de que funciona como está — os endpoints e o formato de resposta são bem
  documentados.
- `scripts/fetch-votacoes.js` usa o endpoint `/deputados/{id}/votacoes` conforme solicitado,
  mas eu não tenho certeza de que esse endpoint existe exatamente assim na Câmara — confira no
  Swagger oficial (link abaixo) e ajuste se necessário.
- `scripts/fetch-eleicoes.js` (TSE) é o menos confiável dos três: o TSE não tem uma API simples
  de "nome → votos", é um portal de dados abertos (CKAN) que distribui CSVs grandes por
  estado/ano. O script tenta localizar e baixar o CSV certo automaticamente, mas o nome exato
  do pacote/dataset pode ter mudado. **Por isso o padrão é `--limit 10`** — teste com poucos
  parlamentares, confira manualmente os números batendo com o site oficial do TSE, e só depois
  rode com `--all`.

Cada script tem um comentário no topo detalhando exatamente o que foi e não foi verificado.

Documentação oficial das APIs:
- Câmara: https://dadosabertos.camara.leg.br/swagger/api.html
- Senado: https://legis.senado.leg.br/dadosabertos/docs/
- TSE: https://dadosabertos.tse.jus.br

## Rodando localmente

```bash
npm install

# 1. Busca deputados + senadores (lista completa + detalhes de cada um)
npm run fetch:parlamentares
# para testar rápido com poucos antes de rodar todos os 594:
npm run fetch:parlamentares -- --limit 10

# 2. Busca histórico de votações de cada parlamentar (depende do passo 1)
npm run fetch:votacoes
npm run fetch:votacoes -- --limit 10       # teste
npm run fetch:votacoes -- --resume         # retoma de onde parou, se um run longo cair no meio

# 3. Cruza com votos recebidos na eleição via TSE (depende do passo 1) — SEMPRE teste primeiro:
npm run fetch:eleicoes -- --ano 2022 --limit 10
# depois de conferir manualmente que os números batem:
npm run fetch:eleicoes -- --ano 2022 --all

# Rodar o site em desenvolvimento
npm run dev
```

Os dados ficam em `public/data/*.json` — o app lê esses arquivos em tempo de execução (não
precisa rebuildar para atualizar os dados, mas para o deploy estático da Netlify é necessário
rodar os scripts antes do build, ou configurá-los no comando de build).

Enquanto `public/data/*.json` estiver vazio (estado inicial do repositório), o app funciona
normalmente e mostra um aviso "Nenhum dado carregado ainda" em vez de quebrar.

## Acompanhamento Legislativo

`public/data/acompanhamento-legislativo.json` já vem preenchido com as proposições reais do
"Relatório Consolidado de Proposições Legislativas do CBM" (fonte ASPAR, 18/08/2026) — número,
status, órgão e tramitação exatamente como constam no PDF fornecido. Nada foi inventado; o
relatório não identifica um parlamentar autor/relator específico para cada proposição, então o
campo `parlamentar` fica `null` em vez de um vínculo forçado.

## Deploy no Netlify

1. Configure o site apontando para este diretório (`painel-nacional/`) como base.
2. Build command: `npm run build` · Publish directory: `dist` (já configurado em
   `netlify.toml`).
3. Rode os scripts de coleta **antes** do deploy (localmente, commitando os JSONs resultantes
   em `public/data/`) — ou adicione os scripts ao processo de build da Netlify se preferir
   gerar os dados a cada deploy (nesse caso configure as chamadas de rede terem tempo/limite
   adequado, já que são centenas de requisições).

## Stack

- Vite + React + React Router
- Tailwind CSS v4 (`@tailwindcss/vite`), modo claro por padrão com toggle para escuro
  (persistido em `localStorage`)
- Recharts (gráficos interativos com hover)
- Framer Motion (animações leves de entrada ao rolar a página)
