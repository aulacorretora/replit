import { createClient } from '@supabase/supabase-js';
import { ENV } from './env';

// Supabase configuration - Usando variáveis de ambiente do módulo env.ts
const supabaseUrl = ENV.SUPABASE_URL || '';
const supabaseAnonKey = ENV.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = ENV.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERRO: Variáveis de ambiente SUPABASE_URL e SUPABASE_ANON_KEY devem ser configuradas');
  console.error('Valores atuais:', { 
    supabaseUrl: supabaseUrl ? 'configurado' : 'não configurado', 
    supabaseAnonKey: supabaseAnonKey ? 'configurado' : 'não configurado' 
  });
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
