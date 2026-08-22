-- ============================================================================
-- Painel de Captação (CBM-GO) — script de configuração do banco Supabase.
--
-- Como usar: Supabase → seu projeto → menu "SQL Editor" → "New query" → cole ESTE ARQUIVO
-- INTEIRO → botão "Run". Pode rodar de novo sem medo (todos os comandos são "se não existir"
-- / "sem duplicar"), então não tem problema clicar duas vezes.
--
-- O que este script cria:
--   1. Tabela "quarteis"       — a lista de unidades do CBMGO (edite direto pelo Table Editor)
--   2. Tabela "interlocutores" — contato de captação de cada parlamentar
--   3. Tabela "captacoes"      — os cadastros feitos pelo formulário do site
--   4. Regras de segurança (RLS) de cada tabela
--   5. Um espaço de arquivos ("bucket") chamado "anexos" pras fotos/documentos do cadastro
--   6. Uma lista provisória de quartéis, só pra o site não começar vazio
-- ============================================================================

-- 1) QUARTÉIS ----------------------------------------------------------------
create table if not exists quarteis (
  id text primary key,           -- um código curto, sem espaço/acento (ex: "8-bbm")
  nome text not null,            -- nome que aparece no site (ex: "8º BBM")
  municipio text not null default '',
  tipo text not null default ''  -- livre — "BBM", "CIBM", "Comando" etc.
);

-- 2) INTERLOCUTORES -----------------------------------------------------------
-- "parlamentar_key" é "camara:<id>" ou "senado:<id>" — o <id> é o número que aparece na URL
-- do perfil daquele parlamentar no site (ex.: .../parlamentares/camara/220565 → chave
-- "camara:220565"). Vá até o perfil do parlamentar no site pra pegar a chave certa.
create table if not exists interlocutores (
  parlamentar_key text primary key,
  nome text not null default '',
  cargo text not null default '',
  telefone text not null default '',
  email text not null default '',
  observacoes text not null default ''
);

-- 3) CAPTAÇÕES ----------------------------------------------------------------
create table if not exists captacoes (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  quartel_id text not null references quarteis(id),
  quartel_nome text not null default '',
  municipio text not null default '',
  responsavel text not null default '',
  stakeholder text not null default '',
  parlamentar_nome text not null default '',
  objeto text not null default '',
  valor_previsto numeric not null default 0,
  valor_confirmado numeric not null default 0,
  num_reunioes integer not null default 0,
  status text not null default 'Primeiro contato',
  data_agenda date,
  observacoes text not null default '',
  anexos jsonb not null default '[]'::jsonb  -- [{ nome, tipo, tamanho, url }, ...]
);

-- 4) REGRAS DE SEGURANÇA (RLS) -------------------------------------------------
-- Com RLS ligado, ninguém consegue ler/escrever nada a menos que exista uma política
-- explícita liberando. Aqui: todo mundo pode LER as 3 tabelas (o site é público); só a
-- tabela de captações aceita CRIAR linha vindo do site (o formulário de Cadastro) — quarteis
-- e interlocutores vocês editam direto aqui no Table Editor (login no Supabase sempre
-- ignora RLS), não precisam de política pública de escrita.
alter table quarteis enable row level security;
alter table interlocutores enable row level security;
alter table captacoes enable row level security;

drop policy if exists "Leitura pública" on quarteis;
create policy "Leitura pública" on quarteis for select using (true);

drop policy if exists "Leitura pública" on interlocutores;
create policy "Leitura pública" on interlocutores for select using (true);

drop policy if exists "Leitura pública" on captacoes;
create policy "Leitura pública" on captacoes for select using (true);

drop policy if exists "Cadastro público" on captacoes;
create policy "Cadastro público" on captacoes for insert with check (true);

-- 5) ARMAZENAMENTO DE ANEXOS (fotos/documentos do formulário) -----------------
insert into storage.buckets (id, name, public)
values ('anexos', 'anexos', true)
on conflict (id) do nothing;

drop policy if exists "Leitura pública dos anexos" on storage.objects;
create policy "Leitura pública dos anexos" on storage.objects for select
  using (bucket_id = 'anexos');

drop policy if exists "Upload público de anexos" on storage.objects;
create policy "Upload público de anexos" on storage.objects for insert
  with check (bucket_id = 'anexos');

-- 6) TEMPO REAL ----------------------------------------------------------------
-- Faz quem estiver com o Dashboard/Cadastro aberto no navegador ver um cadastro novo (feito
-- por outra pessoa) aparecer sozinho, sem precisar recarregar a página.
do $$
begin
  alter publication supabase_realtime add table captacoes;
exception when duplicate_object then
  null; -- já estava habilitado — tudo bem, só ignora
end $$;

-- 7) LISTA PROVISÓRIA DE QUARTÉIS ---------------------------------------------
-- Rascunho extraído de registros antigos do painel-nacional — ajuste/complete direto na
-- tabela "quarteis" pelo Table Editor (adicionar, renomear e apagar linha, sem precisar
-- rodar SQL de novo).
insert into quarteis (id, nome, municipio, tipo) values
  ('comando-geral', 'Comando Geral do CBMGO', 'Goiânia', 'Comando'),
  ('7-bbm', '7º BBM', 'Aparecida de Goiânia', 'BBM'),
  ('8-bbm', '8º BBM', 'Goiânia', 'BBM'),
  ('9-bbm', '9º BBM', 'Caldas Novas', 'BBM'),
  ('14-bbm', '14º BBM', 'Senador Canedo', 'BBM'),
  ('16-bbm', '16º BBM', 'Mineiros', 'BBM'),
  ('17-bbm', '17º BBM', 'Pirenópolis', 'BBM'),
  ('21-bm', '21º BM', 'a confirmar', 'BM'),
  ('5-cibm', '5ª CIBM', 'Palmeiras de Goiás', 'CIBM'),
  ('8-cibm', '8ª CIBM', 'Cristalina', 'CIBM')
on conflict (id) do nothing;
