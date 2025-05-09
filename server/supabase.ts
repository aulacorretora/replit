import { createClient } from '@supabase/supabase-js';

// Supabase configuration - Usando variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERRO: Variáveis de ambiente SUPABASE_URL e SUPABASE_ANON_KEY devem ser configuradas');
}

// Cliente Supabase com chave anon
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente Supabase com service role para operações administrativas
// Esta chave deve ser usada apenas no backend
if (!supabaseServiceKey) {
  console.warn('SUPABASE_SERVICE_KEY não definida. Operações administrativas podem falhar.');
}

// Criamos o supabaseAdmin apenas se tivermos a service role key
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : createClient(supabaseUrl, supabaseAnonKey); // Fallback para chave anon

// Helper to check if the supabase client is working
export async function checkSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      console.error('Erro ao conectar ao Supabase:', error.message);
      return false;
    }
    console.log('Supabase client inicializado com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao conectar ao Supabase:', error);
    return false;
  }
}
