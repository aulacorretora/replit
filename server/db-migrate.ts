import { db } from "./db";
import * as schema from "@shared/schema";
import { sql } from "drizzle-orm";

// Função para executar a migração do banco de dados
async function runMigration() {
  console.log("Iniciando migração do banco de dados...");
  
  try {
    // Verificar se já existe alguma tabela no banco
    console.log("Verificando se o banco de dados já está inicializado...");
    
    const tablesResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    
    const tables = tablesResult.rows.map((row: any) => row.table_name);
    
    if (tables.length === 0) {
      console.log("Nenhuma tabela encontrada. Inicializando o banco de dados...");
      
      // Criar as tabelas necessárias
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "users" (
          "id" SERIAL PRIMARY KEY,
          "email" TEXT NOT NULL UNIQUE,
          "password" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "role" TEXT NOT NULL DEFAULT 'user',
          "active" BOOLEAN NOT NULL DEFAULT true,
          "language" TEXT NOT NULL DEFAULT 'pt-BR',
          "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "last_login_at" TIMESTAMP
        );
      `);
      
      console.log("Tabela de usuários criada com sucesso!");
      
      // Criar o usuário admin padrão
      const hashedPassword = "$2a$10$PpUyYiUgKcxeNIQJyA7K8O0UOqxNi5GeXUbfuNJzNYSCqUcXadHpC"; // senha: adminpass
      await db.execute(sql`
        INSERT INTO "users" ("email", "password", "name", "role")
        VALUES ('admin@zapban.com', ${hashedPassword}, 'Administrador', 'admin')
      `);
      
      console.log("Usuário administrador criado com sucesso!");
      
      // Criar as demais tabelas
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "instances" (
          "id" SERIAL PRIMARY KEY,
          "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "name" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'disconnected',
          "phone_number" TEXT,
          "connected" BOOLEAN NOT NULL DEFAULT false,
          "qr_code" TEXT,
          "qr_code_generated_at" TIMESTAMP,
          "device_info" JSONB,
          "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "last_connected_at" TIMESTAMP,
          "last_error" TEXT
        );
        
        CREATE TABLE IF NOT EXISTS "chats" (
          "id" SERIAL PRIMARY KEY,
          "instance_id" INTEGER NOT NULL REFERENCES "instances"("id") ON DELETE CASCADE,
          "remote_jid" TEXT NOT NULL,
          "name" TEXT,
          "last_message_at" TIMESTAMP,
          "unread_count" INTEGER NOT NULL DEFAULT 0,
          "profile_picture" TEXT,
          "push_name" TEXT,
          "status" TEXT,
          "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS "messages" (
          "id" SERIAL PRIMARY KEY,
          "chat_id" INTEGER NOT NULL REFERENCES "chats"("id") ON DELETE CASCADE,
          "instance_id" INTEGER NOT NULL REFERENCES "instances"("id") ON DELETE CASCADE,
          "message_id" TEXT NOT NULL,
          "remote_jid" TEXT NOT NULL,
          "from_me" BOOLEAN NOT NULL,
          "type" TEXT NOT NULL,
          "content" TEXT,
          "media_url" TEXT,
          "media_type" TEXT,
          "status" TEXT NOT NULL,
          "timestamp" TIMESTAMP NOT NULL,
          "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        );
      `);
      
      console.log("Tabelas de WhatsApp criadas com sucesso!");
      
      // Criar os enums necessários
      await db.execute(sql`
        -- Enums
        DO $$ BEGIN
            CREATE TYPE api_key_provider AS ENUM (
              'openai', 
              'google', 
              'azure', 
              'anthropic', 
              'elevenlabs', 
              'custom'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
        
        DO $$ BEGIN
            CREATE TYPE agent_tone AS ENUM (
              'informal', 
              'formal', 
              'empático', 
              'vendedor', 
              'técnico', 
              'educacional'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
        
        DO $$ BEGIN
            CREATE TYPE agent_objective AS ENUM (
              'suporte', 
              'vendas', 
              'onboarding', 
              'retenção', 
              'educação', 
              'geral'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
        
        DO $$ BEGIN
            CREATE TYPE flow_node_type AS ENUM (
              'text',
              'audio',
              'video',
              'pdf',
              'image',
              'typing',
              'condition',
              'tag',
              'api',
              'ai_agent',
              'openai',
              'wait_response',
              'schedule',
              'menu',
              'input',
              'human'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
      `);
      
      console.log("Tipos enum criados com sucesso!");
      
      // Criar as tabelas para o AI Agent
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "ai_agents" (
          "id" SERIAL PRIMARY KEY,
          "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "name" TEXT NOT NULL,
          "description" TEXT,
          "tone" agent_tone NOT NULL DEFAULT 'informal',
          "objective" agent_objective NOT NULL DEFAULT 'geral',
          "system_prompt" TEXT NOT NULL,
          "knowledge_base" BOOLEAN NOT NULL DEFAULT false,
          "active" BOOLEAN NOT NULL DEFAULT true,
          "temperature" NUMERIC(3, 2) NOT NULL DEFAULT 0.7,
          "max_tokens" INTEGER NOT NULL DEFAULT 2048,
          "model" TEXT NOT NULL DEFAULT 'gpt-4o',
          "voice_enabled" BOOLEAN NOT NULL DEFAULT false,
          "voice_model" TEXT DEFAULT 'alloy',
          "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS "ai_agent_documents" (
          "id" SERIAL PRIMARY KEY,
          "agent_id" INTEGER NOT NULL REFERENCES "ai_agents"("id") ON DELETE CASCADE,
          "name" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "content" TEXT,
          "file_path" TEXT,
          "processed" BOOLEAN NOT NULL DEFAULT false,
          "processing_error" TEXT,
          "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "processed_at" TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS "ai_agent_conversations" (
          "id" SERIAL PRIMARY KEY,
          "agent_id" INTEGER NOT NULL REFERENCES "ai_agents"("id") ON DELETE CASCADE,
          "instance_id" INTEGER REFERENCES "instances"("id") ON DELETE SET NULL,
          "chat_id" INTEGER REFERENCES "chats"("id") ON DELETE SET NULL,
          "active" BOOLEAN NOT NULL DEFAULT true,
          "metadata" JSONB,
          "last_message_at" TIMESTAMP,
          "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS "ai_agent_messages" (
          "id" SERIAL PRIMARY KEY,
          "conversation_id" INTEGER NOT NULL REFERENCES "ai_agent_conversations"("id") ON DELETE CASCADE,
          "role" TEXT NOT NULL,
          "content" TEXT NOT NULL,
          "metadata" JSONB,
          "whatsapp_message_id" TEXT,
          "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        );
      `);
      
      console.log("Tabelas de AI Agent criadas com sucesso!");
      
      // Criar as tabelas para Automações
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "automations" (
          "id" SERIAL PRIMARY KEY,
          "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "name" TEXT NOT NULL,
          "description" TEXT,
          "active" BOOLEAN NOT NULL DEFAULT false,
          "draft" BOOLEAN NOT NULL DEFAULT true,
          "instance_id" INTEGER REFERENCES "instances"("id") ON DELETE SET NULL,
          "start_node_id" VARCHAR(36),
          "triggers" JSONB DEFAULT '{}',
          "tags" JSONB DEFAULT '[]',
          "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "last_published_at" TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS "automation_nodes" (
          "id" VARCHAR(36) PRIMARY KEY,
          "automation_id" INTEGER NOT NULL REFERENCES "automations"("id") ON DELETE CASCADE,
          "type" flow_node_type NOT NULL,
          "name" TEXT NOT NULL,
          "config" JSONB NOT NULL,
          "position" JSONB NOT NULL,
          "next_node_id" VARCHAR(36),
          "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS "automation_edges" (
          "id" VARCHAR(36) PRIMARY KEY,
          "automation_id" INTEGER NOT NULL REFERENCES "automations"("id") ON DELETE CASCADE,
          "source_id" VARCHAR(36) NOT NULL REFERENCES "automation_nodes"("id") ON DELETE CASCADE,
          "target_id" VARCHAR(36) NOT NULL REFERENCES "automation_nodes"("id") ON DELETE CASCADE,
          "source_handle" TEXT,
          "target_handle" TEXT,
          "label" TEXT,
          "condition" JSONB,
          "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS "automation_executions" (
          "id" SERIAL PRIMARY KEY,
          "automation_id" INTEGER NOT NULL REFERENCES "automations"("id") ON DELETE CASCADE,
          "chat_id" INTEGER REFERENCES "chats"("id") ON DELETE SET NULL,
          "instance_id" INTEGER REFERENCES "instances"("id") ON DELETE SET NULL,
          "status" TEXT NOT NULL,
          "current_node_id" VARCHAR(36) REFERENCES "automation_nodes"("id") ON DELETE SET NULL,
          "variables" JSONB,
          "metadata" JSONB,
          "started_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "completed_at" TIMESTAMP,
          "error" TEXT
        );
        
        CREATE TABLE IF NOT EXISTS "automation_execution_logs" (
          "id" SERIAL PRIMARY KEY,
          "execution_id" INTEGER NOT NULL REFERENCES "automation_executions"("id") ON DELETE CASCADE,
          "node_id" VARCHAR(36) REFERENCES "automation_nodes"("id") ON DELETE SET NULL,
          "status" TEXT NOT NULL,
          "details" JSONB,
          "error" TEXT,
          "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        );
      `);
      
      console.log("Tabelas de Automações criadas com sucesso!");
      
      // Criar as tabelas para API Keys e Tags
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "api_keys" (
          "id" SERIAL PRIMARY KEY,
          "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "provider" api_key_provider NOT NULL,
          "name" TEXT NOT NULL,
          "key" TEXT NOT NULL,
          "active" BOOLEAN NOT NULL DEFAULT true,
          "validated" BOOLEAN NOT NULL DEFAULT false,
          "validated_at" TIMESTAMP,
          "settings" JSONB DEFAULT '{}',
          "last_used_at" TIMESTAMP,
          "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS "contact_tags" (
          "id" SERIAL PRIMARY KEY,
          "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "name" TEXT NOT NULL,
          "color" TEXT NOT NULL DEFAULT '#6366F1',
          "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS "chat_tags" (
          "id" SERIAL PRIMARY KEY,
          "chat_id" INTEGER NOT NULL REFERENCES "chats"("id") ON DELETE CASCADE,
          "tag_id" INTEGER NOT NULL REFERENCES "contact_tags"("id") ON DELETE CASCADE,
          "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS "webhook_events" (
          "id" SERIAL PRIMARY KEY,
          "provider" TEXT NOT NULL,
          "event" TEXT NOT NULL,
          "payload" JSONB NOT NULL,
          "processed" BOOLEAN NOT NULL DEFAULT false,
          "error" TEXT,
          "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "processed_at" TIMESTAMP
        );
      `);
      
      console.log("Tabelas de API Keys e Tags criadas com sucesso!");
      
      console.log("Migração inicial do banco de dados concluída com sucesso!");
    } else {
      console.log("Banco de dados já inicializado.");
      console.log(`Tabelas existentes: ${tables.join(', ')}`);
      
      // Verificar se existem atualizações a serem feitas em tabelas existentes
      if (tables.includes('ai_agent_messages') && !tables.includes('users')) {
        // Atualizar tabela ai_agent_messages para substituir messageId por whatsapp_message_id
        try {
          const columnCheck = await db.execute(sql`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'ai_agent_messages' AND column_name = 'whatsapp_message_id'
          `);
          
          if (columnCheck.rows.length === 0) {
            console.log("Atualizando tabela ai_agent_messages...");
            await db.execute(sql`
              ALTER TABLE "ai_agent_messages" 
              ADD COLUMN "whatsapp_message_id" TEXT;
            `);
            
            // Verificar se a coluna messageId existe e transferir os dados
            const oldColumnCheck = await db.execute(sql`
              SELECT column_name
              FROM information_schema.columns
              WHERE table_name = 'ai_agent_messages' AND column_name = 'message_id'
            `);
            
            if (oldColumnCheck.rows.length > 0) {
              console.log("Transferindo dados de message_id para whatsapp_message_id...");
              await db.execute(sql`
                UPDATE "ai_agent_messages"
                SET "whatsapp_message_id" = "message_id"
              `);
              
              console.log("Removendo coluna message_id...");
              await db.execute(sql`
                ALTER TABLE "ai_agent_messages"
                DROP COLUMN "message_id"
              `);
            }
            
            console.log("Atualização da tabela ai_agent_messages concluída com sucesso!");
          } else {
            console.log("Tabela ai_agent_messages já está atualizada.");
          }
        } catch (error) {
          console.error("Erro ao atualizar tabela ai_agent_messages:", error);
        }
      }
    }
    
    // Verificar se existem usuários
    const usersResult = await db.execute(sql`SELECT COUNT(*) as user_count FROM "users"`);
    const userCount = Number(usersResult.rows[0].user_count || 0);
    
    if (userCount === 0) {
      console.log("Nenhum usuário encontrado. Criando usuário administrador padrão...");
      
      // Criar o usuário admin padrão
      const hashedPassword = "$2a$10$PpUyYiUgKcxeNIQJyA7K8O0UOqxNi5GeXUbfuNJzNYSCqUcXadHpC"; // senha: adminpass
      await db.execute(sql`
        INSERT INTO "users" ("email", "password", "name", "role")
        VALUES ('admin@zapban.com', ${hashedPassword}, 'Administrador', 'admin')
      `);
      
      console.log("Usuário administrador criado com sucesso!");
    } else {
      console.log(`${userCount} usuários encontrados no banco.`);
    }
    
    console.log("Verificação e migração do banco de dados finalizadas.");
    
  } catch (error) {
    console.error("Erro durante a migração do banco de dados:", error);
    throw error;
  }
}

// Executar a migração
runMigration()
  .then(() => {
    console.log("Script de migração executado com sucesso.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Falha ao executar script de migração:", error);
    process.exit(1);
  });