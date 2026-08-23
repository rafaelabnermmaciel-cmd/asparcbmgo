-- ============================================================================
-- Painel de Captação (CBM-GO) — script de configuração do banco Supabase.
--
-- Como usar: Supabase → seu projeto → menu "SQL Editor" → "New query" → cole ESTE ARQUIVO
-- INTEIRO → botão "Run". Pode rodar de novo sem medo (todos os comandos são "se não existir"
-- / "sem duplicar"), então não tem problema clicar duas vezes.
--
-- O que este script cria:
--   1. Tabela "quarteis"       — as unidades (OBMs) do CBMGO (editável no site, aba
--                                 Gerenciamento, ou pelo Table Editor do Supabase)
--   2. Tabela "militares"      — um militar por linha, exatamente como na Convocação
--                                 106/2026: posto, RG, nome de guerra e OBM (também editável
--                                 no site, aba Gerenciamento)
--   3. Tabela "stakeholders"   — pessoas que tratam de captação com um ou mais parlamentares
--                                 ao mesmo tempo (cadastrado na aba Cadastro do site)
--   4. Tabela "captacoes"      — os cadastros feitos pelo formulário do site
--   5. Regras de segurança (RLS) de cada tabela
--   6. Um espaço de arquivos ("bucket") chamado "anexos" pras fotos/documentos do cadastro
--   7. Tempo real pra tabela de captações
--   8. As 61 unidades (60 do CBMGO + SENASP/MJ) e os 122 militares da Convocação 106/2026
-- ============================================================================

-- 1) QUARTÉIS ----------------------------------------------------------------
create table if not exists quarteis (
  id text primary key,           -- código curto, sem espaço/acento (ex: "8-bbm")
  nome text not null,            -- nome que aparece no site (ex: "8º BBM")
  municipio text not null default '',
  tipo text not null default ''  -- livre — "BBM", "CIBM", "CRBM" etc.
);

-- Limpeza: a versão anterior deste script guardava um resumo de responsáveis direto na
-- tabela de quartéis; agora isso vira a tabela "militares" (linha por pessoa, ver abaixo).
alter table quarteis drop column if exists responsavel_padrao;

-- 2) MILITARES ------------------------------------------------------------------
-- Um militar por linha, exatamente como na Convocação nº 106/2026: posto/graduação, RG, o
-- "nome de guerra" (a parte em CAIXA ALTA no documento original) e o quartel (OBM).
create table if not exists militares (
  id bigint generated always as identity primary key,
  posto text not null default '',
  rg text not null default '',
  nome text not null default '',
  quartel_id text not null references quarteis(id) on delete cascade
);

-- Garante "on delete cascade" mesmo se a tabela já existia de uma execução anterior sem
-- isso — apagar um quartel pela aba Gerenciamento remove junto os militares dele, em vez de
-- travar com erro de referência.
alter table militares drop constraint if exists militares_quartel_id_fkey;
alter table militares add constraint militares_quartel_id_fkey foreign key (quartel_id) references quarteis(id) on delete cascade;

-- 3) STAKEHOLDERS ---------------------------------------------------------------
-- Pessoa (ex: um prefeito, um assessor) que trata de algum projeto/captação junto a um ou
-- MAIS DE UM parlamentar ao mesmo tempo — por isso "parlamentares_keys" é uma lista, não um
-- valor só. Cada item da lista é "camara:<id>" ou "senado:<id>" (o <id> é o número que aparece
-- na URL do perfil daquele parlamentar no site, ex.: .../parlamentares/camara/220565 →
-- "camara:220565"). Cadastrado pela aba "Cadastrar captação" do site (seção Stakeholders);
-- aparece pra escolher ali mesmo (formulário de captação) e no perfil de cada parlamentar
-- vinculado — totalmente editável no site, não precisa mexer no Supabase.
create table if not exists stakeholders (
  id bigint generated always as identity primary key,
  nome text not null default '',
  cargo text not null default '',
  telefone text not null default '',
  projeto text not null default '',
  observacoes text not null default '',
  parlamentares_keys text[] not null default '{}'
);

-- Migração de versões anteriores deste script ------------------------------------
-- a) versão original: tabela "interlocutores" (1 contato por parlamentar, nunca virou
-- "stakeholders") — só roda se ela ainda existir.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'interlocutores') then
    insert into stakeholders (nome, cargo, telefone, observacoes, parlamentares_keys)
    select nome, cargo, telefone, observacoes,
           case when parlamentar_key is not null and parlamentar_key <> '' then array[parlamentar_key] else '{}'::text[] end
    from interlocutores;
    drop table interlocutores;
  end if;
end $$;

-- b) versão intermediária: "stakeholders" já existia, mas com 1 parlamentar só por linha
-- (coluna "parlamentar_key" em vez da lista "parlamentares_keys") — só roda se essa coluna
-- antiga ainda existir.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'stakeholders' and column_name = 'parlamentar_key') then
    alter table stakeholders add column if not exists parlamentares_keys text[] not null default '{}';
    update stakeholders set parlamentares_keys = array[parlamentar_key]
      where parlamentar_key is not null and parlamentar_key <> '' and (parlamentares_keys is null or parlamentares_keys = '{}');
    alter table stakeholders drop column parlamentar_key;
  end if;
end $$;

alter table stakeholders add column if not exists projeto text not null default '';
alter table stakeholders drop column if exists email;

-- 4) CAPTAÇÕES ----------------------------------------------------------------
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

-- 5) REGRAS DE SEGURANÇA (RLS) -------------------------------------------------
-- Com RLS ligado, ninguém consegue ler/escrever nada a menos que exista uma política
-- explícita liberando. Aqui: todo mundo pode LER as 4 tabelas (o site é público), e todas as
-- 4 também aceitam criar/editar/apagar linha vindo do próprio site (aba Gerenciamento pra
-- quartéis/militares, Cadastro/edição inline pra captações, e o perfil do parlamentar pra
-- stakeholders) — nenhuma delas precisa do Table Editor do Supabase pra ser mantida no dia a
-- dia.
--
-- Aviso: como o site não tem login, esse acesso de escrita fica aberto pra qualquer pessoa
-- que tenha o link do site — não só quem administra. Pra um painel interno pequeno isso
-- costuma ser um risco aceitável (é o mesmo modelo do formulário de Cadastro), mas não é o
-- ideal pra um sistema com muita gente de fora tendo acesso.
alter table quarteis enable row level security;
alter table militares enable row level security;
alter table stakeholders enable row level security;
alter table captacoes enable row level security;

drop policy if exists "Leitura pública" on quarteis;
create policy "Leitura pública" on quarteis for select using (true);
drop policy if exists "Inserção pública" on quarteis;
create policy "Inserção pública" on quarteis for insert with check (true);
drop policy if exists "Atualização pública" on quarteis;
create policy "Atualização pública" on quarteis for update using (true) with check (true);
drop policy if exists "Remoção pública" on quarteis;
create policy "Remoção pública" on quarteis for delete using (true);

drop policy if exists "Leitura pública" on militares;
create policy "Leitura pública" on militares for select using (true);
drop policy if exists "Inserção pública" on militares;
create policy "Inserção pública" on militares for insert with check (true);
drop policy if exists "Atualização pública" on militares;
create policy "Atualização pública" on militares for update using (true) with check (true);
drop policy if exists "Remoção pública" on militares;
create policy "Remoção pública" on militares for delete using (true);

drop policy if exists "Leitura pública" on stakeholders;
create policy "Leitura pública" on stakeholders for select using (true);
drop policy if exists "Inserção pública" on stakeholders;
create policy "Inserção pública" on stakeholders for insert with check (true);
drop policy if exists "Atualização pública" on stakeholders;
create policy "Atualização pública" on stakeholders for update using (true) with check (true);
drop policy if exists "Remoção pública" on stakeholders;
create policy "Remoção pública" on stakeholders for delete using (true);

drop policy if exists "Leitura pública" on captacoes;
create policy "Leitura pública" on captacoes for select using (true);

drop policy if exists "Cadastro público" on captacoes;
create policy "Cadastro público" on captacoes for insert with check (true);
drop policy if exists "Edição pública" on captacoes;
create policy "Edição pública" on captacoes for update using (true) with check (true);
drop policy if exists "Remoção pública" on captacoes;
create policy "Remoção pública" on captacoes for delete using (true);

-- 6) ARMAZENAMENTO DE ANEXOS (fotos/documentos do formulário) -----------------
insert into storage.buckets (id, name, public)
values ('anexos', 'anexos', true)
on conflict (id) do nothing;

drop policy if exists "Leitura pública dos anexos" on storage.objects;
create policy "Leitura pública dos anexos" on storage.objects for select
  using (bucket_id = 'anexos');

drop policy if exists "Upload público de anexos" on storage.objects;
create policy "Upload público de anexos" on storage.objects for insert
  with check (bucket_id = 'anexos');

-- 7) TEMPO REAL ----------------------------------------------------------------
-- Faz quem estiver com o Dashboard/Cadastro aberto no navegador ver um cadastro novo (feito
-- por outra pessoa) aparecer sozinho, sem precisar recarregar a página.
do $$
begin
  alter publication supabase_realtime add table captacoes;
exception when duplicate_object then
  null; -- já estava habilitado — tudo bem, só ignora
end $$;

-- 8) UNIDADES E MILITARES DA CONVOCAÇÃO 106/2026 -------------------------------
-- As 61 unidades (60 do CBMGO + o posto de ligação SENASP/MJ) e os 122 militares
-- convocados, exatamente como no documento (Capacitação em Relações Institucionais e
-- Governamentais do CBMGO, 19/08/2026) — sem agrupar por edição/data, sem resumir.
-- Ajuste/adicione/apague direto pelo Table Editor a qualquer momento.
insert into quarteis (id, nome, municipio, tipo) values
  ('cat', 'CAT', 'Goiânia', 'CAT'),
  ('codec', 'CODEC', 'Goiânia', 'CODEC'),
  ('ceman', 'CEMAN', 'Goiânia', 'CEMAN'),
  ('cme', 'CME', 'Goiânia', 'CME'),
  ('bse', 'BSE', 'Goiânia', 'BSE'),
  ('21-bbm-beopp', '21º BBM / BEOPP', 'Goiânia', 'BBM'),
  ('bopar', 'BOPAR', 'Goiânia', 'BOPAR'),
  ('1-crbm', '1º CRBM', 'Goiânia', 'CRBM'),
  ('qcg', 'QCG', 'Goiânia', 'QCG'),
  ('3-bbm', '3º BBM', 'Anápolis', 'BBM'),
  ('3-cibm-silvania', '3ª CIBM', 'Silvânia', 'CIBM'),
  ('22-bbm', '22º BBM', 'Jaraguá', 'BBM'),
  ('17-bbm', '17º BBM', 'Pirenópolis', 'BBM'),
  ('18-cibm', '18ª CIBM', 'Ceres', 'CIBM'),
  ('5-crbm', '5º CRBM', 'Aparecida de Goiânia', 'CRBM'),
  ('7-bbm', '7º BBM', 'Aparecida de Goiânia', 'BBM'),
  ('14-bbm', '14º BBM', 'Senador Canedo', 'BBM'),
  ('25-cibm', '25ª CIBM', 'Bela Vista de Goiás', 'CIBM'),
  ('6-bbm', '6º BBM', 'Itumbiara', 'BBM'),
  ('9-bbm', '9º BBM', 'Caldas Novas', 'BBM'),
  ('10-bbm', '10º BBM', 'Catalão', 'BBM'),
  ('12-cibm', '12ª CIBM', 'Morrinhos', 'CIBM'),
  ('14-cibm', '14ª CIBM', 'Pires do Rio', 'CIBM'),
  ('16-cibm', '16ª CIBM', 'Goiatuba', 'CIBM'),
  ('23-cibm', '23ª CIBM', 'Ipameri', 'CIBM'),
  ('15-bbm', '15º BBM', 'Trindade', 'BBM'),
  ('5-cibm', '5ª CIBM', 'Palmeiras de Goiás', 'CIBM'),
  ('7-cibm', '7ª CIBM', 'Inhumas', 'CIBM'),
  ('20-cibm', '20ª CIBM', 'Goianira', 'CIBM'),
  ('21-cibm', '21ª CIBM', 'Nerópolis', 'CIBM'),
  ('bm-8', 'BM/8', 'Goiânia', 'BM'),
  ('ciaf', 'CIAF', 'Goiânia', 'CIAF'),
  ('8-bbm', '8º BBM', 'Goiânia — Parque Amazônia', 'BBM'),
  ('2-bbm', '2º BBM', 'Goiânia — Setor Aeroviário', 'BBM'),
  ('banda-musica', 'Banda de Música', 'Goiânia', 'Banda'),
  ('4-crbm', '4º CRBM', 'Luziânia', 'CRBM'),
  ('5-bbm', '5º BBM', 'Luziânia', 'BBM'),
  ('cibm-cidade-ocidental', 'CIBM de Cidade Ocidental (futura)', 'Cidade Ocidental', 'CIBM'),
  ('19-bbm', '19º BBM', 'Formosa', 'BBM'),
  ('20-bbm', '20ª BBM', 'Águas Lindas de Goiás', 'BBM'),
  ('23-bbm', '23º BBM', 'Planaltina', 'BBM'),
  ('24-bbm', '24º BBM', 'Valparaíso de Goiás', 'BBM'),
  ('8-cibm', '8ª CIBM', 'Cristalina', 'CIBM'),
  ('9-cibm', '9ª CIBM', 'Santo Antônio do Descoberto', 'CIBM'),
  ('10-cibm', '10ª CIBM', 'Posse', 'CIBM'),
  ('senasp-mj', 'SENASP/MJ', 'a confirmar', 'Externo'),
  ('12-bbm', '12º BBM', 'Goiás', 'BBM'),
  ('13-cibm', '13ª CIBM', 'Iporá', 'CIBM'),
  ('17-cibm', '17ª CIBM', 'Itaberaí', 'CIBM'),
  ('19-cibm', '19ª CIBM', 'São Luís de Montes Belos', 'CIBM'),
  ('1-pbm', '1º PBM', 'Aruanã', 'PBM'),
  ('18-bbm', '18º BBM', 'Goianésia', 'BBM'),
  ('1-cibm', '1ª CIBM', 'Minaçu', 'CIBM'),
  ('11-cibm', '11ª CIBM', 'Uruaçu', 'CIBM'),
  ('22-cibm', '22ª CIBM', 'São Miguel do Araguaia', 'CIBM'),
  ('11-bbm', '11º BBM', 'Porangatu', 'BBM'),
  ('6-cibm', '6ª CIBM', 'Niquelândia', 'CIBM'),
  ('4-bbm', '4º BBM', 'Rio Verde', 'BBM'),
  ('3-cibm-santa-helena', '3ª CIBM', 'Santa Helena de Goiás', 'CIBM'),
  ('13-bbm', '13º BBM', 'Jataí', 'BBM'),
  ('16-bbm', '16º BBM', 'Mineiros', 'BBM')
on conflict (id) do update set
  nome = excluded.nome,
  municipio = excluded.municipio,
  tipo = excluded.tipo;

-- Evita duplicar os 122 militares se o script for rodado mais de uma vez.
delete from militares;

insert into militares (posto, rg, nome, quartel_id) values
  ('TC QOC', '02.294', 'BRUNO', 'cat'),
  ('TC QOC', '02.949', 'ANA PAULA', 'cat'),
  ('TC QOC', '01.410', 'JESUS', 'codec'),
  ('MAJ QOC', '02.482', 'MOURA', 'codec'),
  ('TC QOC', '01.846', 'CIRO', 'ceman'),
  ('1º SGT', '02.078', 'GUSMÃO', 'ceman'),
  ('1º TEN QOE/Complementar', '01.998', 'LUSTOSA', 'cme'),
  ('TC QOC', '02.704', 'FREITAS', 'bse'),
  ('MAJ QOC', '03.260', 'DANIEL', 'bse'),
  ('TC QOC', '02.307', 'VALÉRIO', '21-bbm-beopp'),
  ('CAP QOC', '04.094', 'DANTAS', '21-bbm-beopp'),
  ('TC QOC', '02.268', 'MARCUS VINÍCIUS BORGES SILVA', 'bopar'),
  ('MAJ QOC', '02.946', 'HIGOR MENDONÇA', 'bopar'),
  ('SD 1ª Classe', '04.389', 'GUIMARÃES ROSA', '1-crbm'),
  ('TC QOC', '02.768', 'POLLYANA', 'qcg'),
  ('CAP QOC', '03.859', 'DANILO', 'qcg'),
  ('MAJ QOC', '02.776', 'BAZÍLIO', '3-bbm'),
  ('MAJ QOC', '03.258', 'ANDRADE', '3-bbm'),
  ('CAP QOC', '03.850', 'MILSON', '3-cibm-silvania'),
  ('CAP QOE/Complementar', '01.757', 'WELSON', '3-cibm-silvania'),
  ('CAP QOE/Complementar', '01.749', 'MARQUES', '22-bbm'),
  ('2º Ten QOE/Complementar', '02.348', 'SUDA', '22-bbm'),
  ('TC QOC', '02.292', 'ANA LÚCIA', '17-bbm'),
  ('CAP QOC', '03.860', 'VICTOR da ROCHA', '17-bbm'),
  ('MAJ QOC', '03.185', 'ALMEIDA', '18-cibm'),
  ('Asp Of', '04494', 'PEIXOTO', '18-cibm'),
  ('TC QOC', '02.274', 'ANDRÉ', '5-crbm'),
  ('TC QOC', '01.402', 'PIMENTEL', '7-bbm'),
  ('1º TEN QOE/Complementar', '01.594', 'MACHADO', '7-bbm'),
  ('TC QOC', '02.291', 'XAVIER', '14-bbm'),
  ('MAJ QOC', '01.982', 'IONE', '14-bbm'),
  ('CAP QOC', '02.703', 'Lucas Maciel Dos Reis Silva', '25-cibm'),
  ('2º TEN QOE/Complementar', '02.404', 'MILANI', '25-cibm'),
  ('TC QOC', '02.284', 'JULIANO', '6-bbm'),
  ('CAP QOE/Complementar', '01.654', 'RODRIGO', '6-bbm'),
  ('TC QOC', '02.296', 'BATISTA', '9-bbm'),
  ('CAP QOC', '02.209', 'TARCÍSIO', '9-bbm'),
  ('TC QOC', '02.308', 'WILIAM', '10-bbm'),
  ('2º TEN QOE/Complementar', '01.395', 'AGUINON', '10-bbm'),
  ('MAJ QOC', '02.956', 'JÚLIO CÉSAR', '12-cibm'),
  ('1º TEN QOE/Complementar', '01.365', 'RICARDO', '12-cibm'),
  ('1º TEN QOC', '04.117', 'ERICK', '14-cibm'),
  ('2º TEN QOE/Complementar', '01.666', 'NASCIMENTO', '14-cibm'),
  ('MAJ QOC', '02.564', 'GRATÃO', '16-cibm'),
  ('CAP QOC', '02.980', 'ÁVILA', '16-cibm'),
  ('MAJ QOC', '02.168', 'MIÑO GUERRA', '23-cibm'),
  ('1º Ten QOE/Complementar', '02.075', 'SANTANA', '23-cibm'),
  ('TC QOC', '01.398', 'NUNES', '15-bbm'),
  ('CAP QOE/Complementar', '01.432', 'ANDRÉ LUIZ', '15-bbm'),
  ('CAP QOC', '03.843', 'MASSON', '5-cibm'),
  ('Asp Of', '04.477', 'GÓIS', '5-cibm'),
  ('MAJ QOC', '01.782', 'ARAUJO', '7-cibm'),
  ('CAP QOE/Complementar', '01.620', 'GOMES', '7-cibm'),
  ('MAJ QOC', '02.461', 'KELVES', '20-cibm'),
  ('CAP QOE/Complementar', '01.326', 'DOS REIS', '20-cibm'),
  ('MAJ QOC', '03.038', 'GISKARD', '21-cibm'),
  ('1º TEN QOE/Complementar', '01.992', 'AVELAR', '21-cibm'),
  ('TC QOC', '02.456', 'JOYCE', 'bm-8'),
  ('1º Ten QOE/Músico', '02.046', 'SIMPLÍCIO', 'bm-8'),
  ('2º TEN', '04.156', 'MARQUES', 'ciaf'),
  ('TC QOC', '02.278', 'WENING', '8-bbm'),
  ('Major QOC', '02.321', 'ALISSON', '8-bbm'),
  ('TC QOC', '02.272', 'DOS SANTOS', '2-bbm'),
  ('MAJ QOC', '03.252', 'GUILHERME', '2-bbm'),
  ('1º TEN QOE/Músico', '01.924', 'Felipe Araújo dos Santos', 'banda-musica'),
  ('CEL QOC', '02.266', 'IGOR', '4-crbm'),
  ('MAJ QOC', '02.775', 'MAURÍLIO', '4-crbm'),
  ('MAJ QOC', '02.079', 'NASCIMENTO', '5-bbm'),
  ('3º SGT', '03.303', 'LÉO', '5-bbm'),
  ('Maj QOC', '02.449', 'FÁBIO LEITE', 'cibm-cidade-ocidental'),
  ('ASP OF', '04.485', 'PANTOJA', 'cibm-cidade-ocidental'),
  ('CAP QOC', '03.867', 'FRANCO', '19-bbm'),
  ('MAJ QOC', '02.953', 'ORNELAS', '19-bbm'),
  ('MAJ QOC', '02.420', 'LINS', '20-bbm'),
  ('1º Ten QPE/Músico', '02.161', 'RINEY', '20-bbm'),
  ('TC QOC', '01.970', 'GYOVANA', '23-bbm'),
  ('CAP QOC', '02.795', 'VOLTERA', '23-bbm'),
  ('MAJ QOC', '01.516', 'RODRIGUES', '24-bbm'),
  ('1º Ten QOC', '04.124', 'LUAN', '24-bbm'),
  ('2º SGT', '03.476', 'ZAKI', '24-bbm'),
  ('CAP QOC', '02.413', 'FRANCISCO LINS', '8-cibm'),
  ('ASP OF', '04.470', 'BESSA', '8-cibm'),
  ('2º Sgt', '03.271', 'LUIZ ANTÔNIO', '8-cibm'),
  ('CAP QOC', '02.349', 'MAGNO', '9-cibm'),
  ('2º SGT', '03.466', 'BRAGA', '9-cibm'),
  ('CAP QOC', '03.844', 'BARBOSA', '10-cibm'),
  ('ASP OF', '04.474', 'CATHARINA', '10-cibm'),
  ('2º SGT', '03.191', 'EMERSON', 'senasp-mj'),
  ('MAJ QOC', '03.207', 'ROBLEDO', '12-bbm'),
  ('2º Ten', '04.144', 'MATHEUS', '12-bbm'),
  ('MAJ QOC', '02.962', 'GOMES', '13-cibm'),
  ('SD 1ª Classe', '04.219', 'HEITOR SILVA', '13-cibm'),
  ('MAJ QOC', '01.904', 'ELIEZER', '17-cibm'),
  ('3º SGT QPC', '03.750', 'CLEIDIMAR', '17-cibm'),
  ('CAP QOC', '03.675', 'GARCIA', '19-cibm'),
  ('2º Sgt QPC', '03.550', 'DEIVID RIBEIRO', '19-cibm'),
  ('2º Ten QOE/Complementar', '01.753', 'WAYNE', '1-pbm'),
  ('Cb QPC', '04.018', 'CARDOSO', '1-pbm'),
  ('TC QOC', '02.275', 'DUTRA', '18-bbm'),
  ('CAP QOE/Complementar', '01.892', 'EDER', '18-bbm'),
  ('MAJ QOC', '01.805', 'ÁLVARO', '1-cibm'),
  ('CAP QOC', '03.841', 'SILVEIRA', '1-cibm'),
  ('MAJ QOC', '02.791', 'MÍRIAN', '11-cibm'),
  ('1º TEN QOE/Complementar', '01.968', 'GRAZIELLA', '11-cibm'),
  ('CAP QOC', '03.848', 'LACERDA', '22-cibm'),
  ('1º TEN QOE/Complementar', '01.747', 'VIRGÍNIA', '22-cibm'),
  ('TC QOC', '02.302', 'LEONARDO', '11-bbm'),
  ('CAP QOC', '03.865', 'JEFFERSON', '11-bbm'),
  ('CAP QOC', '03.858', 'COSTA SILVA', '6-cibm'),
  ('Asp Of', '04.480', 'POLIANA', '6-cibm'),
  ('TC QOC', '02.782', 'LIMA TOSTA', '4-bbm'),
  ('TC QOC', '02.773', 'RICARDO', '4-bbm'),
  ('CAP QOE/Complementar', '01.590', 'DIAS', '4-bbm'),
  ('1º Ten QOE/Complementar', '01.224', 'ALEX GLAUCO', '4-bbm'),
  ('2º Ten QOE/Complementar', '01.335', 'CARRIJO', '4-bbm'),
  ('2º TEN QOE/Complementar', '02.328', 'ANDERSON', '4-bbm'),
  ('CAP QOC', '03.678', 'EDSON', '3-cibm-santa-helena'),
  ('2º TEN QOE/Complementar', '01.294', 'QUEIROZ', '3-cibm-santa-helena'),
  ('TC QOC', '02.280', 'EDUARDO MONTEIRO', '13-bbm'),
  ('ASP OF', '04.478', 'MENDONÇA', '13-bbm'),
  ('MAJ QOC', '01.554', 'HUGO', '16-bbm'),
  ('1º Ten QOE/Complementar', '01.341', 'PRADO', '16-bbm');
