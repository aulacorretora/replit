import { createClient } from '@supabase/supabase-js';

// Supabase configuration - URL do projeto novo
const supabaseUrl = 'https://gqjfbdqgcjvdnbvcupcf.supabase.co';

// Chave pública anon (segura para usar no frontend também)
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxamZiZHFnY2p2ZG5idmN1cGNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MDAzNjksImV4cCI6MjA2MTk3NjM2OX0.x-hqQJYG2dcdmAxu6MGdWEdUFI3GjffxGBvzat2oAX4';

// Cliente Supabase com chave anon
export const supabase = createClient(supabaseUrl, supabaseKey);

// Cliente Supabase com service role para operações administrativas
// Esta chave deve ser usada apenas no backend
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE;
if (!serviceRoleKey) {
  console.warn('SUPABASE_SERVICE_ROLE não definida. Operações administrativas podem falhar.');
}

// Criamos o supabaseAdmin apenas se tivermos a service role key
export const supabaseAdmin = serviceRoleKey 
  ? createClient(supabaseUrl, serviceRoleKey)
  : createClient(supabaseUrl, supabaseKey); // Fallback para chave anon

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