import { 
  users, type User, type InsertUser,
  instances, type Instance, type InsertInstance,
  chats, type Chat, type InsertChat,
  messages, type Message, type InsertMessage,
  webhookEvents, type WebhookEvent, type InsertWebhookEvent,
  aiAgents, type AiAgent, type InsertAiAgent,
  aiAgentDocuments, type AiAgentDocument, type InsertAiAgentDocument,
  aiAgentConversations, type AiAgentConversation, type InsertAiAgentConversation,
  aiAgentMessages, type AiAgentMessage, type InsertAiAgentMessage,
  automations, type Automation, type InsertAutomation,
  automationNodes, type AutomationNode, type InsertAutomationNode,
  automationEdges, type AutomationEdge, type InsertAutomationEdge,
  automationExecutions, type AutomationExecution, type InsertAutomationExecution,
  automationExecutionLogs, type AutomationExecutionLog, type InsertAutomationExecutionLog,
  contactTags, type ContactTag, type InsertContactTag,
  chatTags, type ChatTag, type InsertChatTag,
  apiKeys, type ApiKey, type InsertApiKey,
  apiKeyProviderEnum
} from "@shared/schema";
import { createClient } from '@supabase/supabase-js';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from './db';

// Supabase setup
const supabaseUrl = 'https://mopdlsgtfddzqjjerecz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vcGRsc2d0ZmRkenFqamVyZWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1NjEwMDMsImV4cCI6MjA1ODEzNzAwM30.V8siUExiTOwKTqpIUEfgjJeDAeetORbf3pG8Nn4OgyA';

// Storage interface definition
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  
  // Instance operations
  getInstance(id: number): Promise<Instance | undefined>;
  getInstanceByUser(userId: number): Promise<Instance | undefined>;
  getInstancesByUser(userId: number): Promise<Instance[]>;
  createInstance(instance: InsertInstance): Promise<Instance>;
  updateInstance(id: number, data: Partial<Instance>): Promise<Instance | undefined>;
  deleteInstance(id: number): Promise<boolean>;
  getAllInstances(): Promise<Instance[]>;
  
  // Chat operations
  getChat(id: number): Promise<Chat | undefined>;
  getChatByRemoteJid(instanceId: number, remoteJid: string): Promise<Chat | undefined>;
  createChat(chat: InsertChat): Promise<Chat>;
  updateChat(id: number, data: Partial<Chat>): Promise<Chat | undefined>;
  deleteChat(id: number): Promise<boolean>;
  getChatsByInstance(instanceId: number): Promise<Chat[]>;
  
  // Message operations
  getMessage(id: number): Promise<Message | undefined>;
  getMessageByMessageId(chatId: number, messageId: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: number, data: Partial<Message>): Promise<Message | undefined>;
  deleteMessage(id: number): Promise<boolean>;
  getMessagesByChat(chatId: number, limit?: number): Promise<Message[]>;
  
  // Webhook operations
  getWebhookEvent(id: number): Promise<WebhookEvent | undefined>;
  getWebhookEvents(filters?: any): Promise<WebhookEvent[]>;
  createWebhookEvent(event: InsertWebhookEvent): Promise<WebhookEvent>;
  updateWebhookEvent(id: number, data: Partial<WebhookEvent>): Promise<WebhookEvent | undefined>;
  getAllWebhookEvents(): Promise<WebhookEvent[]>;
  
  // API Key operations
  getApiKey(id: number): Promise<ApiKey | undefined>;
  getUserApiKeys(userId: number, provider?: string): Promise<ApiKey[]>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  updateApiKey(id: number, data: Partial<ApiKey>): Promise<ApiKey | undefined>;
  deleteApiKey(id: number): Promise<boolean>;
  validateApiKey(id: number): Promise<boolean>;
  
  // AI Agent operations
  getAiAgent(id: number): Promise<AiAgent | undefined>;
  getUserAiAgents(userId: number): Promise<AiAgent[]>;
  createAiAgent(agent: InsertAiAgent): Promise<AiAgent>;
  updateAiAgent(id: number, data: Partial<AiAgent>): Promise<AiAgent | undefined>;
  deleteAiAgent(id: number): Promise<boolean>;
  
  // AI Agent Document operations
  getAiAgentDocument(id: number): Promise<AiAgentDocument | undefined>;
  getAgentDocuments(agentId: number): Promise<AiAgentDocument[]>;
  createAiAgentDocument(document: InsertAiAgentDocument): Promise<AiAgentDocument>;
  updateAiAgentDocument(id: number, data: Partial<AiAgentDocument>): Promise<AiAgentDocument | undefined>;
  deleteAiAgentDocument(id: number): Promise<boolean>;
  
  // AI Agent Conversation operations
  getAiAgentConversation(id: number): Promise<AiAgentConversation | undefined>;
  getAgentConversations(agentId: number): Promise<AiAgentConversation[]>;
  createAiAgentConversation(conversation: InsertAiAgentConversation): Promise<AiAgentConversation>;
  updateAiAgentConversation(id: number, data: Partial<AiAgentConversation>): Promise<AiAgentConversation | undefined>;
  deleteAiAgentConversation(id: number): Promise<boolean>;
  
  // AI Agent Message operations
  getAiAgentMessage(id: number): Promise<AiAgentMessage | undefined>;
  getAiAgentMessages(conversationId: number): Promise<AiAgentMessage[]>;
  createAiAgentMessage(message: InsertAiAgentMessage): Promise<AiAgentMessage>;
  deleteAiAgentMessage(id: number): Promise<boolean>;
  
  // Automation operations
  getAutomation(id: number): Promise<Automation | undefined>;
  getUserAutomations(userId: number): Promise<Automation[]>;
  createAutomation(automation: InsertAutomation): Promise<Automation>;
  updateAutomation(id: number, data: Partial<Automation>): Promise<Automation | undefined>;
  deleteAutomation(id: number): Promise<boolean>;
  
  // Automation Node operations
  getAutomationNode(id: string): Promise<AutomationNode | undefined>;
  getAutomationNodes(automationId: number): Promise<AutomationNode[]>;
  createAutomationNode(node: InsertAutomationNode): Promise<AutomationNode>;
  updateAutomationNode(id: string, data: Partial<AutomationNode>): Promise<AutomationNode | undefined>;
  deleteAutomationNode(id: string): Promise<boolean>;
  
  // Automation Edge operations
  getAutomationEdge(id: string): Promise<AutomationEdge | undefined>;
  getAutomationEdges(automationId: number): Promise<AutomationEdge[]>;
  createAutomationEdge(edge: InsertAutomationEdge): Promise<AutomationEdge>;
  deleteAutomationEdge(id: string): Promise<boolean>;
  
  // Tag operations
  getContactTag(id: number): Promise<ContactTag | undefined>;
  getUserContactTags(userId: number): Promise<ContactTag[]>;
  createContactTag(tag: InsertContactTag): Promise<ContactTag>;
  updateContactTag(id: number, data: Partial<ContactTag>): Promise<ContactTag | undefined>;
  deleteContactTag(id: number): Promise<boolean>;
  getChatTags(chatId: number): Promise<ContactTag[]>;
  addTagToChat(chatId: number, tagId: number): Promise<ChatTag>;
  removeTagFromChat(chatId: number, tagId: number): Promise<boolean>;
  
  // Session store
  sessionStore: session.Store;
}

// Supabase implementation
export class SupabaseStorage implements IStorage {
  private supabase;
  public sessionStore: session.Store = new session.MemoryStore();

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    // Initialize PostgreSQL session store
    try {
      const PgStore = connectPgSimple(session);
      this.sessionStore = new PgStore({
        pool,
        createTableIfMissing: true,
        tableName: 'sessions'
      });
    } catch (err) {
      console.error('Failed to initialize PG session store, falling back to memory store:', err);
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('Error fetching user:', error);
      return undefined;
    }
    
    return data as User;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
      
    if (error) {
      console.error('Error fetching user by email:', error);
      return undefined;
    }
    
    return data as User;
  }

  async createUser(user: InsertUser): Promise<User> {
    const { data, error } = await this.supabase
      .from('users')
      .insert(user)
      .select()
      .single();
      
    if (error) {
      console.error('Error creating user:', error);
      throw new Error(`Failed to create user: ${error.message}`);
    }
    
    return data as User;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const { data, error } = await this.supabase
      .from('users')
      .update(userData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
    
    return data as User;
  }

  async deleteUser(id: number): Promise<boolean> {
    const { error } = await this.supabase
      .from('users')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Error deleting user:', error);
      return false;
    }
    
    return true;
  }

  async getAllUsers(): Promise<User[]> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
    
    return data as User[];
  }

  // Instance operations
  async getInstance(id: number): Promise<Instance | undefined> {
    const { data, error } = await this.supabase
      .from('instances')
      .select('*, user:user_id(*)')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('Error fetching instance:', error);
      return undefined;
    }
    
    return data as Instance;
  }

  async getInstanceByUser(userId: number): Promise<Instance | undefined> {
    const { data, error } = await this.supabase
      .from('instances')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      console.error('Error fetching instance by user:', error);
      return undefined;
    }
    
    return data as Instance;
  }

  async createInstance(instance: InsertInstance): Promise<Instance> {
    const { data, error } = await this.supabase
      .from('instances')
      .insert(instance)
      .select()
      .single();
      
    if (error) {
      console.error('Error creating instance:', error);
      throw new Error(`Failed to create instance: ${error.message}`);
    }
    
    return data as Instance;
  }

  async updateInstance(id: number, instanceData: Partial<Instance>): Promise<Instance | undefined> {
    const { data, error } = await this.supabase
      .from('instances')
      .update(instanceData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating instance:', error);
      return undefined;
    }
    
    return data as Instance;
  }

  async deleteInstance(id: number): Promise<boolean> {
    const { error } = await this.supabase
      .from('instances')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Error deleting instance:', error);
      return false;
    }
    
    return true;
  }

  async getAllInstances(): Promise<Instance[]> {
    const { data, error } = await this.supabase
      .from('instances')
      .select('*, user:user_id(*)')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching all instances:', error);
      return [];
    }
    
    return data as Instance[];
  }

  // Chat operations
  async getChat(id: number): Promise<Chat | undefined> {
    const { data, error } = await this.supabase
      .from('chats')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('Error fetching chat:', error);
      return undefined;
    }
    
    return data as Chat;
  }

  async getChatByRemoteJid(instanceId: number, remoteJid: string): Promise<Chat | undefined> {
    const { data, error } = await this.supabase
      .from('chats')
      .select('*')
      .eq('instance_id', instanceId)
      .eq('remote_jid', remoteJid)
      .single();
      
    if (error) {
      console.error('Error fetching chat by remote JID:', error);
      return undefined;
    }
    
    return data as Chat;
  }

  async createChat(chat: InsertChat): Promise<Chat> {
    const { data, error } = await this.supabase
      .from('chats')
      .insert(chat)
      .select()
      .single();
      
    if (error) {
      console.error('Error creating chat:', error);
      throw new Error(`Failed to create chat: ${error.message}`);
    }
    
    return data as Chat;
  }

  async updateChat(id: number, chatData: Partial<Chat>): Promise<Chat | undefined> {
    const { data, error } = await this.supabase
      .from('chats')
      .update(chatData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating chat:', error);
      return undefined;
    }
    
    return data as Chat;
  }

  async deleteChat(id: number): Promise<boolean> {
    const { error } = await this.supabase
      .from('chats')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Error deleting chat:', error);
      return false;
    }
    
    return true;
  }

  async getChatsByInstance(instanceId: number): Promise<Chat[]> {
    const { data, error } = await this.supabase
      .from('chats')
      .select('*')
      .eq('instance_id', instanceId)
      .order('last_message_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching chats by instance:', error);
      return [];
    }
    
    return data as Chat[];
  }

  // Message operations
  async getMessage(id: number): Promise<Message | undefined> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('Error fetching message:', error);
      return undefined;
    }
    
    return data as Message;
  }

  async getMessageByMessageId(chatId: number, messageId: string): Promise<Message | undefined> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .eq('message_id', messageId)
      .single();
      
    if (error) {
      console.error('Error fetching message by message ID:', error);
      return undefined;
    }
    
    return data as Message;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const { data, error } = await this.supabase
      .from('messages')
      .insert(message)
      .select()
      .single();
      
    if (error) {
      console.error('Error creating message:', error);
      throw new Error(`Failed to create message: ${error.message}`);
    }
    
    return data as Message;
  }

  async updateMessage(id: number, messageData: Partial<Message>): Promise<Message | undefined> {
    const { data, error } = await this.supabase
      .from('messages')
      .update(messageData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating message:', error);
      return undefined;
    }
    
    return data as Message;
  }

  async deleteMessage(id: number): Promise<boolean> {
    const { error } = await this.supabase
      .from('messages')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Error deleting message:', error);
      return false;
    }
    
    return true;
  }

  async getMessagesByChat(chatId: number, limit: number = 100): Promise<Message[]> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('timestamp', { ascending: true })
      .limit(limit);
      
    if (error) {
      console.error('Error fetching messages by chat:', error);
      return [];
    }
    
    return data as Message[];
  }

  // Webhook operations
  async getWebhookEvent(id: number): Promise<WebhookEvent | undefined> {
    const { data, error } = await this.supabase
      .from('webhook_events')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('Error fetching webhook event:', error);
      return undefined;
    }
    
    return data as WebhookEvent;
  }

  async createWebhookEvent(event: InsertWebhookEvent): Promise<WebhookEvent> {
    const { data, error } = await this.supabase
      .from('webhook_events')
      .insert(event)
      .select()
      .single();
      
    if (error) {
      console.error('Error creating webhook event:', error);
      throw new Error(`Failed to create webhook event: ${error.message}`);
    }
    
    return data as WebhookEvent;
  }

  async updateWebhookEvent(id: number, eventData: Partial<WebhookEvent>): Promise<WebhookEvent | undefined> {
    const { data, error } = await this.supabase
      .from('webhook_events')
      .update(eventData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating webhook event:', error);
      return undefined;
    }
    
    return data as WebhookEvent;
  }

  async getAllWebhookEvents(): Promise<WebhookEvent[]> {
    const { data, error } = await this.supabase
      .from('webhook_events')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching all webhook events:', error);
      return [];
    }
    
    return data as WebhookEvent[];
  }
}

// Memory storage implementation for development/testing
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private instances: Map<number, Instance>;
  private chats: Map<number, Chat>;
  private messages: Map<number, Message>;
  private webhookEvents: Map<number, WebhookEvent>;
  private apiKeys: Map<number, ApiKey>;
  private aiAgents: Map<number, AiAgent>;
  private aiAgentDocuments: Map<number, AiAgentDocument>;
  private aiAgentConversations: Map<number, AiAgentConversation>;
  private aiAgentMessages: Map<number, AiAgentMessage>;
  private automations: Map<number, Automation>;
  private automationNodes: Map<string, AutomationNode>;
  private automationEdges: Map<string, AutomationEdge>;
  private contactTags: Map<number, ContactTag>;
  private chatTags: Map<number, ChatTag>;
  public sessionStore: session.Store = new session.MemoryStore();
  private currentIds: {
    users: number;
    instances: number;
    chats: number;
    messages: number;
    webhookEvents: number;
    apiKeys: number;
    aiAgents: number;
    aiAgentDocuments: number;
    aiAgentConversations: number;
    aiAgentMessages: number;
    automations: number;
    contactTags: number;
    chatTags: number;
  };

  constructor() {
    this.users = new Map();
    this.instances = new Map();
    this.chats = new Map();
    this.messages = new Map();
    this.webhookEvents = new Map();
    this.apiKeys = new Map();
    this.aiAgents = new Map();
    this.aiAgentDocuments = new Map();
    this.aiAgentConversations = new Map();
    this.aiAgentMessages = new Map();
    this.automations = new Map();
    this.automationNodes = new Map();
    this.automationEdges = new Map();
    this.contactTags = new Map();
    this.chatTags = new Map();
    
    this.currentIds = {
      users: 1,
      instances: 1,
      chats: 1,
      messages: 1,
      webhookEvents: 1,
      apiKeys: 1,
      aiAgents: 1,
      aiAgentDocuments: 1,
      aiAgentConversations: 1,
      aiAgentMessages: 1,
      automations: 1,
      contactTags: 1,
      chatTags: 1
    };
    
    // Initialize in-memory session store
    import('memorystore').then(memorystore => {
      const MemoryStore = memorystore.default(session);
      this.sessionStore = new MemoryStore({
        checkPeriod: 86400000 // prune expired entries every 24h
      });
    }).catch(err => {
      console.error('Failed to initialize memory store:', err);
      this.sessionStore = new session.MemoryStore();
    });
    
    // Add admin user by default
    this.createUser({
      name: "Admin User",
      email: "admin@zapban.com",
      password: "$2a$10$T7tQ7GYJ3BEyQzIjnLbqRuK.zMWw4N3QxReTgGaYMO73yJ2h5XNZq", // bcrypt hash for "adminpass"
      role: "admin",
      active: true,
      language: "pt-BR"
    });
    
    // Add test user for development
    this.createUser({
      name: "Wellington Martins",
      email: "wellnessa13@gmail.com",
      password: "12345678", // Plain text for easy testing
      role: "user",
      active: true,
      language: "pt-BR"
    });
    
    // Adicionar chaves de API de exemplo para o usuário demo
    this.createApiKey({
      userId: 999,
      name: "OpenAI Produção",
      provider: "openai",
      key: "sk-xxxxxxxxxxxx", // Chave mascarada para segurança
      active: true
    });
    
    this.createApiKey({
      userId: 999,
      name: "OpenAI Desenvolvimento",
      provider: "openai",
      key: "sk-xxxxxxxxxxxx", // Chave mascarada para segurança
      active: false
    });
    
    // Adicionar agentes de IA de exemplo para o usuário demo
    this.createAiAgent({
      userId: 999,
      name: "Assistente de Vendas",
      description: "Responde dúvidas sobre produtos e ajuda a completar vendas.",
      model: "gpt-4o",
      temperature: 0.7,
      maxTokens: 4000,
      systemPrompt: "Você é um assistente de vendas especializado em atendimento ao cliente. Seu objetivo é ajudar clientes a encontrarem os produtos ideais e responder a suas dúvidas. Seja sempre cordial e profissional.",
      active: true
    });
    
    this.createAiAgent({
      userId: 999,
      name: "Atendente de Suporte",
      description: "Resolve problemas técnicos e dúvidas sobre o uso do produto.",
      model: "gpt-4o",
      temperature: 0.5,
      maxTokens: 2000,
      systemPrompt: "Você é um especialista em suporte técnico. Seu objetivo é ajudar os clientes a resolverem problemas com seus produtos. Mantenha suas respostas técnicas, mas acessíveis para usuários com diferentes níveis de conhecimento.",
      active: true
    });
    
    // Adicionar automações de exemplo para o usuário demo
    this.createAutomation({
      userId: 999,
      name: "Boas-vindas automáticas",
      description: "Envia uma mensagem de boas-vindas para novos contatos.",
      active: true,
      triggerType: "new_chat"
    });
    
    this.createAutomation({
      userId: 999,
      name: "Classificação de prioridade",
      description: "Classifica mensagens com base na prioridade detectada.",
      active: true,
      triggerType: "new_message"
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    // Para demonstração: aceitar o usuário de demo ID 999
    if (id === 999) {
      // Criar um usuário demo na memória para testes
      return {
        id: 999,
        name: 'Demo User',
        email: 'demo@example.com',
        username: 'demo',
        password: 'demo123', // Não importa, nunca será usado
        role: 'admin',
        active: true,
        language: 'pt-BR',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // Suporte para usuário de demonstração
    if (email === 'demo@example.com') {
      return {
        id: 999,
        name: 'Demo User',
        email: 'demo@example.com',
        username: 'demo',
        password: 'demo123', // Não importa, nunca será usado
        role: 'admin',
        active: true,
        language: 'pt-BR',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentIds.users++;
    const newUser: User = { 
      ...user, 
      id, 
      createdAt: new Date().toISOString(),
      lastLoginAt: null
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Instance operations
  async getInstance(id: number): Promise<Instance | undefined> {
    const instance = this.instances.get(id);
    if (!instance) return undefined;
    
    // Add user information
    const user = this.users.get(instance.userId);
    return { ...instance, user } as Instance;
  }

  async getInstanceByUser(userId: number): Promise<Instance | undefined> {
    return Array.from(this.instances.values()).find(
      (instance) => instance.userId === userId
    );
  }
  
  async getInstancesByUser(userId: number): Promise<Instance[]> {
    return Array.from(this.instances.values()).filter(
      instance => instance.userId === userId
    );
  }

  async createInstance(instance: InsertInstance): Promise<Instance> {
    const id = this.currentIds.instances++;
    const newInstance: Instance = { 
      ...instance, 
      id, 
      status: "disconnected",
      phoneNumber: null,
      connected: false,
      qrCode: null,
      qrCodeGeneratedAt: null,
      deviceInfo: null,
      createdAt: new Date().toISOString(),
      lastConnectedAt: null
    };
    this.instances.set(id, newInstance);
    return newInstance;
  }

  async updateInstance(id: number, instanceData: Partial<Instance>): Promise<Instance | undefined> {
    const instance = this.instances.get(id);
    if (!instance) return undefined;
    
    const updatedInstance = { ...instance, ...instanceData };
    this.instances.set(id, updatedInstance);
    return updatedInstance;
  }

  async deleteInstance(id: number): Promise<boolean> {
    return this.instances.delete(id);
  }

  async getAllInstances(): Promise<Instance[]> {
    return Array.from(this.instances.values()).map(instance => {
      const user = this.users.get(instance.userId);
      return { ...instance, user } as Instance;
    });
  }

  // Chat operations
  async getChat(id: number): Promise<Chat | undefined> {
    return this.chats.get(id);
  }

  async getChatByRemoteJid(instanceId: number, remoteJid: string): Promise<Chat | undefined> {
    return Array.from(this.chats.values()).find(
      (chat) => chat.instanceId === instanceId && chat.remoteJid === remoteJid
    );
  }

  async createChat(chat: InsertChat): Promise<Chat> {
    const id = this.currentIds.chats++;
    const newChat: Chat = { 
      ...chat, 
      id, 
      createdAt: new Date().toISOString()
    };
    this.chats.set(id, newChat);
    return newChat;
  }

  async updateChat(id: number, chatData: Partial<Chat>): Promise<Chat | undefined> {
    const chat = this.chats.get(id);
    if (!chat) return undefined;
    
    const updatedChat = { ...chat, ...chatData };
    this.chats.set(id, updatedChat);
    return updatedChat;
  }

  async deleteChat(id: number): Promise<boolean> {
    return this.chats.delete(id);
  }

  async getChatsByInstance(instanceId: number): Promise<Chat[]> {
    return Array.from(this.chats.values())
      .filter(chat => chat.instanceId === instanceId)
      .sort((a, b) => {
        // Sort by last message time, most recent first
        if (!a.lastMessageAt) return 1;
        if (!b.lastMessageAt) return -1;
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      });
  }

  // Message operations
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getMessageByMessageId(chatId: number, messageId: string): Promise<Message | undefined> {
    return Array.from(this.messages.values()).find(
      (message) => message.chatId === chatId && message.messageId === messageId
    );
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const id = this.currentIds.messages++;
    const newMessage: Message = { 
      ...message, 
      id, 
      createdAt: new Date().toISOString()
    };
    this.messages.set(id, newMessage);
    
    // Update the chat's last message time
    const chat = this.chats.get(message.chatId);
    if (chat) {
      this.updateChat(chat.id, { lastMessageAt: message.timestamp });
    }
    
    return newMessage;
  }

  async updateMessage(id: number, messageData: Partial<Message>): Promise<Message | undefined> {
    const message = this.messages.get(id);
    if (!message) return undefined;
    
    const updatedMessage = { ...message, ...messageData };
    this.messages.set(id, updatedMessage);
    return updatedMessage;
  }

  async deleteMessage(id: number): Promise<boolean> {
    return this.messages.delete(id);
  }

  async getMessagesByChat(chatId: number, limit: number = 100): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.chatId === chatId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(0, limit);
  }

  // Webhook operations
  async getWebhookEvent(id: number): Promise<WebhookEvent | undefined> {
    return this.webhookEvents.get(id);
  }

  async getWebhookEvents(filters?: any): Promise<WebhookEvent[]> {
    let events = Array.from(this.webhookEvents.values());
    
    // Aplicar filtros se fornecidos
    if (filters) {
      if (filters.platform) {
        events = events.filter(event => 
          event.platform?.toLowerCase() === filters.platform.toLowerCase()
        );
      }
      
      if (filters.paymentStatus) {
        events = events.filter(event => 
          event.paymentStatus?.toLowerCase() === filters.paymentStatus.toLowerCase()
        );
      }
      
      if (filters.buyerEmail) {
        events = events.filter(event => 
          event.buyerEmail?.toLowerCase().includes(filters.buyerEmail.toLowerCase())
        );
      }
      
      if (filters.processed !== undefined) {
        events = events.filter(event => event.processed === filters.processed);
      }
      
      if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        
        if (start) {
          const startDate = new Date(start);
          events = events.filter(event => 
            new Date(event.transactionDate).getTime() >= startDate.getTime()
          );
        }
        
        if (end) {
          const endDate = new Date(end);
          events = events.filter(event => 
            new Date(event.transactionDate).getTime() <= endDate.getTime()
          );
        }
      }
    }
    
    // Ordenar por data de criação (mais recentes primeiro)
    return events.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createWebhookEvent(event: InsertWebhookEvent): Promise<WebhookEvent> {
    const id = this.currentIds.webhookEvents++;
    const newEvent: WebhookEvent = { 
      ...event, 
      id, 
      processed: false,
      processedAt: null,
      createdAt: new Date().toISOString()
    };
    this.webhookEvents.set(id, newEvent);
    return newEvent;
  }

  async updateWebhookEvent(id: number, eventData: Partial<WebhookEvent>): Promise<WebhookEvent | undefined> {
    const event = this.webhookEvents.get(id);
    if (!event) return undefined;
    
    const updatedEvent = { ...event, ...eventData };
    this.webhookEvents.set(id, updatedEvent);
    return updatedEvent;
  }

  async getAllWebhookEvents(): Promise<WebhookEvent[]> {
    return Array.from(this.webhookEvents.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  // API Key operations
  async getApiKey(id: number): Promise<ApiKey | undefined> {
    return this.apiKeys.get(id);
  }
  
  async getUserApiKeys(userId: number, provider?: string): Promise<ApiKey[]> {
    const keys = Array.from(this.apiKeys.values()).filter(key => key.userId === userId);
    return provider ? keys.filter(key => key.provider === provider) : keys;
  }
  
  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const id = this.currentIds.apiKeys++;
    const newApiKey: ApiKey = {
      ...apiKey,
      id,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.apiKeys.set(id, newApiKey);
    return newApiKey;
  }
  
  async updateApiKey(id: number, data: Partial<ApiKey>): Promise<ApiKey | undefined> {
    const apiKey = this.apiKeys.get(id);
    if (!apiKey) return undefined;
    
    const updatedApiKey = { 
      ...apiKey, 
      ...data, 
      updatedAt: new Date().toISOString() 
    };
    this.apiKeys.set(id, updatedApiKey);
    return updatedApiKey;
  }
  
  async deleteApiKey(id: number): Promise<boolean> {
    return this.apiKeys.delete(id);
  }
  
  async validateApiKey(id: number): Promise<boolean> {
    const apiKey = await this.getApiKey(id);
    return !!apiKey && apiKey.active;
  }
  
  // AI Agent operations
  async getAiAgent(id: number): Promise<AiAgent | undefined> {
    return this.aiAgents.get(id);
  }
  
  async getUserAiAgents(userId: number): Promise<AiAgent[]> {
    return Array.from(this.aiAgents.values())
      .filter(agent => agent.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async createAiAgent(agent: InsertAiAgent): Promise<AiAgent> {
    const id = this.currentIds.aiAgents++;
    const newAgent: AiAgent = {
      ...agent,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.aiAgents.set(id, newAgent);
    return newAgent;
  }
  
  async updateAiAgent(id: number, data: Partial<AiAgent>): Promise<AiAgent | undefined> {
    const agent = this.aiAgents.get(id);
    if (!agent) return undefined;
    
    const updatedAgent = {
      ...agent,
      ...data,
      updatedAt: new Date().toISOString()
    };
    this.aiAgents.set(id, updatedAgent);
    return updatedAgent;
  }
  
  async deleteAiAgent(id: number): Promise<boolean> {
    return this.aiAgents.delete(id);
  }
  
  // AI Agent Document operations
  async getAiAgentDocument(id: number): Promise<AiAgentDocument | undefined> {
    return this.aiAgentDocuments.get(id);
  }
  
  async getAgentDocuments(agentId: number): Promise<AiAgentDocument[]> {
    return Array.from(this.aiAgentDocuments.values())
      .filter(doc => doc.agentId === agentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async createAiAgentDocument(document: InsertAiAgentDocument): Promise<AiAgentDocument> {
    const id = this.currentIds.aiAgentDocuments++;
    const newDocument: AiAgentDocument = {
      ...document,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.aiAgentDocuments.set(id, newDocument);
    return newDocument;
  }
  
  async updateAiAgentDocument(id: number, data: Partial<AiAgentDocument>): Promise<AiAgentDocument | undefined> {
    const document = this.aiAgentDocuments.get(id);
    if (!document) return undefined;
    
    const updatedDocument = {
      ...document,
      ...data,
      updatedAt: new Date().toISOString()
    };
    this.aiAgentDocuments.set(id, updatedDocument);
    return updatedDocument;
  }
  
  async deleteAiAgentDocument(id: number): Promise<boolean> {
    return this.aiAgentDocuments.delete(id);
  }
  
  // AI Agent Conversation operations
  async getAiAgentConversation(id: number): Promise<AiAgentConversation | undefined> {
    return this.aiAgentConversations.get(id);
  }
  
  async getAgentConversations(agentId: number): Promise<AiAgentConversation[]> {
    return Array.from(this.aiAgentConversations.values())
      .filter(convo => convo.agentId === agentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async createAiAgentConversation(conversation: InsertAiAgentConversation): Promise<AiAgentConversation> {
    const id = this.currentIds.aiAgentConversations++;
    const newConversation: AiAgentConversation = {
      ...conversation,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.aiAgentConversations.set(id, newConversation);
    return newConversation;
  }
  
  async updateAiAgentConversation(id: number, data: Partial<AiAgentConversation>): Promise<AiAgentConversation | undefined> {
    const conversation = this.aiAgentConversations.get(id);
    if (!conversation) return undefined;
    
    const updatedConversation = {
      ...conversation,
      ...data,
      updatedAt: new Date().toISOString()
    };
    this.aiAgentConversations.set(id, updatedConversation);
    return updatedConversation;
  }
  
  async deleteAiAgentConversation(id: number): Promise<boolean> {
    return this.aiAgentConversations.delete(id);
  }
  
  // AI Agent Message operations
  async getAiAgentMessage(id: number): Promise<AiAgentMessage | undefined> {
    return this.aiAgentMessages.get(id);
  }
  
  async getAiAgentMessages(conversationId: number): Promise<AiAgentMessage[]> {
    return Array.from(this.aiAgentMessages.values())
      .filter(msg => msg.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  
  async createAiAgentMessage(message: InsertAiAgentMessage): Promise<AiAgentMessage> {
    const id = this.currentIds.aiAgentMessages++;
    const newMessage: AiAgentMessage = {
      ...message,
      id,
      createdAt: new Date().toISOString()
    };
    this.aiAgentMessages.set(id, newMessage);
    return newMessage;
  }
  
  async deleteAiAgentMessage(id: number): Promise<boolean> {
    return this.aiAgentMessages.delete(id);
  }
  
  // Automation operations
  async getAutomation(id: number): Promise<Automation | undefined> {
    return this.automations.get(id);
  }
  
  async getUserAutomations(userId: number): Promise<Automation[]> {
    return Array.from(this.automations.values())
      .filter(automation => automation.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async createAutomation(automation: InsertAutomation): Promise<Automation> {
    const id = this.currentIds.automations++;
    const newAutomation: Automation = {
      ...automation,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.automations.set(id, newAutomation);
    return newAutomation;
  }
  
  async updateAutomation(id: number, data: Partial<Automation>): Promise<Automation | undefined> {
    const automation = this.automations.get(id);
    if (!automation) return undefined;
    
    const updatedAutomation = {
      ...automation,
      ...data,
      updatedAt: new Date().toISOString()
    };
    this.automations.set(id, updatedAutomation);
    return updatedAutomation;
  }
  
  async deleteAutomation(id: number): Promise<boolean> {
    return this.automations.delete(id);
  }
  
  // Automation Node operations
  async getAutomationNode(id: string): Promise<AutomationNode | undefined> {
    return this.automationNodes.get(id);
  }
  
  async getAutomationNodes(automationId: number): Promise<AutomationNode[]> {
    return Array.from(this.automationNodes.values())
      .filter(node => node.automationId === automationId);
  }
  
  async createAutomationNode(node: InsertAutomationNode): Promise<AutomationNode> {
    const newNode: AutomationNode = {
      ...node,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.automationNodes.set(node.id, newNode);
    return newNode;
  }
  
  async updateAutomationNode(id: string, data: Partial<AutomationNode>): Promise<AutomationNode | undefined> {
    const node = this.automationNodes.get(id);
    if (!node) return undefined;
    
    const updatedNode = {
      ...node,
      ...data,
      updatedAt: new Date().toISOString()
    };
    this.automationNodes.set(id, updatedNode);
    return updatedNode;
  }
  
  async deleteAutomationNode(id: string): Promise<boolean> {
    return this.automationNodes.delete(id);
  }
  
  // Automation Edge operations
  async getAutomationEdge(id: string): Promise<AutomationEdge | undefined> {
    return this.automationEdges.get(id);
  }
  
  async getAutomationEdges(automationId: number): Promise<AutomationEdge[]> {
    return Array.from(this.automationEdges.values())
      .filter(edge => edge.automationId === automationId);
  }
  
  async createAutomationEdge(edge: InsertAutomationEdge): Promise<AutomationEdge> {
    const newEdge: AutomationEdge = {
      ...edge,
      createdAt: new Date().toISOString()
    };
    this.automationEdges.set(edge.id, newEdge);
    return newEdge;
  }
  
  async deleteAutomationEdge(id: string): Promise<boolean> {
    return this.automationEdges.delete(id);
  }
  
  // Tag operations
  async getContactTag(id: number): Promise<ContactTag | undefined> {
    return this.contactTags.get(id);
  }
  
  async getUserContactTags(userId: number): Promise<ContactTag[]> {
    return Array.from(this.contactTags.values())
      .filter(tag => tag.userId === userId);
  }
  
  async createContactTag(tag: InsertContactTag): Promise<ContactTag> {
    const id = this.currentIds.contactTags++;
    const newTag: ContactTag = {
      ...tag,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.contactTags.set(id, newTag);
    return newTag;
  }
  
  async updateContactTag(id: number, data: Partial<ContactTag>): Promise<ContactTag | undefined> {
    const tag = this.contactTags.get(id);
    if (!tag) return undefined;
    
    const updatedTag = {
      ...tag,
      ...data,
      updatedAt: new Date().toISOString()
    };
    this.contactTags.set(id, updatedTag);
    return updatedTag;
  }
  
  async deleteContactTag(id: number): Promise<boolean> {
    return this.contactTags.delete(id);
  }
  
  async getChatTags(chatId: number): Promise<ContactTag[]> {
    const chatTagsIds = Array.from(this.chatTags.values())
      .filter(chatTag => chatTag.chatId === chatId)
      .map(chatTag => chatTag.tagId);
    
    return Array.from(this.contactTags.values())
      .filter(tag => chatTagsIds.includes(tag.id));
  }
  
  async addTagToChat(chatId: number, tagId: number): Promise<ChatTag> {
    const id = this.currentIds.chatTags++;
    const chatTag: ChatTag = {
      id,
      chatId,
      tagId,
      createdAt: new Date().toISOString()
    };
    this.chatTags.set(id, chatTag);
    return chatTag;
  }
  
  async removeTagFromChat(chatId: number, tagId: number): Promise<boolean> {
    const chatTag = Array.from(this.chatTags.values())
      .find(ct => ct.chatId === chatId && ct.tagId === tagId);
    
    if (chatTag) {
      return this.chatTags.delete(chatTag.id);
    }
    
    return false;
  }
}

// Temporariamente forçando o uso de MemStorage para garantir funcionamento
// TODO: Depois de resolver os problemas do QR code, restaurar o código abaixo:
// export const storage: IStorage = process.env.NODE_ENV === 'production' 
//   ? new SupabaseStorage() 
//   : new MemStorage();
// Força o uso do MemStorage para resolver problemas imediatos
// Comentamos a linha que usa SupabaseStorage para debugging
export const storage: IStorage = new MemStorage();
