// Projeto Supabase próprio do Painel Parlamentar — independente do projeto usado pelo
// painel-captacao (são dois projetos separados, sem nenhuma tabela em comum).
//
// A "chave publicável" (sb_publishable_...) NÃO é um segredo — ela foi feita pra ficar
// visível no código do site (é assim que qualquer app que usa Supabase direto do navegador
// funciona). Quem protege os dados são as regras de segurança (RLS) definidas em
// supabase/schema.sql, não o sigilo desta chave. Nunca cole aqui a "chave secreta"
// (sb_secret_..., antiga "service_role") — essa sim nunca deve ir pro navegador.
export const SUPABASE_URL = 'COLE_AQUI_A_URL_DO_PROJETO';
export const SUPABASE_ANON_KEY = 'COLE_AQUI_A_CHAVE_PUBLICAVEL';
