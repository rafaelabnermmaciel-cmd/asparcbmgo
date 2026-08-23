-- ============================================================================
-- Painel Parlamentar (Congresso Nacional / CBM-GO) — script de configuração do banco Supabase.
--
-- Como usar: Supabase → seu projeto → menu "SQL Editor" → "New query" → cole ESTE ARQUIVO
-- INTEIRO → botão "Run". Pode rodar de novo sem medo (todos os comandos são "se não existir"
-- / "sem duplicar"), então não tem problema clicar duas vezes.
--
-- Este é um projeto Supabase PRÓPRIO deste painel, independente do projeto usado pelo
-- painel-captacao — os dois nunca compartilham tabelas nem banco.
--
-- O que este script cria:
--   1. Tabela "destinacoes"       — página Captação (emendas/destinações por parlamentar)
--   2. Tabela "projetos"          — página Acompanhamento Legislativo (projetos cadastrados
--                                    manualmente + os importados automaticamente do relatório
--                                    nacional, ver campo origem_nacional)
--   3. Tabela "eventos"           — página Agenda, com fotos/documentos anexados
--   4. Tabela "parlamentar_notas" — anotações internas por parlamentar (recurso já existente
--                                    no código, ainda sem tela própria de uso)
--   5. Regras de segurança (RLS) de cada tabela
--   6. Um espaço de arquivos ("bucket") chamado "anexos" pras fotos/documentos da Agenda
--   7. Tempo real nas 4 tabelas — quem estiver com o site aberto vê uma edição feita por
--      outra pessoa aparecer sozinha, sem precisar recarregar a página
-- ============================================================================

-- 1) DESTINAÇÕES (Captação) --------------------------------------------------
create table if not exists destinacoes (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  parlamentar_nome text not null default '',
  ano integer not null default extract(year from now()),
  municipio text not null default '',
  objeto text not null default '',
  valor_previsto numeric not null default 0,
  valor_confirmado numeric not null default 0,
  status text not null default 'Em articulação',
  sei text not null default '',
  responsavel text not null default '',
  proximo_passo text not null default '',
  riscos text not null default '',
  observacoes text not null default ''
);

-- 2) PROJETOS (Acompanhamento Legislativo) -----------------------------------
-- "origem_nacional" = true pros itens importados automaticamente do relatório nacional
-- (acompanhamento-legislativo.json, atualizado por GitHub Actions) — casa_atual, link e
-- ultima_movimentacao só fazem sentido pra esses. O par (tipo, numero) é único: evita
-- rastrear o mesmo projeto duas vezes, seja por reimportação ou cadastro manual duplicado.
create table if not exists projetos (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  autor text not null default '',
  relator text not null default '',
  tipo text not null default 'PL',
  numero text not null default '',
  ementa text not null default '',
  status text not null default 'Protocolado',
  posicao text not null default 'em análise',
  prioridade text not null default 'média',
  responsavel text not null default '',
  proximo_passo text not null default '',
  observacoes text not null default '',
  casa_atual text,
  link text,
  ultima_movimentacao jsonb,
  origem_nacional boolean not null default false,
  unique (tipo, numero)
);

-- 3) EVENTOS (Agenda) ---------------------------------------------------------
create table if not exists eventos (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  titulo text not null default '',
  data date,
  hora text not null default '',
  tipo text not null default 'div',
  parlamentar_nome text not null default '',
  destinacao_id bigint references destinacoes(id) on delete set null,
  projeto_id bigint references projetos(id) on delete set null,
  local text not null default '',
  tipo_reuniao text not null default 'Reunião institucional',
  status text not null default 'Prevista',
  pauta text not null default '',
  resultado text not null default '',
  responsavel text not null default '',
  observacoes text not null default '',
  anexos jsonb not null default '[]'::jsonb  -- [{ id, tipo, nome, url }, ...] — url aponta pro bucket "anexos"
);

-- 4) NOTAS POR PARLAMENTAR ----------------------------------------------------
create table if not exists parlamentar_notas (
  parlamentar_key text primary key,  -- "camara:<id>" ou "senado:<id>", igual ao usado em eventos/destinações
  conteudo jsonb not null default '{}'::jsonb
);

-- 5) REGRAS DE SEGURANÇA (RLS) -------------------------------------------------
-- Igual ao modelo do painel-captacao: sem login no site, então leitura e escrita ficam
-- abertas pra qualquer pessoa com o link — aceitável pra um painel interno pequeno.
alter table destinacoes enable row level security;
alter table projetos enable row level security;
alter table eventos enable row level security;
alter table parlamentar_notas enable row level security;

drop policy if exists "Leitura pública" on destinacoes;
create policy "Leitura pública" on destinacoes for select using (true);
drop policy if exists "Inserção pública" on destinacoes;
create policy "Inserção pública" on destinacoes for insert with check (true);
drop policy if exists "Atualização pública" on destinacoes;
create policy "Atualização pública" on destinacoes for update using (true) with check (true);
drop policy if exists "Remoção pública" on destinacoes;
create policy "Remoção pública" on destinacoes for delete using (true);

drop policy if exists "Leitura pública" on projetos;
create policy "Leitura pública" on projetos for select using (true);
drop policy if exists "Inserção pública" on projetos;
create policy "Inserção pública" on projetos for insert with check (true);
drop policy if exists "Atualização pública" on projetos;
create policy "Atualização pública" on projetos for update using (true) with check (true);
drop policy if exists "Remoção pública" on projetos;
create policy "Remoção pública" on projetos for delete using (true);

drop policy if exists "Leitura pública" on eventos;
create policy "Leitura pública" on eventos for select using (true);
drop policy if exists "Inserção pública" on eventos;
create policy "Inserção pública" on eventos for insert with check (true);
drop policy if exists "Atualização pública" on eventos;
create policy "Atualização pública" on eventos for update using (true) with check (true);
drop policy if exists "Remoção pública" on eventos;
create policy "Remoção pública" on eventos for delete using (true);

drop policy if exists "Leitura pública" on parlamentar_notas;
create policy "Leitura pública" on parlamentar_notas for select using (true);
drop policy if exists "Inserção pública" on parlamentar_notas;
create policy "Inserção pública" on parlamentar_notas for insert with check (true);
drop policy if exists "Atualização pública" on parlamentar_notas;
create policy "Atualização pública" on parlamentar_notas for update using (true) with check (true);

-- 6) ARMAZENAMENTO DE ANEXOS (fotos/documentos da Agenda) ---------------------
insert into storage.buckets (id, name, public)
values ('anexos', 'anexos', true)
on conflict (id) do nothing;

drop policy if exists "Leitura pública dos anexos" on storage.objects;
create policy "Leitura pública dos anexos" on storage.objects for select
  using (bucket_id = 'anexos');

drop policy if exists "Upload público de anexos" on storage.objects;
create policy "Upload público de anexos" on storage.objects for insert
  with check (bucket_id = 'anexos');

drop policy if exists "Remoção pública de anexos" on storage.objects;
create policy "Remoção pública de anexos" on storage.objects for delete
  using (bucket_id = 'anexos');

-- 7) TEMPO REAL ----------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table destinacoes;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table projetos;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table eventos;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table parlamentar_notas;
exception when duplicate_object then null;
end $$;
