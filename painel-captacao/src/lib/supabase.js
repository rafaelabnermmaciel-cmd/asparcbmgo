import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

export const supabaseConfigurado = !SUPABASE_URL.startsWith('COLE_AQUI') && !SUPABASE_ANON_KEY.startsWith('COLE_AQUI');

// Cliente "vazio" (URL de exemplo) quando ainda não configurado, só pra não quebrar o import
// em outros arquivos antes da configuração — quem checa se dá pra usar de verdade é
// `supabaseConfigurado` (ver banner de aviso em App.jsx).
//
// `flowType: 'pkce'` é importante aqui: o app usa HashRouter (rotas tipo #/gerenciamento), e o
// fluxo padrão de login do Supabase também usaria o "#" da URL pra devolver o token — os dois
// brigariam pelo mesmo pedaço da URL. Com PKCE, o retorno do login vem por "?code=...", sem
// conflito nenhum com as rotas do site.
export const supabase = createClient(
  supabaseConfigurado ? SUPABASE_URL : 'https://placeholder.supabase.co',
  supabaseConfigurado ? SUPABASE_ANON_KEY : 'placeholder',
  { auth: { flowType: 'pkce' } }
);
