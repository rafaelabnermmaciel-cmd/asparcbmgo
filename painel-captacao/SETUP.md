# Passo a passo — configurar o Supabase (sem precisar saber programar)

Siga na ordem. É só clicar, colar e apertar os botões indicados — em nenhum passo você
precisa escrever código. Onde tiver algo pra copiar, o texto vem destacado assim: `exemplo`.

No fim, os dois únicos valores que você precisa me mandar de volta (aqui no chat) são a
**Project URL** e a **anon public key** do passo 5 — eu mesmo edito o código e publico o site.

---

## 1. Criar sua conta no Supabase

1. Acesse **https://supabase.com** numa aba nova.
2. Clique em **Start your project** (canto superior direito).
3. Escolha **Continue with GitHub** e faça login com a mesma conta do GitHub que você já usa
   neste repositório (`rafaelabnermmaciel-cmd`) — assim fica tudo na mesma identidade.
4. Autorize o Supabase quando o GitHub perguntar.

## 2. Criar o projeto

1. Você vai cair numa tela de "Organizations" — se for a primeira vez, o Supabase já cria uma
   organização padrão pra você. Clique nela (ou em **New project** se não tiver nenhuma).
2. Clique no botão verde **New project**.
3. Preencha:
   - **Name**: `painel-captacao` (ou o nome que quiser, não afeta nada)
   - **Database Password**: clique em **Generate a password**, e depois no ícone de copiar
     — cole essa senha num lugar seguro (bloco de notas, gerenciador de senhas). Você
     provavelmente não vai precisar dela de novo pra este painel, mas é bom guardar.
   - **Region**: escolha **South America (São Paulo)** — deixa o site mais rápido pra quem
     acessa do Brasil.
4. Clique em **Create new project**.
5. Aguarde — leva de 1 a 2 minutos enquanto o Supabase prepara tudo (barra de progresso na
   tela). Quando terminar, você cai automaticamente no painel do projeto.

## 3. Criar as tabelas, permissões e o espaço de anexos (um script só)

1. No menu da esquerda, clique no ícone de banco de dados **SQL Editor**.
2. Clique em **New query** (canto superior).
3. Abra o arquivo `painel-captacao/supabase/schema.sql` deste repositório, selecione todo o
   conteúdo (Ctrl+A / Cmd+A) e copie (Ctrl+C / Cmd+C).
4. Volte pro Supabase e cole (Ctrl+V / Cmd+V) tudo dentro da caixa de texto do SQL Editor.
5. Clique no botão verde **Run** (ou aperte Ctrl+Enter / Cmd+Enter).
6. Deve aparecer uma mensagem verde de sucesso ("Success. No rows returned" ou parecido) lá
   embaixo. Se aparecer algo em vermelho, me manda o texto do erro que eu ajusto o script.

### Conferir se deu certo

- Menu da esquerda → **Table Editor**: devem aparecer 5 tabelas — `quarteis` (129 linhas: todas
  as unidades do CBMGO, da página oficial de contatos), `militares` (quase 3 mil linhas — todo
  o Almanaque de Oficiais e Praças), `stakeholders` (vazia), `captacoes` (vazia) e
  `captacao_eventos` (vazia — os andamentos/linha do tempo de cada captação).
- Menu da esquerda → **Storage**: deve aparecer um bucket chamado `anexos`.

## 4. Editar quartéis e militares (direto na tela, sem código)

O script já cadastra as 129 unidades do CBMGO (posto, endereço etc. da página oficial de
contatos) e todos os militares dos Almanaques de Oficiais e Praças (posto, RG e nome). Quem já
tinha quartel vinculado (comandante de alguma unidade na página oficial, ou já vinculado pela
Convocação nº 106/2026) mantém o vínculo; o resto fica sem quartel até alguém vincular
manualmente. No Cadastro, ao escolher o quartel, o campo "Responsável" vira uma lista com os
militares já vinculados àquela unidade (inclui a opção "Outro" pra digitar um nome que não
esteja na lista, ou pra achar alguém do Almanaque que ainda não foi vinculado).

**Tabela `quarteis`** (a unidade em si):
1. Menu da esquerda → **Table Editor** → clique na tabela **quarteis**.
2. É uma planilha: clique em cima de qualquer célula pra editar o texto direto.
3. Pra adicionar um quartel novo: botão **Insert** → **Insert row** → preencha:
   - `id`: um código curto sem espaço/acento (ex: `10-bbm`)
   - `nome`: como deve aparecer no site (ex: `10º BBM`)
   - `municipio`: cidade onde fica
   - `tipo`: livre (ex: `BBM`, `CIBM`, `Comando`)
4. Pra apagar um quartel errado: clique na linha (seleciona) → ícone de lixeira.

**Tabela `militares`** (quem está designado em cada quartel):
1. Table Editor → tabela **militares**.
2. Pra adicionar: **Insert** → **Insert row** → preencha `posto`, `rg`, `nome` e `quartel_id`
   (tem que ser um `id` que já exista na tabela `quarteis`).
3. Pra corrigir ou remover alguém, edite/apague a linha normalmente.

Você pode voltar aqui a qualquer momento pra ajustar — o site sempre mostra os dados atuais
dessas tabelas, sem precisar de nenhum passo extra.

## 5. Pegar a URL e a chave do projeto (os 2 valores que preciso)

1. Menu da esquerda → ícone de engrenagem **Project Settings** → aba **API** (ou **Data API**,
   dependendo da versão).
2. Copie o campo **Project URL** (começa com `https://` e termina em `.supabase.co`).
3. Copie o campo **anon public** (uma chave longa, em **Project API keys** — **não** copie a
   `service_role`, essa é secreta e não deve ser usada aqui).
4. Cole os dois aqui no chat, algo como:
   ```
   URL: https://abcdefghijk.supabase.co
   anon key: eyJhbGciOiJI...
   ```
5. Eu edito `src/lib/supabase-config.js` com esses valores, commito e publico — o site fica no
   ar sozinho graças à automação do GitHub Actions (não precisa fazer mais nada).

## 6. Notificação por e-mail (a cada captação cadastrada, editada ou excluída)

Usa o **EmailJS** — manda e-mail direto do navegador, sem precisar de servidor (mesma lógica
do Supabase: uma chave pública, sem custo pra uso pequeno). Free tier: até 200 e-mails/mês.

### 6.1. Criar a conta e conectar o Gmail

1. Acesse **https://www.emailjs.com** → **Sign Up**. Pode criar com o e-mail
   `asparcbmgo@gmail.com` mesmo (ou qualquer outro — só quem administra precisa acessar essa
   conta depois).
2. Confirme o e-mail se for pedido, e faça login.
3. Menu da esquerda → **Email Services** → **Add New Service**.
4. Escolha **Gmail** → **Connect Account** → faça login com `asparcbmgo@gmail.com` e autorize.
5. Dê um nome pro serviço (ex: `gmail-asparcbmgo`) e salve.
6. **Copie o "Service ID"** que aparece na lista (algo como `service_abc1234`).

### 6.2. Criar o modelo (template) do e-mail

1. Menu da esquerda → **Email Templates** → **Create New Template**.
2. Em **To Email**, coloque `{{to_email}}`.
3. Em **Subject**, coloque algo como: `Captação {{acao}} — {{quartel}}` (`{{acao}}` vira
   "cadastrada", "editada" ou "excluída", dependendo do que a pessoa fez no site).
4. No corpo do e-mail (**Content**), cole este texto (todos os `{{...}}` são preenchidos
   automaticamente pelo site a cada cadastro, edição ou exclusão):
   ```
   Uma captação foi {{acao}} no painel.

   Quartel: {{quartel}} ({{municipio}})
   Parlamentar: {{parlamentar}}
   Responsável: {{responsavel}}
   Stakeholder: {{stakeholder}}
   Objeto: {{objeto}}
   Valor previsto: {{valor_previsto}}
   Estágio: {{status}}
   Descrição: {{observacoes}}
   ```
5. Clique em **Save**.
6. **Copie o "Template ID"** (aparece no topo da tela, algo como `template_xyz789`).

### 6.3. Pegar a chave pública e me mandar os 3 valores

1. Menu da esquerda → ícone da conta (canto superior direito) → **Account** → aba **General**.
2. Copie o campo **Public Key**.
3. Cole os 3 valores aqui no chat:
   ```
   Service ID: service_...
   Template ID: template_...
   Public Key: ...
   ```
4. Eu edito `src/lib/emailjs-config.js`, commito e publico.

### 6.4. (Recomendado) Restringir de onde os e-mails podem ser disparados

No EmailJS: **Account → Security → Allowed origins** → adicione a URL do site publicado
(`https://rafaelabnermmaciel-cmd.github.io`). Isso impede que outra pessoa use sua chave
pública fora do seu próprio site.

---

## 7. Login e aprovação de acesso (só a aba Acesso restrito)

Quartéis e militares são dado interno, então essa aba exige login **e** aprovação sua — o
resto do site (Cadastro, Stakeholders, Parlamentares) continua igual, sem login nenhum. Como
fica na prática:

- **Você** (o e-mail `rafaelabnermmaciel@gmail.com`, já fixado no script — me avise se quiser
  trocar) cria a própria conta e **já entra liberado na hora**, sem passo extra nenhum.
- **Qualquer outra pessoa** cria a própria conta (e-mail/senha) e fica **"Pendente"**,
  esperando você aprovar. Assim que alguém pede acesso, **você recebe um e-mail avisando**
  (configurado no passo 7.5) — daí é só entrar em **Acesso restrito → Acessos** e clicar em
  **Aprovar**. Pra tirar o acesso de alguém depois, mesmo lugar, botão **Revogar**.

### 7.1. Rodar o script atualizado

O `painel-captacao/supabase/schema.sql` deste repositório já tem as tabelas de login novas.
Repita o passo 3: **SQL Editor** → **New query** → cole o arquivo inteiro → **Run**. Como
sempre, é seguro rodar de novo (não duplica nada).

### 7.2. Configurar a URL do site (pra Supabase saber pra onde mandar de volta)

1. Menu da esquerda → **Authentication** → **URL Configuration**.
2. Em **Site URL**, cole:
   ```
   https://rafaelabnermmaciel-cmd.github.io/asparcbmgo/painel-captacao-app/
   ```
3. Em **Redirect URLs**, clique em **Add URL** e cole a mesma URL de novo.
4. Clique em **Save**.

### 7.3. Criar sua conta de administrador (libera sozinha, sem passo extra)

1. No site publicado, abra a aba **Acesso restrito**.
2. Clique em **Criar conta**, preencha e-mail e senha — use exatamente
   `rafaelabnermmaciel@gmail.com` (é o e-mail que o script reconhece como administrador; se
   quiser usar outro, me avisa que eu troco no script).
3. Se aparecer um aviso pedindo confirmação por e-mail, abra sua caixa de entrada e clique no
   link que o Supabase mandou antes de tentar entrar.
4. Pronto — como é o e-mail do administrador, já libera direto, sem esperar nada. A
   Acesso restrito abre normalmente, com uma aba a mais: **Acessos**.

### 7.4. As próximas pessoas (elas pedem, você aprova)

Cada pessoa nova entra em Acesso restrito → cria a própria conta (e-mail e senha) → cai como
**"Pendente"**, e você recebe um e-mail avisando (próximo passo). Você abre **Acesso restrito →
Acessos** e clica em **Aprovar** na linha da pessoa. Pra tirar o acesso de alguém depois, mesmo
lugar, botão **Revogar** (dá pra **Aprovar** de novo se precisar).

### 7.5. Configurar o aviso por e-mail de "alguém pediu acesso"

Usa o mesmo EmailJS da seção 6, só que com um **template novo** (variáveis diferentes das do
e-mail de captação).

1. Acesse **https://www.emailjs.com** e faça login na mesma conta da seção 6.
2. Menu da esquerda → **Email Templates** → **Create New Template**.
3. Em **To Email**, coloque `{{to_email}}`.
4. Em **Subject**, coloque: `Pedido de acesso ao Acesso restrito`.
5. No corpo do e-mail (**Content**), cole:
   ```
   O e-mail {{email_solicitante}} pediu acesso pra editar o Acesso restrito do
   Painel de Captação (CBM-GO).

   Pra aprovar ou recusar, entre em:
   https://rafaelabnermmaciel-cmd.github.io/asparcbmgo/painel-captacao-app/#/gerenciamento

   E vá em Acesso restrito → Acessos.
   ```
6. Clique em **Save**.
7. **Copie o "Template ID"** (aparece no topo da tela) e me manda aqui no chat:
   ```
   Template ID de acesso: template_...
   ```
8. Eu edito `src/lib/emailjs-config.js` (constante `EMAILJS_TEMPLATE_ID_ACESSO`), commito e
   publico.

---

## ⚠️ Um detalhe do plano gratuito

No plano gratuito, o Supabase **pausa o projeto automaticamente depois de ~1 semana sem
nenhum acesso**. Se um dia o site parar de carregar dados do nada, é provavelmente isso —
volte no painel do Supabase (supabase.com → seu projeto) que vai aparecer um botão **Restore
project**; clique nele e em ~1 minuto volta ao normal. Não perde nenhum dado, só "hiberna".

## Onde entram os stakeholders

Aba própria **Stakeholders** (menu lateral, entre Parlamentares e Cadastrar primeiro contato) →
botão **+ Novo stakeholder**. Preencha nome, cargo/função, telefone e qual projeto ele está
tratando, e marque na lista **todos os parlamentares** com quem essa pessoa articula (pode
marcar mais de um — ex: um prefeito conversando com 3 deputados ao mesmo tempo pelo mesmo
projeto). Depois de cadastrado:

- Ele aparece no **perfil de cada parlamentar marcado** (seção Stakeholders), com os botões
  "Editar"/"Excluir" ali também.
- Ele aparece pra **escolher no formulário de Cadastrar primeiro contato** — ao selecionar o
  parlamentar daquela captação, o campo "Stakeholder" (obrigatório) já sugere quem está
  vinculado a ele.

Tudo isso é editável direto no site, sem precisar entrar no Supabase.

## Linha do tempo de cada captação (andamentos e o alerta de "esfriando")

Toda captação nasce como **"Primeiro contato"** — não tem estágio pra escolher no formulário.
Já no formulário de **Cadastrar primeiro contato**, tem o campo **"Data do primeiro contato"**
(vem preenchido com a data de hoje, mas dá pra mudar se o primeiro contato foi antes) — ao
cadastrar, esse dia já entra como o primeiro passo da linha do tempo automaticamente.

Depois disso, dentro de qualquer captação (botão **"Linha do tempo"** na aba **Adicionar
andamento**, ou abrindo a captação no perfil do parlamentar) tem a seção pra registrar — data, descrição,
quem esteve presente e foto/documento — pra registrar os próximos passos (ex: "reunião
marcada", "foram ao Congresso Nacional"). Lançar o primeiro andamento já deixa a captação **"Em
articulação"** sozinha; ela só sai daí quando o militar responsável marca o desfecho — botões
**"Marcar como Indicado"** ou **"Marcar como Arquivado"**, logo abaixo do formulário de
andamento — não existe outro lugar pra mudar isso.

Se uma captação ainda em andamento (Primeiro contato/Em articulação — não chegou em
Indicado/Arquivado) fica **15 dias** sem nenhum andamento novo, aparece um aviso amarelo
"🟡 Esfriando"; com **30 dias** ou mais, vira um aviso vermelho "🔴 Parado há X dias" — pra
não deixar nenhuma articulação esfriar sem perceber.
