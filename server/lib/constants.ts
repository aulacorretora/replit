// Códigos de status HTTP
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

// Tipos de erro
export const ERROR_TYPES = {
  VALIDATION_ERROR: 'validation_error',
  AUTH_ERROR: 'authentication_error',
  PERMISSION_ERROR: 'permission_error',
  NOT_FOUND_ERROR: 'not_found_error',
  DUPLICATED_ERROR: 'duplicated_error',
  SERVER_ERROR: 'server_error',
  DATABASE_ERROR: 'database_error',
  API_ERROR: 'api_error',
};

// Rotas da API
export const API_ROUTES = {
  // Auth
  AUTH: {
    BASE: '/api/auth',
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    USER: '/api/auth/user',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
  },
  
  // Instances
  INSTANCES: {
    BASE: '/api/instances',
    DETAIL: (id: number) => `/api/instances/${id}`,
    CONNECT: (id: number) => `/api/instances/${id}/connect`,
    DISCONNECT: (id: number) => `/api/instances/${id}/disconnect`,
    QRCODE: (id: number) => `/api/instances/${id}/qrcode`,
    INFO: (id: number) => `/api/instances/${id}/info`,
    STATUS: (id: number) => `/api/instances/${id}/status`,
  },
  
  // Chats
  CHATS: {
    BASE: '/api/chats',
    DETAIL: (id: number) => `/api/chats/${id}`,
    INSTANCE_CHATS: (instanceId: number) => `/api/instances/${instanceId}/chats`,
    TAGS: (id: number) => `/api/chats/${id}/tags`,
    ADD_TAG: (id: number) => `/api/chats/${id}/tags/add`,
    REMOVE_TAG: (id: number, tagId: number) => `/api/chats/${id}/tags/${tagId}/remove`,
  },
  
  // Messages
  MESSAGES: {
    BASE: '/api/messages',
    CHAT_MESSAGES: (chatId: number) => `/api/chats/${chatId}/messages`,
    SEND_MESSAGE: '/api/messages/send',
    SEND_FILE: '/api/messages/send-file',
    SEND_AUDIO: '/api/messages/send-audio',
  },
  
  // Tags
  TAGS: {
    BASE: '/api/tags',
    DETAIL: (id: number) => `/api/tags/${id}`,
    USER_TAGS: '/api/tags/user',
  },
  
  // AI Agents
  AI_AGENTS: {
    BASE: '/api/ai-agents',
    DETAIL: (id: number) => `/api/ai-agents/${id}`,
    DOCUMENTS: (id: number) => `/api/ai-agents/${id}/documents`,
    DOCUMENT: (id: number, docId: number) => `/api/ai-agents/${id}/documents/${docId}`,
    CONVERSATIONS: (id: number) => `/api/ai-agents/${id}/conversations`,
    CONVERSATION: (id: number, convId: number) => `/api/ai-agents/${id}/conversations/${convId}`,
    MESSAGES: (id: number, convId: number) => `/api/ai-agents/${id}/conversations/${convId}/messages`,
    ASK: (id: number) => `/api/ai-agents/${id}/ask`,
  },
  
  // API Keys
  API_KEYS: {
    BASE: '/api/api-keys',
    DETAIL: (id: number) => `/api/api-keys/${id}`,
    BY_PROVIDER: (provider: string) => `/api/api-keys/provider/${provider}`,
    VALIDATE: (id: number) => `/api/api-keys/${id}/validate`,
  },
  
  // Automations
  AUTOMATIONS: {
    BASE: '/api/automations',
    DETAIL: (id: number) => `/api/automations/${id}`,
    NODES: (id: number) => `/api/automations/${id}/nodes`,
    NODE: (id: number, nodeId: string) => `/api/automations/${id}/nodes/${nodeId}`,
    EDGES: (id: number) => `/api/automations/${id}/edges`,
    EDGE: (id: number, edgeId: string) => `/api/automations/${id}/edges/${edgeId}`,
    EXECUTE: (id: number) => `/api/automations/${id}/execute`,
  },
  
  // Admin
  ADMIN: {
    BASE: '/api/admin',
    USERS: '/api/admin/users',
    USER: (id: number) => `/api/admin/users/${id}`,
    INSTANCES: '/api/admin/instances',
    INSTANCE: (id: number) => `/api/admin/instances/${id}`,
    WEBHOOKS: '/api/admin/webhooks',
    WEBHOOK: (id: number) => `/api/admin/webhooks/${id}`,
  },
  
  // Analytics
  ANALYTICS: {
    BASE: '/api/analytics',
    SUMMARY: '/api/analytics/summary',
    MESSAGES: '/api/analytics/messages',
    USAGE: '/api/analytics/usage',
  },

  // Webhook
  WEBHOOKS: {
    BASE: '/api/webhooks',
    REGISTER: '/api/webhooks/register',
    BAILEYS: '/api/webhooks/baileys',
  },
  
  // Other
  HEALTH: '/api/health',
  WS_TEST: '/api/ws-test',
};