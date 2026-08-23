import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

export const supabaseConfigurado = !SUPABASE_URL.startsWith('COLE_AQUI') && !SUPABASE_ANON_KEY.startsWith('COLE_AQUI');

// Cliente "vazio" (URL de exemplo) quando ainda não configurado, só pra não quebrar o import
// em outros arquivos antes da configuração — quem checa se dá pra usar de verdade é
// `supabaseConfigurado`.
export const supabase = createClient(
  supabaseConfigurado ? SUPABASE_URL : 'https://placeholder.supabase.co',
  supabaseConfigurado ? SUPABASE_ANON_KEY : 'placeholder'
);
