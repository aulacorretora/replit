import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, pgEnum, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"),
  active: boolean("active").notNull().default(true),
  language: text("language").notNull().default("pt-BR"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLoginAt: true,
});

// WhatsApp Instances
export const instances = pgTable("instances", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  usersUuid: text("users_uuid"), // UUID do usuário do Supabase Auth
  name: text("name").notNull(),
  status: text("status").notNull().default("disconnected"),
  phoneNumber: text("phone_number"),
  connected: boolean("connected").notNull().default(false),
  qrCode: text("qr_code"),
  qrCodeGeneratedAt: timestamp("qr_code_generated_at"),
  deviceInfo: jsonb("device_info"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastConnectedAt: timestamp("last_connected_at"),
  lastError: text("last_error"),
});

export const insertInstanceSchema = createInsertSchema(instances).omit({
  id: true,
  createdAt: true,
  lastConnectedAt: true,
  qrCode: true,
  qrCodeGeneratedAt: true, 
  deviceInfo: true,
  connected: true,
  phoneNumber: true,
});

// Chats/Conversations
export const chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  instanceId: integer("instance_id").notNull().references(() => instances.id, { onDelete: "cascade" }),
  remoteJid: text("remote_jid").notNull(),
  name: text("name"),
  lastMessageAt: timestamp("last_message_at"),
  unreadCount: integer("unread_count").notNull().default(0),
  profilePicture: text("profile_picture"),
  pushName: text("push_name"),
  status: text("status"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertChatSchema = createInsertSchema(chats).omit({
  id: true,
  createdAt: true,
});

// Messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
  instanceId: integer("instance_id").notNull().references(() => instances.id, { onDelete: "cascade" }),
  messageId: text("message_id").notNull(),
  remoteJid: text("remote_jid").notNull(),
  fromMe: boolean("from_me").notNull(),
  type: text("type").notNull(),
  content: text("content"),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"),
  status: text("status").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

// Webhook Events
export const webhookEvents = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull().default('hotmart'), // hotmart, kiwify, etc
  transactionId: text("transaction_id").notNull(),
  buyerEmail: text("buyer_email").notNull(),
  productName: text("product_name").notNull(),
  paymentStatus: text("payment_status").notNull(),
  transactionDate: timestamp("transaction_date").notNull(),
  planType: text("plan_type").notNull(), // ilimitado, 3 instâncias, etc
  secretToken: text("secret_token"),
  userId: integer("user_id").references(() => users.id),
  payload: jsonb("payload").notNull(),
  processed: boolean("processed").notNull().default(false),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({
  id: true,
  createdAt: true,
  processedAt: true,
  userId: true,
});

// ========= API KEYS DOS USUÁRIOS =========

// API Keys for users
export const apiKeyProviderEnum = pgEnum('api_key_provider', [
  'openai',
  'google',
  'azure',
  'anthropic',
  'elevenlabs',
  'custom'
]);

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: apiKeyProviderEnum("provider").notNull(),
  name: text("name").notNull(),
  key: text("key").notNull(),
  active: boolean("active").notNull().default(true),
  validated: boolean("validated").notNull().default(false),
  validatedAt: timestamp("validated_at"),
  settings: jsonb("settings").default({}),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  validatedAt: true,
  lastUsedAt: true,
  validated: true,
});

// ========= AGENTE HUMANIZADO (IA) =========

export const agentToneEnum = pgEnum('agent_tone', [
  'informal', 
  'formal', 
  'empático', 
  'vendedor', 
  'técnico', 
  'educacional'
]);

export const agentObjectiveEnum = pgEnum('agent_objective', [
  'suporte', 
  'vendas', 
  'onboarding', 
  'retenção', 
  'educação', 
  'geral'
]);

// AI Agents
export const aiAgents = pgTable("ai_agents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  tone: agentToneEnum("tone").notNull().default('informal'),
  objective: agentObjectiveEnum("objective").notNull().default('geral'),
  systemPrompt: text("system_prompt").notNull(),
  knowledgeBase: boolean("knowledge_base").notNull().default(false),
  active: boolean("active").notNull().default(true),
  temperature: numeric("temperature", { precision: 3, scale: 2 }).notNull().default('0.7'),
  maxTokens: integer("max_tokens").notNull().default(2048),
  model: text("model").notNull().default('gpt-4o'),
  voiceEnabled: boolean("voice_enabled").notNull().default(false),
  voiceModel: text("voice_model").default('alloy'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAiAgentSchema = createInsertSchema(aiAgents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// AI Agent Documents
export const aiAgentDocuments = pgTable("ai_agent_documents", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull().references(() => aiAgents.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // pdf, image, text, audio, video
  content: text("content"),
  filePath: text("file_path"),
  processed: boolean("processed").notNull().default(false),
  processingError: text("processing_error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const insertAiAgentDocumentSchema = createInsertSchema(aiAgentDocuments).omit({
  id: true,
  createdAt: true,
  processedAt: true,
  processed: true,
  processingError: true,
});

// AI Agent Conversations
export const aiAgentConversations = pgTable("ai_agent_conversations", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull().references(() => aiAgents.id, { onDelete: "cascade" }),
  instanceId: integer("instance_id").references(() => instances.id, { onDelete: "set null" }),
  chatId: integer("chat_id").references(() => chats.id, { onDelete: "set null" }),
  active: boolean("active").notNull().default(true),
  metadata: jsonb("metadata"),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAiAgentConversationSchema = createInsertSchema(aiAgentConversations).omit({
  id: true,
  createdAt: true,
  lastMessageAt: true,
});

// AI Agent Messages
export const aiAgentMessages = pgTable("ai_agent_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => aiAgentConversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // user, assistant, system
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  messageId: text("whatsapp_message_id"), // Não vamos usar referência direta para evitar problemas com tipos
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAiAgentMessageSchema = createInsertSchema(aiAgentMessages).omit({
  id: true,
  createdAt: true,
});

// ========= AUTOMAÇÕES (CANVAS / FLOW BUILDER) =========

export const flowNodeTypes = pgEnum('flow_node_type', [
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
]);

// Automations
export const automations = pgTable("automations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  active: boolean("active").notNull().default(false),
  draft: boolean("draft").notNull().default(true),
  instanceId: integer("instance_id").references(() => instances.id, { onDelete: "set null" }),
  startNodeId: varchar("start_node_id", { length: 36 }),
  triggers: jsonb("triggers").default({}),
  tags: jsonb("tags").default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastPublishedAt: timestamp("last_published_at"),
});

export const insertAutomationSchema = createInsertSchema(automations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastPublishedAt: true,
});

// Automation Nodes
export const automationNodes = pgTable("automation_nodes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  automationId: integer("automation_id").notNull().references(() => automations.id, { onDelete: "cascade" }),
  type: flowNodeTypes("type").notNull(),
  name: text("name").notNull(),
  config: jsonb("config").notNull(),
  position: jsonb("position").notNull(),
  nextNodeId: varchar("next_node_id", { length: 36 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAutomationNodeSchema = createInsertSchema(automationNodes).omit({
  createdAt: true,
  updatedAt: true,
});

// Automation Edges (connections between nodes)
export const automationEdges = pgTable("automation_edges", {
  id: varchar("id", { length: 36 }).primaryKey(),
  automationId: integer("automation_id").notNull().references(() => automations.id, { onDelete: "cascade" }),
  sourceId: varchar("source_id", { length: 36 }).notNull().references(() => automationNodes.id, { onDelete: "cascade" }),
  targetId: varchar("target_id", { length: 36 }).notNull().references(() => automationNodes.id, { onDelete: "cascade" }),
  sourceHandle: text("source_handle"),
  targetHandle: text("target_handle"),
  label: text("label"),
  condition: jsonb("condition"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAutomationEdgeSchema = createInsertSchema(automationEdges).omit({
  createdAt: true,
  updatedAt: true,
});

// Automation Executions
export const automationExecutions = pgTable("automation_executions", {
  id: serial("id").primaryKey(),
  automationId: integer("automation_id").notNull().references(() => automations.id, { onDelete: "cascade" }),
  chatId: integer("chat_id").references(() => chats.id, { onDelete: "set null" }),
  instanceId: integer("instance_id").references(() => instances.id, { onDelete: "set null" }),
  status: text("status").notNull(), // started, running, completed, failed, stopped
  currentNodeId: varchar("current_node_id", { length: 36 }).references(() => automationNodes.id, { onDelete: "set null" }),
  variables: jsonb("variables"),
  metadata: jsonb("metadata"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  error: text("error"),
});

export const insertAutomationExecutionSchema = createInsertSchema(automationExecutions).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

// Automation Execution Logs
export const automationExecutionLogs = pgTable("automation_execution_logs", {
  id: serial("id").primaryKey(),
  executionId: integer("execution_id").notNull().references(() => automationExecutions.id, { onDelete: "cascade" }),
  nodeId: varchar("node_id", { length: 36 }).references(() => automationNodes.id, { onDelete: "set null" }),
  status: text("status").notNull(), // started, completed, failed, skipped
  details: jsonb("details"),
  error: text("error"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertAutomationExecutionLogSchema = createInsertSchema(automationExecutionLogs).omit({
  id: true,
  timestamp: true,
});

// Tags for contacts
export const contactTags = pgTable("contact_tags", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default('#6366F1'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertContactTagSchema = createInsertSchema(contactTags).omit({
  id: true,
  createdAt: true,
});

// Contact Tag Relations
export const chatTags = pgTable("chat_tags", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => contactTags.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertChatTagSchema = createInsertSchema(chatTags).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Instance = typeof instances.$inferSelect;
export type InsertInstance = z.infer<typeof insertInstanceSchema>;

export type Chat = typeof chats.$inferSelect;
export type InsertChat = z.infer<typeof insertChatSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;

// AI Agent Types
export type AiAgent = typeof aiAgents.$inferSelect;
export type InsertAiAgent = z.infer<typeof insertAiAgentSchema>;

export type AiAgentDocument = typeof aiAgentDocuments.$inferSelect;
export type InsertAiAgentDocument = z.infer<typeof insertAiAgentDocumentSchema>;

export type AiAgentConversation = typeof aiAgentConversations.$inferSelect;
export type InsertAiAgentConversation = z.infer<typeof insertAiAgentConversationSchema>;

export type AiAgentMessage = typeof aiAgentMessages.$inferSelect;
export type InsertAiAgentMessage = z.infer<typeof insertAiAgentMessageSchema>;

// Automation Types
export type Automation = typeof automations.$inferSelect;
export type InsertAutomation = z.infer<typeof insertAutomationSchema>;

export type AutomationNode = typeof automationNodes.$inferSelect;
export type InsertAutomationNode = z.infer<typeof insertAutomationNodeSchema>;

export type AutomationEdge = typeof automationEdges.$inferSelect;
export type InsertAutomationEdge = z.infer<typeof insertAutomationEdgeSchema>;

export type AutomationExecution = typeof automationExecutions.$inferSelect;
export type InsertAutomationExecution = z.infer<typeof insertAutomationExecutionSchema>;

export type AutomationExecutionLog = typeof automationExecutionLogs.$inferSelect;
export type InsertAutomationExecutionLog = z.infer<typeof insertAutomationExecutionLogSchema>;

export type ContactTag = typeof contactTags.$inferSelect;
export type InsertContactTag = z.infer<typeof insertContactTagSchema>;

export type ChatTag = typeof chatTags.$inferSelect;
export type InsertChatTag = z.infer<typeof insertChatTagSchema>;

// ========= GRUPOS DE WHATSAPP =========

// Groups
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  instanceId: integer("instance_id").notNull().references(() => instances.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  groupJid: text("group_jid").notNull(),
  photoUrl: text("photo_url"),
  createdBy: text("created_by").notNull(), // "user" ou "whatsapp" (se foi criado pelo usuário via app ou detectado)
  memberCount: integer("member_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  memberCount: true,
});

// Group Members
export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  memberJid: text("member_jid").notNull(),
  name: text("name"),
  isAdmin: boolean("is_admin").notNull().default(false),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  lastActiveAt: timestamp("last_active_at"),
});

export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({
  id: true,
  joinedAt: true,
  lastActiveAt: true,
});

// Group Messages (scheduled posts)
export const groupMessages = pgTable("group_messages", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("text"), // text, image, audio, video, document, poll
  content: text("content"),
  mediaUrl: text("media_url"),
  scheduledFor: timestamp("scheduled_for"),
  status: text("status").notNull().default("pending"), // pending, sent, failed
  isAutomated: boolean("is_automated").notNull().default(false),
  aiGenerated: boolean("ai_generated").notNull().default(false),
  agentId: integer("agent_id").references(() => aiAgents.id, { onDelete: "set null" }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  sentAt: timestamp("sent_at"),
  error: text("error"),
});

export const insertGroupMessageSchema = createInsertSchema(groupMessages).omit({
  id: true,
  createdAt: true,
  sentAt: true,
  error: true,
});

// Group Settings
export const groupSettings = pgTable("group_settings", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  autoReplyEnabled: boolean("auto_reply_enabled").notNull().default(false),
  autoReplyAgentId: integer("auto_reply_agent_id").references(() => aiAgents.id, { onDelete: "set null" }),
  autoSplitEnabled: boolean("auto_split_enabled").notNull().default(false),
  splitThreshold: integer("split_threshold").notNull().default(240), // Quantidade de membros para criar grupo automaticamente
  newGroupNameTemplate: text("new_group_name_template"), // Template para nome de novos grupos (ex: "{nome} - Parte {numero}")
  welcomeMessageEnabled: boolean("welcome_message_enabled").notNull().default(false),
  welcomeMessage: text("welcome_message"),
  rulesMessageEnabled: boolean("rules_message_enabled").notNull().default(false),
  rulesMessage: text("rules_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertGroupSettingSchema = createInsertSchema(groupSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Group Statistics
export const groupStatistics = pgTable("group_statistics", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull().defaultNow(),
  memberCount: integer("member_count").notNull().default(0),
  messageCount: integer("message_count").notNull().default(0),
  activeMembers: integer("active_members").notNull().default(0),
  linkClicks: integer("link_clicks").notNull().default(0),
  mediaShares: integer("media_shares").notNull().default(0),
  metadata: jsonb("metadata").default({}),
});

export const insertGroupStatisticSchema = createInsertSchema(groupStatistics).omit({
  id: true,
});

// Types for Groups
export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;

export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;

export type GroupMessage = typeof groupMessages.$inferSelect;
export type InsertGroupMessage = z.infer<typeof insertGroupMessageSchema>;

export type GroupSetting = typeof groupSettings.$inferSelect;
export type InsertGroupSetting = z.infer<typeof insertGroupSettingSchema>;

export type GroupStatistic = typeof groupStatistics.$inferSelect;
export type InsertGroupStatistic = z.infer<typeof insertGroupStatisticSchema>;

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
