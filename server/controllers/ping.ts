import { Request, Response } from 'express';
import { storage } from '../storage';
import { getInstanceStatus } from '../services/baileys';

export async function pingInstance(req: Request, res: Response) {
  try {
    const instanceId = parseInt(req.params.id);
    const userId = req.session.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Não autorizado' });
    }
    
    const instance = await storage.getInstance(instanceId);
    if (!instance || instance.userId !== userId) {
      return res.status(403).json({ error: 'Acesso negado a esta instância' });
    }
    
    const status = await getInstanceStatus(instanceId);
    
    if (status.connected) {
      return res.status(200).json({ 
        connected: true, 
        status: 'connected',
        message: 'Conexão WhatsApp ativa',
        phoneNumber: status.phoneNumber
      });
    } else {
      return res.status(200).json({ 
        connected: false, 
        status: status.status, 
        message: 'Conexão WhatsApp não está ativa' 
      });
    }
  } catch (error) {
    console.error('Erro ao verificar ping:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
