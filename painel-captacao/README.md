# Painel de Captação — CBM-GO

App novo e independente (deploy próprio, separado do `painel-nacional`) focado só em captação
de recursos: dashboard gamificado com ranking de quartéis, parlamentares de Goiás (com foto,
votos recebidos, gabinete e interlocutor de captação) e um formulário de cadastro de
articulações.

## Estrutura das 3 seções

1. **Dashboard** (`/`) — pódio e ranking dos quartéis que mais captam (R$) e mais articulam
   (cadastros + reuniões), com níveis (bronze/prata/ouro/diamante) e atividade recente.
2. **Parlamentares** (`/parlamentares`) — bancada de Goiás (17 deputados federais + 3
   senadores), com busca/filtro; cada perfil mostra contato, gabinete, votos recebidos na
   eleição, interlocutor de captação e as captações vinculadas a ele.
3. **Cadastrar captação** (`/cadastro`) — formulário: quartel, responsável, stakeholder,
   parlamentar, objeto, valor previsto, nº de reuniões, estágio (Primeiro contato → Em
   articulação → Agenda marcada → ... → Entregue), anexos (documentos/fotos).

## Como os dados funcionam (leitura vs. escrita)

**Leitura**: como no painel-nacional, os dados são arquivos JSON estáticos em `public/data/`,
buscados em tempo de execução pelo navegador. Isso significa que depois de qualquer commit
novo nesses arquivos, o site só reflete a mudança depois do próximo deploy (automático, se o
site estiver conectado ao Netlify via Git).

**Escrita** (o formulário de Cadastro): como pedido, usamos o **GitHub como banco de dados**,
igual ao painel-nacional — só que lá quem escreve é uma automação (GitHub Actions) buscando
dados públicos, e aqui quem escreve é gente, pelo formulário do site. Por segurança, o
navegador **nunca** tem acesso a nenhum token do GitHub — ele só envia os dados do formulário
pra uma function serverless (`netlify/functions/cadastrar.js`), que é a única peça que guarda
a credencial e faz o commit em `public/data/captacoes.json` (e os anexos em
`public/data/anexos/<id>/`) via API do GitHub. O commit dispara um novo deploy automático no
Netlify, publicando o cadastro pra todo mundo.

Isso tem duas implicações importantes:
- **Não existe leitura/escrita em tempo real** — depois de cadastrar, o próprio autor já vê o
  cadastro na hora (fica guardado em memória, com um selo "sincronizando"), mas outras pessoas
  só veem depois que o deploy terminar (segundos a poucos minutos).
- **Cada arquivo por requisição tem limite de ~4MB** (ver `src/components/FileField.jsx`) — é
  o tamanho de payload que uma function serverless aguenta numa chamada só. Fotos muito grandes
  precisam ser comprimidas antes de anexar.

## Configuração necessária antes do primeiro deploy

### 1. Criar um token do GitHub (só pra este repositório)

GitHub → **Settings → Developer settings → Fine-grained tokens → Generate new token**:
- **Repository access**: só o repositório `asparcbmgo` (não "todos os repositórios").
- **Permissions**: `Contents` → **Read and write** (nenhuma outra permissão é necessária).
- Copie o token gerado (só aparece uma vez).

### 2. Criar o site no Netlify

- **New site from Git** → escolha este repositório.
- **Base directory**: `painel-captacao`
- **Build command**: `npm run build`
- **Publish directory**: `dist` (relativo à base directory)
- **Functions directory**: `netlify/functions` (relativo à base directory) — o `netlify.toml`
  já define isso, mas confira nas configurações do site se o Netlify não reconheceu sozinho.

### 3. Variáveis de ambiente do site (Netlify → Site configuration → Environment variables)

| Variável | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `GITHUB_TOKEN` | **sim** | — | o token criado no passo 1 |
| `GITHUB_REPO` | não | `rafaelabnermmaciel-cmd/asparcbmgo` | `owner/repo` |
| `GITHUB_BRANCH` | não | `main` | branch onde os commits do formulário são feitos |
| `GITHUB_BASE_PATH` | não | `painel-captacao` | pasta deste app dentro do repositório |

Depois de configurar, dispare um deploy manual (ou dê push) pra aplicar.

## Pendências de dados (rascunho, aguardando confirmação)

- **`public/data/quarteis.json`** — a lista de quartéis está marcada como rascunho
  (`"rascunho": true`), extraída dos registros que já existiam no painel-nacional. Assim que a
  lista oficial completa chegar, substitua o array `quarteis` (mesmo formato
  `{ id, nome, municipio, tipo }`) e apague o campo `rascunho`/`observacao`.
- **`public/data/interlocutores.json`** — vazio (`{}`). Cada entrada usa a chave
  `"<casa>:<id>"` (ex: `"camara:220565"`, achado em `parlamentares-go.json`) com
  `{ nome, cargo, telefone, email, observacoes }` — o assessor/gabinete responsável por tratar
  de captação com aquele parlamentar.

## Rodando localmente

```bash
npm install
npm run dev          # só o front-end — o formulário de Cadastro não vai conseguir gravar,
                      # porque a function do Netlify não roda no `vite dev` puro
```

Pra testar o fluxo completo (incluindo o cadastro gravando de verdade), use a CLI do Netlify,
que roda front-end + functions juntos:

```bash
npm install -g netlify-cli
netlify dev           # pede GITHUB_TOKEN (e as outras variáveis) num arquivo .env local,
                       # ou configuradas via `netlify env:set`
```

### Atualizar a lista de parlamentares de Goiás

Os dados de deputados/senadores (foto, partido, gabinete, contato) vêm filtrados do
`painel-nacional` (que já roda a coleta via GitHub Actions — ver `painel-nacional/README.md`).
Depois que aquele painel atualizar `public/data/{deputados,senadores}.json`, rode aqui:

```bash
npm run sync:parlamentares-go
```

Isso regrava `public/data/parlamentares-go.json` só com os 20 parlamentares de Goiás (17
deputados federais + 3 senadores) e comita normalmente.

## Stack

Mesma stack do painel-nacional: Vite + React + React Router, Tailwind CSS v4, Recharts, Framer
Motion. A única peça nova é a function serverless (`netlify/functions/cadastrar.js`, Node, sem
dependências além do `fetch` nativo).
