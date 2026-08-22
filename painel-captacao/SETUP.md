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

- Menu da esquerda → **Table Editor**: devem aparecer 3 tabelas — `quarteis` (já com 10 linhas
  de exemplo), `interlocutores` (vazia) e `captacoes` (vazia).
- Menu da esquerda → **Storage**: deve aparecer um bucket chamado `anexos`.

## 4. Editar a lista de quartéis (direto na tela, sem código)

O script já cadastra as 60 unidades da Convocação nº 106/2026, cada uma com o(s) militar(es)
designado(s) pra relações institucionais (coluna `responsavel_padrao` — é só a sugestão que
aparece pré-preenchida no campo "Responsável" do Cadastro; quem preenche pode trocar).

1. Menu da esquerda → **Table Editor** → clique na tabela **quarteis**.
2. É uma planilha: clique em cima de qualquer célula pra editar o texto direto.
3. Pra adicionar um quartel novo: botão **Insert** → **Insert row** → preencha:
   - `id`: um código curto sem espaço/acento (ex: `10-bbm`)
   - `nome`: como deve aparecer no site (ex: `10º BBM`)
   - `municipio`: cidade onde fica
   - `tipo`: livre (ex: `BBM`, `CIBM`, `Comando`)
   - `responsavel_padrao`: nome(s) sugerido(s) pro campo Responsável (opcional)
4. Pra apagar um quartel errado: clique na linha (seleciona) → ícone de lixeira.

Você pode voltar aqui a qualquer momento pra ajustar — o site sempre mostra a lista atual
desta tabela, sem precisar de nenhum passo extra.

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

---

## ⚠️ Um detalhe do plano gratuito

No plano gratuito, o Supabase **pausa o projeto automaticamente depois de ~1 semana sem
nenhum acesso**. Se um dia o site parar de carregar dados do nada, é provavelmente isso —
volte no painel do Supabase (supabase.com → seu projeto) que vai aparecer um botão **Restore
project**; clique nele e em ~1 minuto volta ao normal. Não perde nenhum dado, só "hiberna".

## Onde entram os interlocutores de cada parlamentar

A tabela `interlocutores` (Table Editor → `interlocutores` → Insert row) usa a coluna
`parlamentar_key` no formato `camara:<id>` ou `senado:<id>` — o `<id>` é o número que aparece
na URL do perfil daquele parlamentar dentro do site (ex.:
`.../#/parlamentares/camara/220565` → chave `camara:220565`). Preencha `nome`, `cargo`,
`telefone`, `email` e `observacoes` com os dados do assessor/gabinete responsável por tratar
de captação com aquele parlamentar.
