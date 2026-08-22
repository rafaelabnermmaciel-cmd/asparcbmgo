-- ============================================================================
-- Painel de Captação (CBM-GO) — script de configuração do banco Supabase.
--
-- Como usar: Supabase → seu projeto → menu "SQL Editor" → "New query" → cole ESTE ARQUIVO
-- INTEIRO → botão "Run". Pode rodar de novo sem medo (todos os comandos são "se não existir"
-- / "sem duplicar"), então não tem problema clicar duas vezes.
--
-- O que este script cria:
--   1. Tabela "quarteis"       — as unidades (OBMs) do CBMGO, com o militar designado pra
--                                 relações institucionais em cada uma (edite pelo Table Editor)
--   2. Tabela "interlocutores" — contato de captação de cada parlamentar
--   3. Tabela "captacoes"      — os cadastros feitos pelo formulário do site
--   4. Regras de segurança (RLS) de cada tabela
--   5. Um espaço de arquivos ("bucket") chamado "anexos" pras fotos/documentos do cadastro
--   6. Tempo real pra tabela de captações
--   7. As 60 unidades da Convocação nº 106/2026 (Capacitação em Relações Institucionais e
--      Governamentais), já com o(s) militar(es) designado(s) em cada uma
-- ============================================================================

-- 1) QUARTÉIS ----------------------------------------------------------------
create table if not exists quarteis (
  id text primary key,                       -- código curto, sem espaço/acento (ex: "8-bbm")
  nome text not null,                        -- nome que aparece no site (ex: "8º BBM")
  municipio text not null default '',
  tipo text not null default '',             -- livre — "BBM", "CIBM", "CRBM" etc.
  responsavel_padrao text not null default '' -- militar(es) de referência pra articulação
                                              -- naquele quartel — só um valor sugerido: quem
                                              -- preenche o Cadastro pode digitar outro nome
);

-- Caso a tabela já exista de uma execução anterior sem esta coluna, adiciona agora.
alter table quarteis add column if not exists responsavel_padrao text not null default '';

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

-- 7) UNIDADES (OBMs) E MILITARES DESIGNADOS ------------------------------------
-- Extraído da Convocação nº 106/2026 (Capacitação em Relações Institucionais e Governamentais
-- do CBMGO, 19/08/2026) — as 60 unidades convocadas e o(s) militar(es) designado(s) em cada
-- uma. "responsavel_padrao" é só uma sugestão de quem já está mais familiarizado com
-- articulação institucional naquela unidade; ajuste/adicione/apague direto na tabela
-- "quarteis" pelo Table Editor a qualquer momento — sem precisar rodar SQL de novo.
insert into quarteis (id, nome, municipio, tipo, responsavel_padrao) values
  ('cat', 'CAT', 'Goiânia', 'CAT', 'TC Bruno Alves Ferreira; TC Ana Paula Franco Finotti'),
  ('codec', 'CODEC', 'Goiânia', 'CODEC', 'TC André Luiz de Jesus Aquino; Maj Marcelo Martins Moura'),
  ('ceman', 'CEMAN', 'Goiânia', 'CEMAN', 'TC Ciro Martins da Silva; 1º Sgt Luiz Fernando de Gusmão Viana'),
  ('cme', 'CME', 'Goiânia', 'CME', '1º Ten Jefferson da Costa Lustosa'),
  ('bse', 'BSE', 'Goiânia', 'BSE', 'TC Luciano Alexandre de Freitas; Maj Daniel Gonçalves Vitorino Campos de Miranda'),
  ('21-bbm-beopp', '21º BBM / BEOPP', 'Goiânia', 'BBM', 'TC Wanderley Valério de Oliveira; Cap Lucas Nunes Dantas'),
  ('bopar', 'BOPAR', 'Goiânia', 'BOPAR', 'TC Marcus Vinícius Borges Silva; Maj Higor Mendonça'),
  ('1-crbm', '1º CRBM', 'Goiânia', 'CRBM', 'Sd 1ª Classe João Gabriel Guimarães Rosa'),
  ('qcg', 'QCG', 'Goiânia', 'QCG', 'TC Pollyana Araújo Santos Figueiredo; Cap Danilo Batista de Paula Queiroz'),
  ('3-bbm', '3º BBM', 'Anápolis', 'BBM', 'Maj Hugo de Oliveira Bazílio; Maj Vilmar Teixeira de Andrade'),
  ('3-cibm-silvania', '3ª CIBM', 'Silvânia', 'CIBM', 'Cap Milson Fernandes da Silva Junior; Cap Welson José de Abreu Silva'),
  ('22-bbm', '22º BBM', 'Jaraguá', 'BBM', 'Cap Wallace Marques Pacheco; 2º Ten Carlos Henrique de Oliveira Suda'),
  ('17-bbm', '17º BBM', 'Pirenópolis', 'BBM', 'TC Ana Lúcia Cardoso; Cap Davidson Victor da Rocha Barbosa'),
  ('18-cibm', '18ª CIBM', 'Ceres', 'CIBM', 'Maj Diego de Almeida Ferreira; Asp Of Brenno Lobo Netto Peixoto'),
  ('5-crbm', '5º CRBM', 'Aparecida de Goiânia', 'CRBM', 'TC André Luiz De Sousa Machado'),
  ('7-bbm', '7º BBM', 'Aparecida de Goiânia', 'BBM', 'TC Ronaldo Rodrigues Pimentel; 1º Ten Leomar Dias Machado'),
  ('14-bbm', '14º BBM', 'Senador Canedo', 'BBM', 'TC Charles Xavier De Barros; Maj Ione Gomes Dos Santos'),
  ('25-cibm', '25ª CIBM', 'Bela Vista de Goiás', 'CIBM', 'Cap Lucas Maciel Dos Reis Silva; 2º Ten Fabricio De Oliveira Milani'),
  ('6-bbm', '6º BBM', 'Itumbiara', 'BBM', 'TC Juliano Borges Ferreira; Cap Northon Rodrigo De Alice'),
  ('9-bbm', '9º BBM', 'Caldas Novas', 'BBM', 'TC Daniel Freire Pereira Batista; Cap Tarcísio Duarte Celestino'),
  ('10-bbm', '10º BBM', 'Catalão', 'BBM', 'TC Wiliam Alves Diniz Júnior; 2º Ten Aguinon Batista da Costa'),
  ('12-cibm', '12ª CIBM', 'Morrinhos', 'CIBM', 'Maj Júlio César dos Santos Gomes; 1º Ten Ricardo Barbosa Correia'),
  ('14-cibm', '14ª CIBM', 'Pires do Rio', 'CIBM', '1º Ten Erick Martuscelli de Almeida; 2º Ten Paulo Fernando do Nascimento'),
  ('16-cibm', '16ª CIBM', 'Goiatuba', 'CIBM', 'Maj Vinícius Gratão Dalul; Cap Bruno Henrique Ávila'),
  ('23-cibm', '23ª CIBM', 'Ipameri', 'CIBM', 'Maj Rodrigo André Miño Guerra; 1º Ten Luís Cláudio Santana'),
  ('15-bbm', '15º BBM', 'Trindade', 'BBM', 'TC Fábio Nunes do Nascimento; Cap André Luiz do Carmo Santana'),
  ('5-cibm', '5ª CIBM', 'Palmeiras de Goiás', 'CIBM', 'Cap Fábio Pinheiro De Lemos Masson; Asp Of Cainan Magalhães Góis'),
  ('7-cibm', '7ª CIBM', 'Inhumas', 'CIBM', 'Maj Ailton Pinheiro de Araujo; Cap Marcelo Gomes'),
  ('20-cibm', '20ª CIBM', 'Goianira', 'CIBM', 'Maj Kelves Gonçalves; Cap Ronaldo Dos Reis Araújo'),
  ('21-cibm', '21ª CIBM', 'Nerópolis', 'CIBM', 'Maj Giskard Xavier Nunes; 1º Ten Jaime de Souza Avelar'),
  ('bm-8', 'BM/8', 'Goiânia', 'BM', 'TC Joyce Ferreira Faria; 1º Ten Leandro Simplício Vieira'),
  ('ciaf', 'CIAF', 'Goiânia', 'CIAF', '2º Ten Marco Aurélio Marques de Sousa'),
  ('8-bbm', '8º BBM', 'Goiânia — Parque Amazônia', 'BBM', 'TC Cristian Wening Santana; Maj Alisson Batista De Oliveira'),
  ('2-bbm', '2º BBM', 'Goiânia — Setor Aeroviário', 'BBM', 'TC Adriano Lourenço Dos Santos; Maj Guilherme Antonio Lisita'),
  ('banda-musica', 'Banda de Música', 'Goiânia', 'Banda', '1º Ten Felipe Araújo dos Santos'),
  ('4-crbm', '4º CRBM', 'Luziânia', 'CRBM', 'Cel Igor Aparecido Alves; Maj Maurílio Correia César'),
  ('5-bbm', '5º BBM', 'Luziânia', 'BBM', 'Maj Luiz Fernando Pereira do Nascimento; 3º Sgt Léo Francisco Saraiva e Silva'),
  ('cibm-cidade-ocidental', 'CIBM de Cidade Ocidental (futura)', 'Cidade Ocidental', 'CIBM', 'Maj José Fábio Anastácio Leite; Asp Of Vinícius Cardoso Pantoja'),
  ('19-bbm', '19º BBM', 'Formosa', 'BBM', 'Cap Leandro de Lima Franco; Maj Eliton Ataíde Ornelas'),
  ('20-bbm', '20ª BBM', 'Águas Lindas de Goiás', 'BBM', 'Maj Gabriel Lins dos Santos; 1º Ten Riney Ferreira Serbêto'),
  ('23-bbm', '23º BBM', 'Planaltina', 'BBM', 'TC Gyovana da Cruz Martins; Cap Elton Leandro Voltera'),
  ('24-bbm', '24º BBM', 'Valparaíso de Goiás', 'BBM', 'Maj Fábio José Rodrigues; 1º Ten Luan de Souza da Silva; 2º Sgt Matheus Gomes Zaki Gerges'),
  ('8-cibm', '8ª CIBM', 'Cristalina', 'CIBM', 'Cap Francisco Lins de Sousa; Asp Of Pedro Henrique Bessa dos Santos; 2º Sgt Luiz Antônio Coleto de Vasconselos'),
  ('9-cibm', '9ª CIBM', 'Santo Antônio do Descoberto', 'CIBM', 'Cap Carlos Magno Rodrigues Meneses; 2º Sgt Ismael Braga Barbosa'),
  ('10-cibm', '10ª CIBM', 'Posse', 'CIBM', 'Cap Alan da Silva Barbosa; Asp Of Catharina Dias Gusmão'),
  ('12-bbm', '12º BBM', 'Goiás', 'BBM', 'Maj Robledo Curado de Camargo; 2º Ten Matheus Mendes de Melo Moura'),
  ('13-cibm', '13ª CIBM', 'Iporá', 'CIBM', 'Maj Salathyel Gomes Carvalho; Sd 1ª Classe Heitor Silva Dias'),
  ('17-cibm', '17ª CIBM', 'Itaberaí', 'CIBM', 'Maj Eliezer de Melo Maciel; 3º Sgt Cleidimar Pinheiro de Morais'),
  ('19-cibm', '19ª CIBM', 'São Luís de Montes Belos', 'CIBM', 'Cap Leandro Alfredo Garcia; 2º Sgt Deivid Pires Ribeiro'),
  ('1-pbm', '1º PBM', 'Aruanã', 'PBM', '2º Ten Wayne Cabral da Silva; Cb Mateus Carvalho Cardoso'),
  ('18-bbm', '18º BBM', 'Goianésia', 'BBM', 'TC Ary Bernardo Dutra dos Santos; Cap Eder Rosa da Silva'),
  ('1-cibm', '1ª CIBM', 'Minaçu', 'CIBM', 'Maj Álvaro Divino Dias Filho; Cap Wenderson Silva da Silveira'),
  ('11-cibm', '11ª CIBM', 'Uruaçu', 'CIBM', 'Maj Mírian Lopes dos Reis Araújo; 1º Ten Graziella Carneiro de Souza'),
  ('22-cibm', '22ª CIBM', 'São Miguel do Araguaia', 'CIBM', 'Cap Maycon Raulf de Lacerda; 1º Ten Virgínia Altoé'),
  ('11-bbm', '11º BBM', 'Porangatu', 'BBM', 'TC Leonardo Passos da Silva; Cap Jefferson Rodrigues de Oliveira'),
  ('6-cibm', '6ª CIBM', 'Niquelândia', 'CIBM', 'Cap Daniel Vitor da Costa Silva; Asp Of Poliana Alves de Souza Godoi'),
  ('4-bbm', '4º BBM', 'Rio Verde', 'BBM', 'TC Roberto Cezar Lima Tosta; TC Ricardo de Souza Oliveira; Cap Leandro Martins Dias; 1º Ten Alex Glauco da Silva Marques; 2º Ten Jean Carlos Pereira Carrijo; 2º Ten Anderson Toledo de Almeida'),
  ('3-cibm-santa-helena', '3ª CIBM', 'Santa Helena de Goiás', 'CIBM', 'Cap Edson Ferreira Ribeiro Júnior; 2º Ten Valmison de Oliveira Queiroz'),
  ('13-bbm', '13º BBM', 'Jataí', 'BBM', 'TC Eduardo Monteiro do Amaral; Asp Of Gabriel Santana Mendonça'),
  ('16-bbm', '16º BBM', 'Mineiros', 'BBM', 'Maj Hugo Brito; 1º Ten Márcio dos Santos Prado')
on conflict (id) do update set
  nome = excluded.nome,
  municipio = excluded.municipio,
  tipo = excluded.tipo,
  responsavel_padrao = excluded.responsavel_padrao;
