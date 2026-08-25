# Painel de Captação — CBM-GO

App novo e independente (deploy próprio, separado do `painel-nacional`, mas publicado no
mesmo GitHub Pages) focado só em captação de recursos: dashboard gamificado com ranking de
quartéis, parlamentares de Goiás (com foto, votos recebidos, gabinete e stakeholders de
captação) e um formulário de cadastro de articulações.

**Primeira vez configurando?** Vá direto pro **[SETUP.md](./SETUP.md)** — passo a passo
clicável, sem precisar programar.

## Estrutura das 5 seções

1. **Dashboard** (`/`) — pódio e ranking dos quartéis que mais captam (R$) e mais articulam
   (cadastros + reuniões), com níveis (bronze/prata/ouro/diamante) e atividade recente.
2. **Parlamentares** (`/parlamentares`) — bancada de Goiás (17 deputados federais + 3
   senadores), com busca/filtro; cada perfil mostra contato, gabinete, votos recebidos na
   eleição, os stakeholders vinculados a ele (editáveis/excluíveis ali — cadastrar um novo é
   só pela aba Stakeholders) e as captações vinculadas a ele (clique numa pra ver o detalhe,
   a linha do tempo, e editar/excluir).
3. **Stakeholders** (`/stakeholders`) — cadastre uma pessoa (ex: um prefeito) e marque um ou
   mais parlamentares com quem ela articula ao mesmo tempo. Depois de cadastrado, aparece pra
   escolher no formulário de Cadastrar primeiro contato e no perfil de cada parlamentar
   vinculado.
4. **Cadastrar primeiro contato** (`/cadastro`) — formulário: quartel (o campo Responsável já
   lista os militares vinculados àquele quartel — pool vindo do Almanaque completo de Oficiais
   e Praças do CBMGO), parlamentar, stakeholder (obrigatório — sugere quem está vinculado ao
   parlamentar escolhido), objeto, valor previsto, descrição (obrigatória), data do primeiro
   contato (vira automaticamente o primeiro passo da linha do tempo), anexos (documentos/fotos).
   Toda captação nasce **"Primeiro contato"** — não tem estágio pra escolher aqui. Dentro de
   cada captação, a seção **"Adicionar andamento"** registra os próximos passos (data,
   descrição, quem esteve presente, foto/documento) — lançar o primeiro andamento já deixa a
   captação **"Em articulação"** sozinha, até o militar responsável marcar o desfecho ali mesmo:
   **Indicado** ou **Arquivado**. Um alerta automático aparece se uma captação ainda em
   andamento ficar 15+ dias (🟡 esfriando) ou 30+ dias (🔴 parada) sem nenhum andamento novo.
   Este painel só acompanha até a captação ser indicada — o que acontece depois (empenho,
   licitação, entrega) é acompanhado no painel-nacional. A cada cadastro, uma notificação por
   e-mail sai pra `asparcbmgo@gmail.com` (ver EmailJS abaixo).
5. **Acesso restrito** (`/gerenciamento`) — adicionar, editar e remover quartéis e militares
   direto no site (sem precisar entrar no Supabase). **Única aba com login** (dado de
   organização interna): entra com e-mail/senha — o e-mail do administrador libera sozinho,
   qualquer outro fica "Pendente" até o administrador aprovar (que recebe um e-mail avisando)
   numa sub-aba **Acessos**, onde também dá pra revogar depois (ver "Login e aprovação de
   acesso" abaixo).

## Como os dados funcionam

**Deputados/senadores de Goiás e votos recebidos** continuam sendo JSON estático em
`public/data/` (só leitura, filtrado do painel-nacional — ver
`scripts/gerar-parlamentares-go.js`).

**Quartéis, militares, stakeholders, captações e a linha do tempo de cada captação** vivem num
banco **Supabase** (Postgres gerenciado, plano gratuito). O navegador acessa o Supabase
diretamente — sem servidor próprio no meio — usando a "anon public key", uma chave feita pra
ficar visível no código do site: quem protege os dados são as regras de segurança (RLS)
definidas em `supabase/schema.sql`, não o sigilo da chave. Isso significa:

- **Leitura**: todo mundo que abre o site vê os dados na hora (não depende de rebuild/deploy).
- **Escrita**: as 5 tabelas aceitam criar/editar/remover direto do site — `captacoes` pelo
  formulário de Cadastro (e a edição/exclusão inline, tanto lá quanto no perfil do
  parlamentar); `captacao_eventos` (a linha do tempo) pelo botão "Linha do tempo" de cada
  captação; `quarteis` e `militares` pela aba **Acesso restrito**; `stakeholders` pela aba
  **Stakeholders** (vinculando um ou mais parlamentares), editável/excluível tanto ali quanto
  no perfil de cada parlamentar vinculado. Nenhuma delas precisa do Table Editor do Supabase
  pro dia a dia.
- **Tempo real**: quem estiver com o Dashboard ou o Cadastro aberto vê um cadastro novo (feito
  por qualquer pessoa) aparecer sozinho na tela, sem precisar recarregar a página.
- **Anexos** (fotos/documentos do formulário) sobem pro Storage do Supabase (bucket `anexos`,
  público pra leitura) — limite de ~4MB por arquivo (ver `src/components/FileField.jsx`).

⚠️ **Sobre segurança**: a maior parte do site não tem login — qualquer pessoa com o link
consegue cadastrar captações, stakeholders etc. (é dado que a equipe toda mexe no dia a dia).
A aba **Acesso restrito** é diferente: exige **login do Supabase Auth** (e-mail/senha)
**e** aprovação do administrador — só o e-mail do administrador (fixado no gatilho de
`auth.users`, ver `supabase/schema.sql`, seção 4.2) entra liberado sozinho; qualquer outra
conta fica pendente até ser aprovada pela aba Acesso restrito → Acessos (o administrador recebe
um e-mail avisando de cada pedido). Se um dia o resto do site também precisar desse controle,
dá pra estender o mesmo esquema sem redesenhar nada — me avise.

## Deploy (GitHub Pages — mesma automação do painel-nacional)

Não precisa de Netlify nem de nenhuma conta nova além do Supabase. O workflow
`.github/workflows/publicar-painel-captacao.yml` builda este app e publica em
`painel-captacao-app/` (raiz do repositório) a cada push que mexer em `painel-captacao/**` —
o GitHub Pages já serve esse repositório, então o site fica no ar sozinho. Pra disparar na
mão: aba **Actions** → **"Publicar — Painel de Captação (CBM-GO)"** → **Run workflow**.

Não há nenhuma variável de ambiente/segredo pra configurar no GitHub — a URL e a chave pública
do Supabase ficam versionadas em `src/lib/supabase-config.js` (ver **SETUP.md**, passo 5).

## Notificação por e-mail

Cada captação cadastrada dispara um e-mail (via **EmailJS**, mesmo modelo client-side do
Supabase — sem servidor no meio) pra `asparcbmgo@gmail.com` (endereço configurável em
`src/lib/emailjs-config.js`, constante `EMAIL_NOTIFICACAO_PARA`). Se o EmailJS ainda não
estiver configurado, ou se o envio falhar por qualquer motivo, a captação continua sendo
salva normalmente — o e-mail é só um aviso a mais, nunca bloqueia o cadastro. Configuração
passo a passo em **SETUP.md**, seção 6.

## Pendências de dados

- **Quartéis e militares** — o `supabase/schema.sql` já semeia as 61 unidades (60 do CBMGO +
  SENASP/MJ) e os 122 militares da Convocação nº 106/2026 (posto, RG, nome de guerra, OBM).
  Ajuste direto nas tabelas `quarteis`/`militares` pelo Table Editor do Supabase (SETUP.md,
  seção 4) — sem precisar rodar SQL de novo.
- **Stakeholders** — tabela vazia até alguém cadastrar pela aba Stakeholders (SETUP.md, última
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

## Login e aprovação de acesso (aba Acesso restrito)

Usa o **Supabase Auth** (já incluso no mesmo projeto, sem conta nova) — e-mail/senha.
O e-mail do administrador (fixado no gatilho em `auth.users`, ver `schema.sql`) entra liberado
sozinho; qualquer outra conta nova cai "pendente" e dispara um e-mail (via EmailJS, template
separado do de captações) avisando o administrador. Aprovação (ou revogação depois) é feita
pela própria aba **Acesso restrito → Acessos**. Configuração completa (Site URL/Redirect URLs no
Supabase, template do e-mail de pedido de acesso) em **SETUP.md**, seção 7.

## Stack

Vite + React + React Router, Tailwind CSS v4, Recharts, Framer Motion, `@supabase/supabase-js`
(banco de dados, autenticação de acesso via RLS, Storage de arquivos e tempo real — tudo pelo
mesmo pacote, direto do navegador) e a API REST do EmailJS (notificação por e-mail).
