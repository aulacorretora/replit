import { Router } from 'express';
import { register, login, logout, getCurrentUser, forgotPassword, resetPassword, isAuthenticated, isAdmin } from './auth';
import { API_ROUTES } from '../lib/constants';

// Rotas de autenticação
const authRoutes = Router();
authRoutes.post('/register', register);
authRoutes.post('/login', login);
authRoutes.post('/logout', logout);
authRoutes.get('/user', getCurrentUser);
authRoutes.post('/forgot-password', forgotPassword);
authRoutes.post('/reset-password', resetPassword);

// Rotas de admin (placeholder por enquanto)
const adminRoutes = Router();
adminRoutes.use(isAuthenticated);
adminRoutes.use(isAdmin);

// Rotas de instâncias do WhatsApp
import instanceRouter from '../routes/instance';
const instanceRoutes = Router();
instanceRoutes.use(isAuthenticated);
instanceRoutes.use('/', instanceRouter);

// Rotas de chats (placeholder por enquanto)
const chatRoutes = Router();
chatRoutes.use(isAuthenticated);

// Rotas de webhooks (não requerem autenticação para receber eventos)
import { handleWebhook, getWebhookEvents, processWebhookEvent } from './webhook';
const webhookRoutes = Router();
webhookRoutes.post('/admin/webhook/:platform?', handleWebhook);
webhookRoutes.get('/admin/webhook-events', isAuthenticated, isAdmin, getWebhookEvents);
webhookRoutes.post('/admin/webhook-events/process', isAuthenticated, isAdmin, processWebhookEvent);

// Rotas de agentes de IA (placeholder por enquanto)
const aiAgentRoutes = Router();
aiAgentRoutes.use(API_ROUTES.AI_AGENTS.BASE, isAuthenticated);

// Rotas de automações (placeholder por enquanto)
const automationRoutes = Router();
automationRoutes.use(API_ROUTES.AUTOMATIONS.BASE, isAuthenticated);

// Rotas de chaves de API (placeholder por enquanto)
const apiKeyRoutes = Router();
apiKeyRoutes.use(API_ROUTES.API_KEYS.BASE, isAuthenticated);

export {
  authRoutes,
  adminRoutes,
  instanceRoutes,
  chatRoutes,
  webhookRoutes,
  aiAgentRoutes,
  automationRoutes,
  apiKeyRoutes
};