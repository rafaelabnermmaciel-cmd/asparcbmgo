# Painel de Captação — CBM-GO

App novo e independente (deploy próprio, separado do `painel-nacional`, mas publicado no
mesmo GitHub Pages) focado só em captação de recursos: dashboard gamificado com ranking de
quartéis, parlamentares de Goiás (com foto, votos recebidos, gabinete e interlocutor de
captação) e um formulário de cadastro de articulações.

**Primeira vez configurando?** Vá direto pro **[SETUP.md](./SETUP.md)** — passo a passo
clicável, sem precisar programar.

## Estrutura das 3 seções

1. **Dashboard** (`/`) — pódio e ranking dos quartéis que mais captam (R$) e mais articulam
   (cadastros + reuniões), com níveis (bronze/prata/ouro/diamante) e atividade recente.
2. **Parlamentares** (`/parlamentares`) — bancada de Goiás (17 deputados federais + 3
   senadores), com busca/filtro; cada perfil mostra contato, gabinete, votos recebidos na
   eleição, interlocutor de captação e as captações vinculadas a ele.
3. **Cadastrar captação** (`/cadastro`) — formulário: quartel, responsável, stakeholder,
   parlamentar, objeto, valor previsto, nº de reuniões, estágio (Primeiro contato → Em
   articulação → Agenda marcada → ... → Entregue), anexos (documentos/fotos).

## Como os dados funcionam

**Deputados/senadores de Goiás e votos recebidos** continuam sendo JSON estático em
`public/data/` (só leitura, filtrado do painel-nacional — ver
`scripts/gerar-parlamentares-go.js`).

**Quartéis, militares, interlocutores e captações** vivem num banco **Supabase** (Postgres
gerenciado, plano gratuito). O navegador acessa o Supabase diretamente — sem servidor próprio
no meio — usando a "anon public key", uma chave feita pra ficar visível no código do site:
quem protege os dados são as regras de segurança (RLS) definidas em `supabase/schema.sql`, não
o sigilo da chave. Isso significa:

- **Leitura**: todo mundo que abre o site vê os dados na hora (não depende de rebuild/deploy).
- **Escrita**: só a tabela `captacoes` aceita gravação vinda do site (o formulário de
  Cadastro). As tabelas `quarteis`, `militares` e `interlocutores` são editadas direto no
  painel do Supabase (Table Editor — uma tela de planilha, sem precisar de código nem de git).
- **Tempo real**: quem estiver com o Dashboard ou o Cadastro aberto vê um cadastro novo (feito
  por qualquer pessoa) aparecer sozinho na tela, sem precisar recarregar a página.
- **Anexos** (fotos/documentos do formulário) sobem pro Storage do Supabase (bucket `anexos`,
  público pra leitura) — limite de ~4MB por arquivo (ver `src/components/FileField.jsx`).

## Deploy (GitHub Pages — mesma automação do painel-nacional)

Não precisa de Netlify nem de nenhuma conta nova além do Supabase. O workflow
`.github/workflows/publicar-painel-captacao.yml` builda este app e publica em
`painel-captacao-app/` (raiz do repositório) a cada push que mexer em `painel-captacao/**` —
o GitHub Pages já serve esse repositório, então o site fica no ar sozinho. Pra disparar na
mão: aba **Actions** → **"Publicar — Painel de Captação (CBM-GO)"** → **Run workflow**.

Não há nenhuma variável de ambiente/segredo pra configurar no GitHub — a URL e a chave pública
do Supabase ficam versionadas em `src/lib/supabase-config.js` (ver **SETUP.md**, passo 5).

## Pendências de dados

- **Quartéis e militares** — o `supabase/schema.sql` já semeia as 61 unidades (60 do CBMGO +
  SENASP/MJ) e os 122 militares da Convocação nº 106/2026 (posto, RG, nome de guerra, OBM).
  Ajuste direto nas tabelas `quarteis`/`militares` pelo Table Editor do Supabase (SETUP.md,
  seção 4) — sem precisar rodar SQL de novo.
- **Interlocutores por parlamentar** — tabela vazia até alguém preencher (SETUP.md, última
  seção).

## Rodando localmente

```bash
npm install
npm run dev
```

Pra testar o formulário de Cadastro gravando de verdade, primeiro configure
`src/lib/supabase-config.js` (ver SETUP.md) — sem isso, o site mostra uma tela avisando que
falta configurar, em vez de quebrar.

### Atualizar a lista de parlamentares de Goiás

Os dados de deputados/senadores (foto, partido, gabinete, contato) vêm filtrados do
`painel-nacional` (que já roda a coleta via GitHub Actions — ver `painel-nacional/README.md`).
Depois que aquele painel atualizar `public/data/{deputados,senadores}.json`, rode aqui:

```bash
npm run sync:parlamentares-go
```

Isso regrava `public/data/parlamentares-go.json` só com os 20 parlamentares de Goiás (17
deputados federais + 3 senadores).

## Stack

Vite + React + React Router, Tailwind CSS v4, Recharts, Framer Motion, `@supabase/supabase-js`
(banco de dados, autenticação de acesso via RLS, Storage de arquivos e tempo real — tudo pelo
mesmo pacote, direto do navegador).
