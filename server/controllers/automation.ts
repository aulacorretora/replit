import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import * as z from 'zod';
import { v4 as uuid } from 'uuid';
import { insertAutomationSchema, insertAutomationNodeSchema, insertAutomationEdgeSchema } from '@shared/schema';

export const automationRoutes = Router();

// Middleware para verificar autenticação
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Não autorizado' });
  }
  next();
};

// Criar uma automação
automationRoutes.post('/api/automations', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user.id;
    
    const automationData = insertAutomationSchema.parse({
      ...req.body,
      userId,
      draft: true,
      active: false
    });
    
    const automation = await storage.createAutomation(automationData);
    
    // Criar o nó inicial padrão (nó de inicialização)
    const startNodeId = uuid();
    const startNode = await storage.createAutomationNode({
      id: startNodeId,
      automationId: automation.id,
      type: 'text',
      name: 'Início',
      position: { x: 250, y: 100 },
      config: {
        text: 'Bem-vindo! Este é o início do seu fluxo.'
      }
    });
    
    // Atualizar a automação com o nó inicial
    const updatedAutomation = await storage.updateAutomation(automation.id, {
      startNodeId: startNodeId
    });
    
    return res.status(201).json(updatedAutomation);
  } catch (error) {
    console.error('Erro ao criar automação:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    
    return res.status(500).json({ message: 'Erro ao criar automação', error: error.message });
  }
});

// Listar todas as automações do usuário
automationRoutes.get('/api/automations', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user.id;
    
    const automations = await storage.getUserAutomations(userId);
    
    return res.status(200).json(automations);
  } catch (error) {
    console.error('Erro ao listar automações:', error);
    return res.status(500).json({ message: 'Erro ao listar automações', error: error.message });
  }
});

// Obter uma automação específica
automationRoutes.get('/api/automations/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user.id;
    const automationId = parseInt(req.params.id);
    
    const automation = await storage.getAutomation(automationId);
    
    if (!automation) {
      return res.status(404).json({ message: 'Automação não encontrada' });
    }
    
    if (automation.userId !== userId) {
      return res.status(403).json({ message: 'Acesso negado a esta automação' });
    }
    
    // Buscar nós e conexões
    const nodes = await storage.getAutomationNodes(automationId);
    const edges = await storage.getAutomationEdges(automationId);
    
    return res.status(200).json({
      ...automation,
      nodes,
      edges
    });
  } catch (error) {
    console.error('Erro ao buscar automação:', error);
    return res.status(500).json({ message: 'Erro ao buscar automação', error: error.message });
  }
});

// Atualizar uma automação
automationRoutes.patch('/api/automations/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user.id;
    const automationId = parseInt(req.params.id);
    
    const automation = await storage.getAutomation(automationId);
    
    if (!automation) {
      return res.status(404).json({ message: 'Automação não encontrada' });
    }
    
    if (automation.userId !== userId) {
      return res.status(403).json({ message: 'Acesso negado a esta automação' });
    }
    
    // Se estiver publicando, verificar se tem nós
    if (req.body.draft === false) {
      const nodes = await storage.getAutomationNodes(automationId);
      
      if (!nodes.length) {
        return res.status(400).json({ 
          message: 'Não é possível publicar uma automação sem nós' 
        });
      }
      
      // Se ativar, adicionar lastPublishedAt
      if (req.body.active === true) {
        req.body.lastPublishedAt = new Date();
      }
    }
    
    const updatedAutomation = await storage.updateAutomation(automationId, req.body);
    
    return res.status(200).json(updatedAutomation);
  } catch (error) {
    console.error('Erro ao atualizar automação:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    
    return res.status(500).json({ message: 'Erro ao atualizar automação', error: error.message });
  }
});

// Excluir uma automação
automationRoutes.delete('/api/automations/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user.id;
    const automationId = parseInt(req.params.id);
    
    const automation = await storage.getAutomation(automationId);
    
    if (!automation) {
      return res.status(404).json({ message: 'Automação não encontrada' });
    }
    
    if (automation.userId !== userId) {
      return res.status(403).json({ message: 'Acesso negado a esta automação' });
    }
    
    const success = await storage.deleteAutomation(automationId);
    
    if (!success) {
      return res.status(500).json({ message: 'Erro ao excluir automação' });
    }
    
    return res.status(204).end();
  } catch (error) {
    console.error('Erro ao excluir automação:', error);
    return res.status(500).json({ message: 'Erro ao excluir automação', error: error.message });
  }
});

// NODES E EDGES

// Criar um nó
automationRoutes.post('/api/automations/:id/nodes', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user.id;
    const automationId = parseInt(req.params.id);
    
    const automation = await storage.getAutomation(automationId);
    
    if (!automation) {
      return res.status(404).json({ message: 'Automação não encontrada' });
    }
    
    if (automation.userId !== userId) {
      return res.status(403).json({ message: 'Acesso negado a esta automação' });
    }
    
    // Verificar se está em modo rascunho
    if (!automation.draft) {
      return res.status(400).json({ 
        message: 'Não é possível modificar uma automação publicada. Clone ou desative a publicação primeiro.' 
      });
    }
    
    const nodeId = req.body.id || uuid();
    
    const nodeData = insertAutomationNodeSchema.parse({
      ...req.body,
      id: nodeId,
      automationId
    });
    
    const node = await storage.createAutomationNode(nodeData);
    
    return res.status(201).json(node);
  } catch (error) {
    console.error('Erro ao criar nó:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    
    return res.status(500).json({ message: 'Erro ao criar nó', error: error.message });
  }
});

// Atualizar um nó
automationRoutes.patch('/api/automations/:automationId/nodes/:nodeId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user.id;
    const automationId = parseInt(req.params.automationId);
    const nodeId = req.params.nodeId;
    
    const automation = await storage.getAutomation(automationId);
    
    if (!automation) {
      return res.status(404).json({ message: 'Automação não encontrada' });
    }
    
    if (automation.userId !== userId) {
      return res.status(403).json({ message: 'Acesso negado a esta automação' });
    }
    
    // Verificar se está em modo rascunho
    if (!automation.draft) {
      return res.status(400).json({ 
        message: 'Não é possível modificar uma automação publicada. Clone ou desative a publicação primeiro.' 
      });
    }
    
    const node = await storage.getAutomationNode(nodeId);
    
    if (!node) {
      return res.status(404).json({ message: 'Nó não encontrado' });
    }
    
    if (node.automationId !== automationId) {
      return res.status(403).json({ message: 'Nó não pertence a esta automação' });
    }
    
    const updatedNode = await storage.updateAutomationNode(nodeId, req.body);
    
    return res.status(200).json(updatedNode);
  } catch (error) {
    console.error('Erro ao atualizar nó:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    
    return res.status(500).json({ message: 'Erro ao atualizar nó', error: error.message });
  }
});

// Excluir um nó
automationRoutes.delete('/api/automations/:automationId/nodes/:nodeId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user.id;
    const automationId = parseInt(req.params.automationId);
    const nodeId = req.params.nodeId;
    
    const automation = await storage.getAutomation(automationId);
    
    if (!automation) {
      return res.status(404).json({ message: 'Automação não encontrada' });
    }
    
    if (automation.userId !== userId) {
      return res.status(403).json({ message: 'Acesso negado a esta automação' });
    }
    
    // Verificar se está em modo rascunho
    if (!automation.draft) {
      return res.status(400).json({ 
        message: 'Não é possível modificar uma automação publicada. Clone ou desative a publicação primeiro.' 
      });
    }
    
    const node = await storage.getAutomationNode(nodeId);
    
    if (!node) {
      return res.status(404).json({ message: 'Nó não encontrado' });
    }
    
    if (node.automationId !== automationId) {
      return res.status(403).json({ message: 'Nó não pertence a esta automação' });
    }
    
    // Verificar se é o nó inicial
    if (automation.startNodeId === nodeId) {
      return res.status(400).json({ message: 'Não é possível excluir o nó inicial da automação' });
    }
    
    const success = await storage.deleteAutomationNode(nodeId);
    
    if (!success) {
      return res.status(500).json({ message: 'Erro ao excluir nó' });
    }
    
    return res.status(204).end();
  } catch (error) {
    console.error('Erro ao excluir nó:', error);
    return res.status(500).json({ message: 'Erro ao excluir nó', error: error.message });
  }
});

// Criar uma conexão entre nós
automationRoutes.post('/api/automations/:id/edges', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user.id;
    const automationId = parseInt(req.params.id);
    
    const automation = await storage.getAutomation(automationId);
    
    if (!automation) {
      return res.status(404).json({ message: 'Automação não encontrada' });
    }
    
    if (automation.userId !== userId) {
      return res.status(403).json({ message: 'Acesso negado a esta automação' });
    }
    
    // Verificar se está em modo rascunho
    if (!automation.draft) {
      return res.status(400).json({ 
        message: 'Não é possível modificar uma automação publicada. Clone ou desative a publicação primeiro.' 
      });
    }
    
    const { sourceId, targetId } = req.body;
    
    // Verificar se os nós existem
    const sourceNode = await storage.getAutomationNode(sourceId);
    const targetNode = await storage.getAutomationNode(targetId);
    
    if (!sourceNode || !targetNode) {
      return res.status(404).json({ message: 'Nó de origem ou destino não encontrado' });
    }
    
    if (sourceNode.automationId !== automationId || targetNode.automationId !== automationId) {
      return res.status(403).json({ 
        message: 'Os nós de origem e destino devem pertencer à mesma automação' 
      });
    }
    
    const edgeId = req.body.id || uuid();
    
    const edgeData = insertAutomationEdgeSchema.parse({
      ...req.body,
      id: edgeId,
      automationId
    });
    
    const edge = await storage.createAutomationEdge(edgeData);
    
    return res.status(201).json(edge);
  } catch (error) {
    console.error('Erro ao criar conexão:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    
    return res.status(500).json({ message: 'Erro ao criar conexão', error: error.message });
  }
});

// Excluir uma conexão
automationRoutes.delete('/api/automations/:automationId/edges/:edgeId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user.id;
    const automationId = parseInt(req.params.automationId);
    const edgeId = req.params.edgeId;
    
    const automation = await storage.getAutomation(automationId);
    
    if (!automation) {
      return res.status(404).json({ message: 'Automação não encontrada' });
    }
    
    if (automation.userId !== userId) {
      return res.status(403).json({ message: 'Acesso negado a esta automação' });
    }
    
    // Verificar se está em modo rascunho
    if (!automation.draft) {
      return res.status(400).json({ 
        message: 'Não é possível modificar uma automação publicada. Clone ou desative a publicação primeiro.' 
      });
    }
    
    const edge = await storage.getAutomationEdge(edgeId);
    
    if (!edge) {
      return res.status(404).json({ message: 'Conexão não encontrada' });
    }
    
    if (edge.automationId !== automationId) {
      return res.status(403).json({ message: 'Conexão não pertence a esta automação' });
    }
    
    const success = await storage.deleteAutomationEdge(edgeId);
    
    if (!success) {
      return res.status(500).json({ message: 'Erro ao excluir conexão' });
    }
    
    return res.status(204).end();
  } catch (error) {
    console.error('Erro ao excluir conexão:', error);
    return res.status(500).json({ message: 'Erro ao excluir conexão', error: error.message });
  }
});

// Clonar uma automação
automationRoutes.post('/api/automations/:id/clone', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user.id;
    const automationId = parseInt(req.params.id);
    
    const automation = await storage.getAutomation(automationId);
    
    if (!automation) {
      return res.status(404).json({ message: 'Automação não encontrada' });
    }
    
    if (automation.userId !== userId) {
      return res.status(403).json({ message: 'Acesso negado a esta automação' });
    }
    
    // Criar nova automação com dados similares
    const newName = req.body.name || `${automation.name} (Clone)`;
    
    const newAutomation = await storage.createAutomation({
      userId,
      name: newName,
      description: automation.description,
      draft: true,
      active: false,
      instanceId: automation.instanceId,
      triggers: automation.triggers,
      tags: automation.tags
    });
    
    // Obter nós e conexões da automação original
    const nodes = await storage.getAutomationNodes(automationId);
    const edges = await storage.getAutomationEdges(automationId);
    
    // Mapear IDs antigos para novos
    const nodeIdMap = new Map<string, string>();
    
    // Clonar nós
    for (const node of nodes) {
      const newNodeId = uuid();
      nodeIdMap.set(node.id, newNodeId);
      
      await storage.createAutomationNode({
        id: newNodeId,
        automationId: newAutomation.id,
        type: node.type,
        name: node.name,
        config: node.config,
        position: node.position,
        nextNodeId: node.nextNodeId ? nodeIdMap.get(node.nextNodeId) : undefined
      });
    }
    
    // Clonar conexões
    for (const edge of edges) {
      const newSourceId = nodeIdMap.get(edge.sourceId);
      const newTargetId = nodeIdMap.get(edge.targetId);
      
      if (newSourceId && newTargetId) {
        await storage.createAutomationEdge({
          id: uuid(),
          automationId: newAutomation.id,
          sourceId: newSourceId,
          targetId: newTargetId,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          label: edge.label,
          condition: edge.condition
        });
      }
    }
    
    // Atualizar o nó inicial
    if (automation.startNodeId) {
      const newStartNodeId = nodeIdMap.get(automation.startNodeId);
      
      if (newStartNodeId) {
        await storage.updateAutomation(newAutomation.id, {
          startNodeId: newStartNodeId
        });
      }
    }
    
    // Buscar a automação atualizada
    const clonedAutomation = await storage.getAutomation(newAutomation.id);
    
    return res.status(201).json(clonedAutomation);
  } catch (error) {
    console.error('Erro ao clonar automação:', error);
    return res.status(500).json({ message: 'Erro ao clonar automação', error: error.message });
  }
});