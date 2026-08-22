// Preencha com os valores do SEU projeto Supabase — ver painel-captacao/SETUP.md, passo 5
// ("Pegar a URL e a chave do projeto"). Depois de colar os dois valores aqui, salve o arquivo,
// rode `npm run build` (ou deixe a automação do GitHub Actions fazer isso) e publique.
//
// A "anon public key" NÃO é um segredo — ela foi feita pra ficar visível no código do site
// (é assim que qualquer app que usa Supabase direto do navegador funciona). Quem protege os
// dados são as regras de segurança (RLS) definidas em supabase/schema.sql, não o sigilo desta
// chave. Nunca cole aqui a "service_role key" (essa sim é secreta e nunca deve ir pro navegador).
export const SUPABASE_URL = 'COLE_AQUI_A_PROJECT_URL';
export const SUPABASE_ANON_KEY = 'COLE_AQUI_A_ANON_PUBLIC_KEY';
