import { checkDatabaseConnection } from './db';
import { checkSupabaseConnection } from './supabase';

async function testConnections() {
  console.log('=== Testando conexões com banco de dados ===');
  
  // Teste conexão com Supabase
  console.log('\n🔍 Testando conexão com Supabase...');
  const supabaseConnected = await checkSupabaseConnection();
  console.log(supabaseConnected 
    ? '✅ Conexão com Supabase estabelecida com sucesso!' 
    : '❌ Falha na conexão com Supabase');
  
  // Teste conexão direta com PostgreSQL
  console.log('\n🔍 Testando conexão direta com PostgreSQL...');
  
  if (!process.env.DATABASE_URL) {
    console.log('⚠️ A variável DATABASE_URL não está definida');
    console.log('Por favor, defina DATABASE_URL com a string de conexão do PostgreSQL');
  } else {
    console.log('📋 DATABASE_URL está definida');
    const pgConnected = await checkDatabaseConnection();
    console.log(pgConnected 
      ? '✅ Conexão direta com PostgreSQL estabelecida com sucesso!' 
      : '❌ Falha na conexão direta com PostgreSQL');
  }
  
  console.log('\n=== Teste de conexões concluído ===');
}

// Executar o teste
testConnections().catch(error => {
  console.error('Erro ao executar testes de conexão:', error);
});