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

- Menu da esquerda → **Table Editor**: devem aparecer 5 tabelas — `quarteis` (61 linhas: as 60
  unidades do CBMGO + SENASP/MJ), `militares` (122 linhas — um militar por linha), `stakeholders`
  (vazia), `captacoes` (vazia) e `captacao_eventos` (vazia — a linha do tempo de cada captação).
- Menu da esquerda → **Storage**: deve aparecer um bucket chamado `anexos`.

## 4. Editar quartéis e militares (direto na tela, sem código)

O script já cadastra as 61 unidades e os 122 militares da Convocação nº 106/2026 (posto, RG,
nome de guerra e a unidade de cada um — exatamente como no documento). No Cadastro, ao
escolher o quartel, o campo "Responsável" vira uma lista com os militares daquela unidade
(inclui a opção "Outro" pra digitar um nome que não esteja na lista).

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
   Valor confirmado: {{valor_confirmado}}
   Nº de reuniões: {{num_reunioes}}
   Estágio: {{status}}
   Observações: {{observacoes}}
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

## 7. Login e aprovação de acesso (só a aba Gerenciamento)

Quartéis e militares são dado interno, então só quem tiver login **e** já tiver sido aprovado
consegue editar essa aba — o resto do site (Cadastro, Stakeholders, Parlamentares) continua
igual, sem login nenhum. Cada pessoa cria a própria conta (e-mail/senha, ou entrando com
Google); depois disso, alguém que já tem acesso precisa aprovar ela — isso é feito direto no
site, sem precisar voltar aqui no Supabase.

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

### 7.3. Ativar login com Google (opcional, mas você pediu)

1. Abra **https://console.cloud.google.com** numa aba nova (pode usar a mesma conta Google que
   administra o painel).
2. No topo, clique no seletor de projeto → **New Project** → dê um nome (ex:
   `painel-captacao-cbmgo`) → **Create**. Espere alguns segundos e selecione o projeto criado.
3. Menu da esquerda (ícone ☰) → **APIs & Services** → **OAuth consent screen**.
4. Escolha **External** → **Create**.
5. Preencha **App name** (ex: `Painel de Captação CBM-GO`), **User support email** (seu
   e-mail) e, mais embaixo, **Developer contact information** (seu e-mail de novo) → **Save
   and Continue**.
6. Na tela de **Scopes**, não precisa mexer em nada → **Save and Continue**.
7. Na tela de **Test users**, clique em **Add Users** e adicione o e-mail de cada pessoa que
   vai usar login do Google (enquanto o app não for "publicado", só esses e-mails conseguem
   entrar com Google) → **Save and Continue** → **Back to Dashboard**.
   - Se quiser liberar pra qualquer pessoa com conta Google (sem precisar cadastrar cada
     e-mail aqui), volta nessa tela depois e clica em **Publish App** — pra este tipo de
     permissão (só e-mail/perfil básico) o Google normalmente libera na hora, sem revisão.
8. Menu da esquerda → **Credentials** → **Create Credentials** → **OAuth client ID**.
9. **Application type**: **Web application**. Dê um nome (ex: `painel-captacao-web`).
10. Em **Authorized redirect URIs**, clique em **Add URI** e cole exatamente:
    ```
    https://nppaeyxaxcraitpmwyqo.supabase.co/auth/v1/callback
    ```
    (repare que essa URL é do **Supabase**, não do site — é ele quem recebe a resposta do
    Google primeiro).
11. Clique em **Create**. Vai aparecer uma caixa com **Client ID** e **Client Secret** — copie
    os dois (dá pra abrir de novo depois clicando no nome da credencial em Credentials).
12. Volte no Supabase → **Authentication** → **Providers** → clique em **Google** na lista.
13. Ative o botão **Enable Sign in with Google**, cole o **Client ID** e o **Client Secret** que
    você copiou, e clique em **Save**.

### 7.4. Virar o primeiro aprovado

1. No site publicado, abra a aba **Gerenciamento**.
2. Clique em **Criar conta**, preencha e-mail e senha (ou clique em **Continuar com Google**) —
   use o e-mail que vai administrar o painel (ex: `asparcbmgo@gmail.com`).
3. Se aparecer um aviso pedindo confirmação por e-mail, abra sua caixa de entrada e clique no
   link que o Supabase mandou antes de tentar entrar.
4. Depois de entrar, o site vai mostrar "Aguardando aprovação" — isso é esperado, ninguém
   aprovou você ainda (nem você mesmo consegue, por segurança).
5. Volte no Supabase → **SQL Editor** → **New query**, cole isto (trocando o e-mail se usou
   outro) e clique em **Run**:
   ```sql
   update usuarios_aprovados set aprovado = true where email = 'asparcbmgo@gmail.com';
   ```
6. Volte no site, atualize a página e entre de novo — agora a Gerenciamento libera
   normalmente, com uma aba a mais: **Acessos**.

### 7.5. Aprovando as próximas pessoas (sem precisar voltar aqui)

Cada pessoa nova entra em Gerenciamento → cria a própria conta (ou entra com Google, se você
adicionou o e-mail dela como "Test user" no passo 7.3, ou se já publicou o app) → cai como
"Pendente". Você (ou qualquer outra pessoa já aprovada) abre **Gerenciamento → Acessos** e
clica em **Aprovar**. Pra tirar o acesso de alguém depois, é o mesmo lugar, botão **Revogar**.

---

## ⚠️ Um detalhe do plano gratuito

No plano gratuito, o Supabase **pausa o projeto automaticamente depois de ~1 semana sem
nenhum acesso**. Se um dia o site parar de carregar dados do nada, é provavelmente isso —
volte no painel do Supabase (supabase.com → seu projeto) que vai aparecer um botão **Restore
project**; clique nele e em ~1 minuto volta ao normal. Não perde nenhum dado, só "hiberna".

## Onde entram os stakeholders

Aba própria **Stakeholders** (menu lateral, entre Parlamentares e Cadastrar captação) → botão
**+ Novo stakeholder**. Preencha nome, cargo/função, telefone e qual projeto ele está tratando,
e marque na lista **todos os parlamentares** com quem essa pessoa articula (pode marcar mais de
um — ex: um prefeito conversando com 3 deputados ao mesmo tempo pelo mesmo projeto). Depois de
cadastrado:

- Ele aparece no **perfil de cada parlamentar marcado** (seção Stakeholders), com os botões
  "Editar"/"Excluir" ali também.
- Ele aparece pra **escolher no formulário de Cadastro de captação** — ao selecionar o
  parlamentar daquela captação, o campo "Stakeholder" já sugere quem está vinculado a ele.

Tudo isso é editável direto no site, sem precisar entrar no Supabase.

## Linha do tempo de cada captação (e o alerta de "esfriando")

Já no formulário de **Cadastrar captação**, tem o campo **"Data do primeiro contato"**
(vem preenchido com a data de hoje, mas dá pra mudar se o primeiro contato foi antes) — ao
cadastrar, esse dia já entra como o primeiro passo da linha do tempo automaticamente.

Depois disso, dentro de qualquer captação (botão **"Linha do tempo"** no Cadastro, ou abrindo a
captação no perfil do parlamentar) dá pra registrar os próximos passos — data + o que
aconteceu (ex: "reunião marcada", "foram ao Congresso Nacional") — e ver todo o histórico em
ordem. Se uma captação que ainda está em andamento (não chegou em Destinado/Adiado/
Recusado/Arquivado) fica **15 dias** sem nenhum passo novo, aparece um aviso amarelo
"🟡 Esfriando"; com **30 dias** ou mais, vira um aviso vermelho "🔴 Parado há X dias" — pra
não deixar nenhuma articulação esfriar sem perceber.
