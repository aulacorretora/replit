import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import * as z from 'zod';
import { insertApiKeySchema } from '@shared/schema';
import * as openai from '../services/openai';

export const apiKeyRoutes = Router();

// Middleware para verificar autenticação
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  // Verifica autenticação por diferentes métodos
  if ((!req.user && !req.session?.user) || (req.session && !req.session.passport?.user)) {
    console.log('API Keys: Usuário não autenticado');
    return res.status(401).json({ message: 'Não autorizado' });
  }
  
  // Inicializa req.session.user se não existir, mas req.user existir
  if (!req.session.user && req.user) {
    console.log('API Keys: Inicializando req.session.user a partir de req.user');
    req.session.user = req.user;
  }
  
  next();
};

// Listar todas as chaves de API do usuário
apiKeyRoutes.get('/api/user/api-keys', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user.id;
    
    const apiKeys = await storage.getUserApiKeys(userId);
    
    // Ocultar as chaves reais nos resultados
    const safeApiKeys = apiKeys.map(key => {
      // Retornar apenas os primeiros e últimos 4 caracteres da chave
      let maskedKey = '';
      if (key.key && key.key.length > 8) {
        maskedKey = `${key.key.substring(0, 4)}...${key.key.substring(key.key.length - 4)}`;
      } else {
        maskedKey = '****...****';
      }
      
      return {
        ...key,
        key: maskedKey
      };
    });
    
    return res.status(200).json(safeApiKeys);
  } catch (error) {
    console.error('Erro ao listar chaves de API:', error);
    return res.status(500).json({ message: 'Erro ao listar chaves de API', error: error.message });
  }
});

// Obter uma chave de API específica
apiKeyRoutes.get('/api/user/api-keys/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user.id;
    const keyId = parseInt(req.params.id);
    
    const apiKey = await storage.getApiKey(keyId);
    
    if (!apiKey) {
      return res.status(404).json({ message: 'Chave de API não encontrada' });
    }
    
    // Verificar se a chave pertence ao usuário
    if (apiKey.userId !== userId) {
      return res.status(403).json({ message: 'Acesso negado a esta chave de API' });
    }
    
    // Ocultar a chave real no resultado
    let maskedKey = '';
    if (apiKey.key && apiKey.key.length > 8) {
      maskedKey = `${apiKey.key.substring(0, 4)}...${apiKey.key.substring(apiKey.key.length - 4)}`;
    } else {
      maskedKey = '****...****';
    }
    
    const safeApiKey = {
      ...apiKey,
      key: maskedKey
    };
    
    return res.status(200).json(safeApiKey);
  } catch (error) {
    console.error('Erro ao obter chave de API:', error);
    return res.status(500).json({ message: 'Erro ao obter chave de API', error: error.message });
  }
});

// Adicionar uma nova chave de API
apiKeyRoutes.post('/api/user/api-keys', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user.id;
    
    const { key, provider, name } = req.body;
    
    if (!key || !provider) {
      return res.status(400).json({ message: 'Chave e provedor são obrigatórios' });
    }
    
    // Validar a chave dependendo do provedor
    let isValid = false;
    
    if (provider === 'openai') {
      isValid = await openai.validateOpenAIKey(key);
      
      if (!isValid) {
        return res.status(400).json({ message: 'Chave da OpenAI inválida' });
      }
    }
    
    // Criar a chave de API
    const apiKeyData = insertApiKeySchema.parse({
      userId,
      provider,
      key,
      name: name || `Chave de ${provider}`,
      validated: isValid,
      active: true,
      lastValidatedAt: new Date(),
      createdAt: new Date()
    });
    
    const newApiKey = await storage.createApiKey(apiKeyData);
    
    // Ocultar a chave real no resultado
    let maskedKey = '';
    if (newApiKey.key && newApiKey.key.length > 8) {
      maskedKey = `${newApiKey.key.substring(0, 4)}...${newApiKey.key.substring(newApiKey.key.length - 4)}`;
    } else {
      maskedKey = '****...****';
    }
    
    const safeApiKey = {
      ...newApiKey,
      key: maskedKey
    };
    
    return res.status(201).json(safeApiKey);
  } catch (error) {
    console.error('Erro ao adicionar chave de API:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    
    return res.status(500).json({ message: 'Erro ao adicionar chave de API', error: error.message });
  }
});

// Atualizar uma chave de API
apiKeyRoutes.patch('/api/user/api-keys/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user.id;
    const keyId = parseInt(req.params.id);
    
    const apiKey = await storage.getApiKey(keyId);
    
    if (!apiKey) {
      return res.status(404).json({ message: 'Chave de API não encontrada' });
    }
    
    // Verificar se a chave pertence ao usuário
    if (apiKey.userId !== userId) {
      return res.status(403).json({ message: 'Acesso negado a esta chave de API' });
    }
    
    // Se estiver atualizando a chave, validar novamente
    if (req.body.key && req.body.key !== apiKey.key) {
      if (apiKey.provider === 'openai') {
        const isValid = await openai.validateOpenAIKey(req.body.key);
        
        if (!isValid) {
          return res.status(400).json({ message: 'Nova chave da OpenAI inválida' });
        }
        
        // Atualizar campos de validação
        req.body.validated = isValid;
        req.body.lastValidatedAt = new Date();
      }
    }
    
    // Atualizar a chave
    const updatedApiKey = await storage.updateApiKey(keyId, req.body);
    
    // Ocultar a chave real no resultado
    let maskedKey = '';
    if (updatedApiKey.key && updatedApiKey.key.length > 8) {
      maskedKey = `${updatedApiKey.key.substring(0, 4)}...${updatedApiKey.key.substring(updatedApiKey.key.length - 4)}`;
    } else {
      maskedKey = '****...****';
    }
    
    const safeApiKey = {
      ...updatedApiKey,
      key: maskedKey
    };
    
    return res.status(200).json(safeApiKey);
  } catch (error) {
    console.error('Erro ao atualizar chave de API:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    
    return res.status(500).json({ message: 'Erro ao atualizar chave de API', error: error.message });
  }
});

// Excluir uma chave de API
apiKeyRoutes.delete('/api/user/api-keys/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user.id;
    const keyId = parseInt(req.params.id);
    
    const apiKey = await storage.getApiKey(keyId);
    
    if (!apiKey) {
      return res.status(404).json({ message: 'Chave de API não encontrada' });
    }
    
    // Verificar se a chave pertence ao usuário
    if (apiKey.userId !== userId) {
      return res.status(403).json({ message: 'Acesso negado a esta chave de API' });
    }
    
    // Excluir a chave
    const success = await storage.deleteApiKey(keyId);
    
    if (!success) {
      return res.status(500).json({ message: 'Erro ao excluir chave de API' });
    }
    
    return res.status(204).end();
  } catch (error) {
    console.error('Erro ao excluir chave de API:', error);
    return res.status(500).json({ message: 'Erro ao excluir chave de API', error: error.message });
  }
});

// Verificar a validade de uma chave de API
apiKeyRoutes.post('/api/user/api-keys/:id/validate', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user.id;
    const keyId = parseInt(req.params.id);
    
    const apiKey = await storage.getApiKey(keyId);
    
    if (!apiKey) {
      return res.status(404).json({ message: 'Chave de API não encontrada' });
    }
    
    // Verificar se a chave pertence ao usuário
    if (apiKey.userId !== userId) {
      return res.status(403).json({ message: 'Acesso negado a esta chave de API' });
    }
    
    // Validar a chave dependendo do provedor
    let isValid = false;
    
    if (apiKey.provider === 'openai') {
      isValid = await openai.validateOpenAIKey(apiKey.key);
    }
    
    // Atualizar o estado de validação da chave
    await storage.updateApiKey(keyId, {
      validated: isValid,
      validatedAt: new Date()
    });
    
    return res.status(200).json({ valid: isValid });
  } catch (error) {
    console.error('Erro ao validar chave de API:', error);
    return res.status(500).json({ message: 'Erro ao validar chave de API', error: error.message });
  }
});