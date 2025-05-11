// API Base URL
export const API_BASE_URL = '/api';

// API Endpoints
export const API_ENDPOINTS = {
  // Auth - essas rotas já são prefixadas com /api/auth no servidor
  LOGIN: `/auth/login`,
  REGISTER: `/auth/register`,
  LOGOUT: `/auth/logout`,
  USER: `/auth/user`,
  FORGOT_PASSWORD: `/auth/forgot-password`,
  RESET_PASSWORD: `/auth/reset-password`,
  
  // Instances
  INSTANCES: `/instances`,
  INSTANCE: (id: number) => `/instances/${id}`,
  INSTANCE_QR: (id: number) => `/instances/${id}/qr`,
  INSTANCE_CONNECT: (id: number) => `/instances/${id}/connect`,
  INSTANCE_DISCONNECT: (id: number) => `/instances/${id}/disconnect`,
  INSTANCE_RESET: (id: number) => `/instances/${id}/reset`,
  INSTANCE_STATUS: (id: number) => `/instances/${id}/status`,
  
  // Chats
  CHATS: (instanceId: number) => `/instances/${instanceId}/chats`,
  CHAT: (instanceId: number, chatId: number) => `/instances/${instanceId}/chats/${chatId}`,
  
  // Messages
  MESSAGES: (instanceId: number, chatId: number) => `/instances/${instanceId}/chats/${chatId}/messages`,
  SEND_MESSAGE: (instanceId: number, chatId: number) => `/instances/${instanceId}/chats/${chatId}/send`,
  CHAT_MESSAGES: (chatId: number) => `/chats/${chatId}/messages`,
  
  // AI Agents
  AI_AGENTS: `/ai-agents`,
  AI_AGENT: (id: number) => `/ai-agents/${id}`,
  AI_AGENT_DOCUMENTS: (agentId: number) => `/ai-agents/${agentId}/documents`,
  AI_AGENT_DOCUMENT: (agentId: number, documentId: number) => `/ai-agents/${agentId}/documents/${documentId}`,
  AI_AGENT_CONVERSATIONS: (agentId: number) => `/ai-agents/${agentId}/conversations`,
  AI_AGENT_CONVERSATION: (agentId: number, conversationId: number) => `/ai-agents/${agentId}/conversations/${conversationId}`,
  AI_AGENT_CONVERSATION_MESSAGES: (agentId: number, conversationId: number) => `/ai-agents/${agentId}/conversations/${conversationId}/messages`,
  
  // Automations
  AUTOMATIONS: `/automations`,
  AUTOMATION: (id: number) => `/automations/${id}`,
  AUTOMATION_NODES: (automationId: number) => `/automations/${automationId}/nodes`,
  AUTOMATION_NODE: (automationId: number, nodeId: string) => `/automations/${automationId}/nodes/${nodeId}`,
  AUTOMATION_EDGES: (automationId: number) => `/automations/${automationId}/edges`,
  AUTOMATION_EDGE: (automationId: number, edgeId: string) => `/automations/${automationId}/edges/${edgeId}`,
  AUTOMATION_PUBLISH: (automationId: number) => `/automations/${automationId}/publish`,
  AUTOMATION_UNPUBLISH: (automationId: number) => `/automations/${automationId}/unpublish`,
  
  // API Keys
  API_KEYS: `/user/api-keys`,
  API_KEY: (id: number) => `/user/api-keys/${id}`,
  VALIDATE_API_KEY: (id: number) => `/user/api-keys/${id}/validate`,
  
  // Tags
  TAGS: `/tags`,
  TAG: (id: number) => `/tags/${id}`,
  CHAT_TAGS: (chatId: number) => `/chats/${chatId}/tags`,
  
  // Dashboard
  DASHBOARD_STATS: `/dashboard/stats`,
  DASHBOARD_ACTIVITY: `/dashboard/activity`,
  DASHBOARD_CHARTS: `/dashboard/charts`,
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
