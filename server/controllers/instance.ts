import { Request, Response } from 'express';
import { storage } from '../storage';
import { initializeInstance, forceResetConnection, getInstanceQRCode, disconnectInstance } from '../services/baileys';
import { insertInstanceSchema } from '@shared/schema';
import { z } from 'zod';

// GET /api/instances
export const getInstances = async (req: Request, res: Response) => {
  try {
    // Get user ID from session
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }
    
    // Get instances for current user or all instances for admin
    const instances = req.user?.role === 'admin' 
      ? await storage.getAllInstances()
      : await storage.getInstancesByUser(userId);
    
    res.json(instances);
  } catch (error) {
    console.error('Error getting instances:', error);
    res.status(500).json({ message: 'Erro ao obter instâncias' });
  }
};

// GET /api/instances/:id
export const getInstance = async (req: Request, res: Response) => {
  try {
    const instanceId = parseInt(req.params.id);
    
    if (isNaN(instanceId)) {
      return res.status(400).json({ message: 'ID de instância inválido' });
    }
    
    const instance = await storage.getInstance(instanceId);
    
    if (!instance) {
      return res.status(404).json({ message: 'Instância não encontrada' });
    }
    
    // Verificar se o usuário tem acesso a essa instância
    if (req.user?.role !== 'admin' && instance.userId !== req.user?.id) {
      return res.status(403).json({ message: 'Acesso negado a esta instância' });
    }
    
    res.json(instance);
  } catch (error) {
    console.error('Error getting instance:', error);
    res.status(500).json({ message: 'Erro ao obter instância' });
  }
};

// POST /api/instances
export const createInstance = async (req: Request, res: Response) => {
  try {
    console.log('Creating instance, request body:', req.body);
    
    // Get user ID from session
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }
    
    // Validate request body
    try {
      insertInstanceSchema.parse({
        ...req.body,
        userId,
      });
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Dados de instância inválidos', 
          errors: validationError.errors 
        });
      }
    }
    
    // Create instance
    const instance = await storage.createInstance({
      ...req.body,
      userId,
      status: 'disconnected',
      connected: false,
    });
    
    console.log('Instance created:', instance);
    
    res.status(200).json(instance);
  } catch (error) {
    console.error('Error creating instance:', error);
    res.status(500).json({ message: 'Erro ao criar instância', error: String(error) });
  }
};

// DELETE /api/instances/:id
export const deleteInstance = async (req: Request, res: Response) => {
  try {
    const instanceId = parseInt(req.params.id);
    
    if (isNaN(instanceId)) {
      return res.status(400).json({ message: 'ID de instância inválido' });
    }
    
    const instance = await storage.getInstance(instanceId);
    
    if (!instance) {
      return res.status(404).json({ message: 'Instância não encontrada' });
    }
    
    // Verificar se o usuário tem acesso a essa instância
    if (req.user?.role !== 'admin' && instance.userId !== req.user?.id) {
      return res.status(403).json({ message: 'Acesso negado a esta instância' });
    }
    
    // Tenta desconectar a instância primeiro
    try {
      await disconnectInstance(instanceId);
    } catch (disconnectError) {
      console.warn(`Could not disconnect instance ${instanceId} before deletion:`, disconnectError);
      // Continue com a exclusão mesmo se a desconexão falhar
    }
    
    // Delete instance
    await storage.deleteInstance(instanceId);
    
    res.json({ message: 'Instância excluída com sucesso' });
  } catch (error) {
    console.error('Error deleting instance:', error);
    res.status(500).json({ message: 'Erro ao excluir instância' });
  }
};

import { formatQRCode } from '../utils/qrcode';

// POST /api/instances/:id/connect
export const connectInstanceHandler = async (req: Request, res: Response) => {
  try {
    const instanceId = parseInt(req.params.id);
    
    if (isNaN(instanceId)) {
      return res.status(400).json({ message: 'ID de instância inválido' });
    }
    
    const instance = await storage.getInstance(instanceId);
    
    if (!instance) {
      return res.status(404).json({ message: 'Instância não encontrada' });
    }
    
    // Verificar se o usuário tem acesso a essa instância
    if (req.user?.role !== 'admin' && instance.userId !== req.user?.id) {
      return res.status(403).json({ message: 'Acesso negado a esta instância' });
    }
    
    // Create a promise that resolves when QR code is ready
    const qrPromise = new Promise<string | null>((resolve) => {
      // Initialize WhatsApp connection with callback
      initializeInstance(
        instanceId, 
        instance.userId, 
        (qrCode) => resolve(qrCode)
      ).catch((error) => {
        console.error(`Error initializing instance ${instanceId}:`, error);
        resolve(null); // Resolve with null in case of error
      });
    });
    
    // Wait for QR code generation (with timeout)
    const qrCode = await Promise.race([
      qrPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000))
    ]);
    
    if (qrCode) {
      return res.json({ 
        success: true, 
        qrCode: formatQRCode(qrCode),
        message: 'QR code gerado com sucesso' 
      });
    } else {
      // Still return success=true but with no QR code
      return res.json({ 
        success: true, 
        message: 'Conexão iniciada, mas QR code ainda não disponível' 
      });
    }
  } catch (error) {
    console.error('Error connecting instance:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erro ao conectar instância', 
      error: String(error) 
    });
  }
};

// POST /api/instances/:id/reset
export const resetInstanceHandler = async (req: Request, res: Response) => {
  try {
    const instanceId = parseInt(req.params.id);
    
    if (isNaN(instanceId)) {
      return res.status(400).json({ message: 'ID de instância inválido' });
    }
    
    const instance = await storage.getInstance(instanceId);
    
    if (!instance) {
      return res.status(404).json({ message: 'Instância não encontrada' });
    }
    
    // Verificar se o usuário tem acesso a essa instância
    if (req.user?.role !== 'admin' && instance.userId !== req.user?.id) {
      return res.status(403).json({ message: 'Acesso negado a esta instância' });
    }
    
    // Reset WhatsApp connection and generate new QR code
    const qrCode = await forceResetConnection(instanceId, instance.userId);
    
    res.json({ 
      success: true, 
      qrCode: formatQRCode(qrCode),
      message: qrCode ? 'QR code gerado com sucesso' : 'Conexão reiniciada, mas QR code ainda não disponível'
    });
  } catch (error) {
    console.error('Error resetting instance:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erro ao reiniciar instância',
      error: String(error)
    });
  }
};

// GET /api/instances/:id/qr ou GET /api/instances/:id/qrcode
export const getQRCode = async (req: Request, res: Response) => {
  // Verificar se forceRefresh está sendo solicitado
  const forceRefresh = req.query.force === 'true';
  try {
    const instanceId = parseInt(req.params.id);
    
    if (isNaN(instanceId)) {
      return res.status(400).json({ message: 'ID de instância inválido' });
    }
    
    const instance = await storage.getInstance(instanceId);
    
    if (!instance) {
      return res.status(404).json({ message: 'Instância não encontrada' });
    }
    
    // Verificar se o usuário tem acesso a essa instância
    if (req.user?.role !== 'admin' && instance.userId !== req.user?.id) {
      return res.status(403).json({ message: 'Acesso negado a esta instância' });
    }
    
    // Verificar se precisamos forçar a atualização do QR code
    let qrCode = null;
    
    if (forceRefresh) {
      // Se for forçar atualização, tenta gerar um novo QR code
      qrCode = await forceResetConnection(instanceId, instance.userId);
      console.log(`QR code forçado para instância ${instanceId}: ${qrCode ? 'gerado' : 'falhou'}`);
    } else {
      // Caso contrário, usa o QR code existente
      qrCode = getInstanceQRCode(instanceId);
    }
    
    // Também verificar se a instância tem status 'qr_ready'
    const isQrReady = instance.status === 'qr_ready' && instance.qrCode;
    
    if (qrCode || isQrReady) {
      return res.json({ 
        qrCode: formatQRCode(qrCode || instance.qrCode), 
        timestamp: new Date().toISOString() 
      });
    } else {
      return res.status(404).json({ message: 'QR code não disponível para esta instância' });
    }
  } catch (error) {
    console.error('Error getting QR code:', error);
    res.status(500).json({ message: 'Erro ao obter QR code' });
  }
};

// POST /api/instances/:id/disconnect
export const disconnectInstanceHandler = async (req: Request, res: Response) => {
  try {
    const instanceId = parseInt(req.params.id);
    
    if (isNaN(instanceId)) {
      return res.status(400).json({ message: 'ID de instância inválido' });
    }
    
    const instance = await storage.getInstance(instanceId);
    
    if (!instance) {
      return res.status(404).json({ message: 'Instância não encontrada' });
    }
    
    // Verificar se o usuário tem acesso a essa instância
    if (req.user?.role !== 'admin' && instance.userId !== req.user?.id) {
      return res.status(403).json({ message: 'Acesso negado a esta instância' });
    }
    
    // Disconnect instance
    await disconnectInstance(instanceId);
    
    res.json({ message: 'Instância desconectada com sucesso' });
  } catch (error) {
    console.error('Error disconnecting instance:', error);
    res.status(500).json({ message: 'Erro ao desconectar instância' });
  }
};
