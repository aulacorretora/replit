import { SUPABASE_TABLES } from './supabase-tables';

// API Base URL
export const API_BASE_URL = '/api';

export { SUPABASE_TABLES };

// API Endpoints
export const API_ENDPOINTS = {
  // Auth - essas rotas já são prefixadas com /api/auth no servidor
  LOGIN: `/api/auth/login`,
  REGISTER: `/api/auth/register`,
  LOGOUT: `/api/auth/logout`,
  USER: `/api/auth/user`,
  FORGOT_PASSWORD: `/api/auth/forgot-password`,
  RESET_PASSWORD: `/api/auth/reset-password`,
  
  // Instances
  INSTANCES: `/api/instances`,
  INSTANCE: (id: number) => `/api/instances/${id}`,
  INSTANCE_QR: (id: number) => `/api/instances/${id}/qr`,
  INSTANCE_CONNECT: (id: number) => `/api/instances/${id}/connect`,
  INSTANCE_DISCONNECT: (id: number) => `/api/instances/${id}/disconnect`,
  INSTANCE_RESET: (id: number) => `/api/instances/${id}/reset`,
  INSTANCE_STATUS: (id: number) => `/api/instances/${id}/status`,
  
  // Chats
  CHATS: (instanceId: number) => `/api/instances/${instanceId}/chats`,
  CHAT: (instanceId: number, chatId: number) => `/api/instances/${instanceId}/chats/${chatId}`,
  
  // Messages
  MESSAGES: (instanceId: number, chatId: number) => `/api/instances/${instanceId}/chats/${chatId}/messages`,
  SEND_MESSAGE: (instanceId: number, chatId: number) => `/api/instances/${instanceId}/chats/${chatId}/send`,
  CHAT_MESSAGES: (chatId: number) => `/api/chats/${chatId}/messages`,
  
  // AI Agents
  AI_AGENTS: `/api/ai-agents`,
  AI_AGENT: (id: number) => `/api/ai-agents/${id}`,
  AI_AGENT_DOCUMENTS: (agentId: number) => `/api/ai-agents/${agentId}/documents`,
  AI_AGENT_DOCUMENT: (agentId: number, documentId: number) => `/api/ai-agents/${agentId}/documents/${documentId}`,
  AI_AGENT_CONVERSATIONS: (agentId: number) => `/api/ai-agents/${agentId}/conversations`,
  AI_AGENT_CONVERSATION: (agentId: number, conversationId: number) => `/api/ai-agents/${agentId}/conversations/${conversationId}`,
  AI_AGENT_CONVERSATION_MESSAGES: (agentId: number, conversationId: number) => `/api/ai-agents/${agentId}/conversations/${conversationId}/messages`,
  
  // Automations
  AUTOMATIONS: `/api/automations`,
  AUTOMATION: (id: number) => `/api/automations/${id}`,
  AUTOMATION_NODES: (automationId: number) => `/api/automations/${automationId}/nodes`,
  AUTOMATION_NODE: (automationId: number, nodeId: string) => `/api/automations/${automationId}/nodes/${nodeId}`,
  AUTOMATION_EDGES: (automationId: number) => `/api/automations/${automationId}/edges`,
  AUTOMATION_EDGE: (automationId: number, edgeId: string) => `/api/automations/${automationId}/edges/${edgeId}`,
  AUTOMATION_PUBLISH: (automationId: number) => `/api/automations/${automationId}/publish`,
  AUTOMATION_UNPUBLISH: (automationId: number) => `/api/automations/${automationId}/unpublish`,
  
  // API Keys
  API_KEYS: `/api/user/api-keys`,
  API_KEY: (id: number) => `/api/user/api-keys/${id}`,
  VALIDATE_API_KEY: (id: number) => `/api/user/api-keys/${id}/validate`,
  
  // Tags
  TAGS: `/api/tags`,
  TAG: (id: number) => `/api/tags/${id}`,
  CHAT_TAGS: (chatId: number) => `/api/chats/${chatId}/tags`,
  
  // Dashboard
  DASHBOARD_STATS: `/api/dashboard/stats`,
  DASHBOARD_ACTIVITY: `/api/dashboard/activity`,
  DASHBOARD_CHARTS: `/api/dashboard/charts`,
};

// HTTP Status
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

// Error types
export const ERROR_TYPES = {
  AUTH: 'auth',
  VALIDATION: 'validation',
  NOT_FOUND: 'not_found',
  SERVER: 'server',
  DATABASE: 'database',
  DUPLICATE: 'duplicate',
};

// Idiomas suportados
export const LANGUAGES = {
  'pt-BR': 'Português (Brasil)',
  'en': 'English',
  'es': 'Español'
};

// Eventos WebSocket
export const WS_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  MESSAGE: 'message',
  ERROR: 'error',
  USER_CONNECTED: 'user_connected',
  USER_DISCONNECTED: 'user_disconnected',
  NEW_MESSAGE: 'new_message',
  TYPING: 'typing',
  READ_RECEIPT: 'read_receipt',
  INSTANCE_CONNECTED: 'instance_connected',
  INSTANCE_DISCONNECTED: 'instance_disconnected',
  QR_RECEIVED: 'qr_received',
  PAIRING_CODE: 'pairing_code',
  LOADING: 'loading',
  INSTANCE_STATUS: 'instance_status',
  QR_CODE: 'qr_code',
  QR: 'qr',
  MESSAGE_STATUS: 'message_status'
};
