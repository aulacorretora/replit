import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import * as z from 'zod';
import { insertAiAgentSchema, insertAiAgentConversationSchema, insertAiAgentDocumentSchema, insertAiAgentMessageSchema } from '@shared/schema';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as openai from '../services/openai';

export const aiAgentRoutes = Router();

// Middleware para verificar autenticação
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  console.log('Verificando autenticação na rota de agentes AI');
  console.log('req.user:', req.user);
  console.log('req.session.user:', req.session?.user);
  console.log('req.session.passport:', req.session?.passport);
  console.log('req.isAuthenticated():', req.isAuthenticated?.());
  
  // Verificar autenticação usando Passport.js ou session.user
  if (!req.user && !req.session?.user) {
    console.log('Usuário não autenticado na rota de AI agents');
    return res.status(401).json({ message: 'Não autorizado' });
  }
  next();
};

// Configurar multer para upload de arquivos
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = './uploads/ai-documents';
      fs.mkdir(dir, { recursive: true }, err => cb(err, dir));
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'text/plain',
      'audio/mpeg',
      'audio/wav',
      'audio/webm',
      'video/mp4',
      'video/webm'
    ];
    
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Tipo de arquivo não suportado'));
    }
    
    cb(null, true);
  }
});

// Validar API Key da OpenAI
aiAgentRoutes.post('/api/ai/validate-key', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ message: 'API key não fornecida' });
    }
    
    const isValid = await openai.validateOpenAIKey(apiKey);
    
    return res.status(200).json({ valid: isValid });
  } catch (error) {
    console.error('Erro ao validar API key:', error);
    return res.status(500).json({ message: 'Erro ao validar API key', error: error.message });
  }
});

// Criar um agente de IA
aiAgentRoutes.post('/api/ai/agents', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Obter userId de qualquer das fontes disponíveis (passport ou session)
    const userId = req.user?.id || req.session?.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Usuário não identificado na sessão' });
    }
    
    const agentData = insertAiAgentSchema.parse({
      ...req.body,
      userId
    });
    
    const agent = await storage.createAiAgent(agentData);
    
    return res.status(201).json(agent);
  } catch (error) {
    console.error('Erro ao criar agente:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    
    return res.status(500).json({ message: 'Erro ao criar agente', error: error.message });
  }
});

// Obter todos os agentes do usuário
aiAgentRoutes.get('/api/ai/agents', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Obter userId de qualquer das fontes disponíveis (passport ou session)
    const userId = req.user?.id || req.session?.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Usuário não identificado na sessão' });
    }
    
    const agents = await storage.getUserAiAgents(userId);
    
    return res.status(200).json(agents);
  } catch (error) {
    console.error('Erro ao buscar agentes:', error);
    return res.status(500).json({ message: 'Erro ao buscar agentes', error: error.message });
  }
});

// Obter um agente específico
aiAgentRoutes.get('/api/ai/agents/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user.id;
    const agentId = parseInt(req.params.id);
    
    const agent = await storage.getAiAgent(agentId);
    
    if (!agent) {
      return res.status(404).json({ message: 'Agente não encontrado' });
    }
    
    if (agent.userId !== userId) {
      return res.status(403).json({ message: 'Acesso negado a este agente' });
    }
    
    return res.status(200).json(agent);
  } catch (error) {
    console.error('Erro ao buscar agente:', error);
    return res.status(500).json({ message: 'Erro ao buscar agente', error: error.message });
  }
});

// Atualizar um agente
aiAgentRoutes.patch('/api/ai/agents/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user.id;
    const agentId = parseInt(req.params.id);
    
    const agent = await storage.getAiAgent(agentId);
    
    if (!agent) {
      return res.status(404).json({ message: 'Agente não encontrado' });
    }
    
    if (agent.userId !== userId) {
      return res.status(403).json({ message: 'Acesso negado a este agente' });
    }
    
    const updatedAgent = await storage.updateAiAgent(agentId, req.body);
    
    return res.status(200).json(updatedAgent);
  } catch (error) {
    console.error('Erro ao atualizar agente:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    
    return res.status(500).json({ message: 'Erro ao atualizar agente', error: error.message });
  }
});

// Excluir um agente
aiAgentRoutes.delete('/api/ai/agents/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user.id;
    const agentId = parseInt(req.params.id);
    
    const agent = await storage.getAiAgent(agentId);
    
    if (!agent) {
      return res.status(404).json({ message: 'Agente não encontrado' });
    }
    
    if (agent.userId !== userId) {
      return res.status(403).json({ message: 'Acesso negado a este agente' });
    }
    
    const success = await storage.deleteAiAgent(agentId);
    
    if (!success) {
      return res.status(500).json({ message: 'Erro ao excluir agente' });
    }
    
    return res.status(204).end();
  } catch (error) {
    console.error('Erro ao excluir agente:', error);
    return res.status(500).json({ message: 'Erro ao excluir agente', error: error.message });
  }
});

// Upload de documento para um agente
aiAgentRoutes.post('/api/ai/agents/:id/documents', isAuthenticated, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const userId = req.session.user.id;
    const agentId = parseInt(req.params.id);
    
    const agent = await storage.getAiAgent(agentId);
    
    if (!agent) {
      return res.status(404).json({ message: 'Agente não encontrado' });
    }
    
    if (agent.userId !== userId) {
      return res.status(403).json({ message: 'Acesso negado a este agente' });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado' });
    }
    
    const file = req.file;
    const fileType = getFileType(file.mimetype);
    
    const documentData = insertAiAgentDocumentSchema.parse({
      agentId,
      name: req.body.name || file.originalname,
      type: fileType,
      filePath: file.path
    });
    
    const document = await storage.createAiAgentDocument(documentData);
    
    // Iniciar processamento em background
    setTimeout(() => {
      openai.processAgentDocument(document.id, userId)
        .catch(err => console.error('Erro ao processar documento:', err));
    }, 100);
    
    return res.status(201).json(document);
  } catch (error) {
    console.error('Erro ao fazer upload de documento:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    
    return res.status(500).json({ message: 'Erro ao fazer upload de documento', error: error.message });
  }
});

// Listar documentos de um agente
aiAgentRoutes.get('/api/ai/agents/:id/documents', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user.id;
    const agentId = parseInt(req.params.id);
    
    const agent = await storage.getAiAgent(agentId);
    
    if (!agent) {
      return res.status(404).json({ message: 'Agente não encontrado' });
    }
    
    if (agent.userId !== userId) {
      return res.status(403).json({ message: 'Acesso negado a este agente' });
    }
    
    const documents = await storage.getAgentDocuments(agentId);
    
    return res.status(200).json(documents);
  } catch (error) {
    console.error('Erro ao listar documentos:', error);
    return res.status(500).json({ message: 'Erro ao listar documentos', error: error.message });
  }
});

// Criar uma conversa com o agente
aiAgentRoutes.post('/api/ai/agents/:id/conversations', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user.id;
    const agentId = parseInt(req.params.id);
    
    const agent = await storage.getAiAgent(agentId);
    
    if (!agent) {
      return res.status(404).json({ message: 'Agente não encontrado' });
    }
    
    if (agent.userId !== userId) {
      return res.status(403).json({ message: 'Acesso negado a este agente' });
    }
    
    const conversationData = insertAiAgentConversationSchema.parse({
      agentId,
      ...req.body
    });
    
    const conversation = await storage.createAiAgentConversation(conversationData);
    
    // Adicionar mensagem do sistema se fornecida
    if (agent.systemPrompt) {
      await storage.createAiAgentMessage({
        conversationId: conversation.id,
        role: 'system',
        content: agent.systemPrompt
      });
    }
    
    return res.status(201).json(conversation);
  } catch (error) {
    console.error('Erro ao criar conversa:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    
    return res.status(500).json({ message: 'Erro ao criar conversa', error: error.message });
  }
});

// Listar conversas de um agente
aiAgentRoutes.get('/api/ai/agents/:id/conversations', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user.id;
    const agentId = parseInt(req.params.id);
    
    const agent = await storage.getAiAgent(agentId);
    
    if (!agent) {
      return res.status(404).json({ message: 'Agente não encontrado' });
    }
    
    if (agent.userId !== userId) {
      return res.status(403).json({ message: 'Acesso negado a este agente' });
    }
    
    const conversations = await storage.getAgentConversations(agentId);
    
    return res.status(200).json(conversations);
  } catch (error) {
    console.error('Erro ao listar conversas:', error);
    return res.status(500).json({ message: 'Erro ao listar conversas', error: error.message });
  }
});

// Enviar mensagem para uma conversa e obter resposta
aiAgentRoutes.post('/api/ai/conversations/:id/messages', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user.id;
    const conversationId = parseInt(req.params.id);
    
    const conversation = await storage.getAiAgentConversation(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversa não encontrada' });
    }
    
    const agent = await storage.getAiAgent(conversation.agentId);
    
    if (!agent) {
      return res.status(404).json({ message: 'Agente não encontrado' });
    }
    
    if (agent.userId !== userId) {
      return res.status(403).json({ message: 'Acesso negado a esta conversa' });
    }
    
    const { text, useVoice = false } = req.body;
    
    if (!text) {
      return res.status(400).json({ message: 'Mensagem não fornecida' });
    }
    
    const response = await openai.getAgentResponse(
      agent.id,
      userId,
      conversationId,
      text,
      { useVoice }
    );
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    return res.status(500).json({ message: 'Erro ao enviar mensagem', error: error.message });
  }
});

// Listar mensagens de uma conversa
aiAgentRoutes.get('/api/ai/conversations/:id/messages', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user.id;
    const conversationId = parseInt(req.params.id);
    
    const conversation = await storage.getAiAgentConversation(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversa não encontrada' });
    }
    
    const agent = await storage.getAiAgent(conversation.agentId);
    
    if (!agent) {
      return res.status(404).json({ message: 'Agente não encontrado' });
    }
    
    if (agent.userId !== userId) {
      return res.status(403).json({ message: 'Acesso negado a esta conversa' });
    }
    
    const messages = await storage.getAiAgentMessages(conversationId);
    
    return res.status(200).json(messages);
  } catch (error) {
    console.error('Erro ao listar mensagens:', error);
    return res.status(500).json({ message: 'Erro ao listar mensagens', error: error.message });
  }
});

// Função auxiliar para determinar o tipo de arquivo a partir do mimetype
function getFileType(mimetype: string): string {
  if (mimetype.startsWith('image/')) {
    return 'image';
  } else if (mimetype === 'application/pdf') {
    return 'pdf';
  } else if (mimetype.startsWith('audio/')) {
    return 'audio';
  } else if (mimetype.startsWith('video/')) {
    return 'video';
  } else if (mimetype === 'text/plain') {
    return 'text';
  }
  
  throw new Error(`Tipo de arquivo não suportado: ${mimetype}`);
}