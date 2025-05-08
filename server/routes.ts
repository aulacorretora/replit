import express, { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from 'ws';
import { parse } from 'url';
import {
  authRoutes, 
  adminRoutes, 
  instanceRoutes, 
  chatRoutes, 
  webhookRoutes,
  aiAgentRoutes,
  automationRoutes,
  apiKeyRoutes
} from "./controllers";
import { setupBaileysWebhooks } from "./services/baileys";
import session from 'express-session';
import { setupAuth } from "./auth";

// Helper function to parse cookies from header
function parseCookies(cookieHeader: string): { [key: string]: string } {
  const cookies: { [key: string]: string } = {};
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    if (name && value) {
      cookies[name] = value;
    }
  });
  return cookies;
}

// Global WebSocket server to broadcast events to clients
export let wss: WebSocketServer;

// Global broadcast functions
global.broadcast = (type: string, payload: any) => {
  if (!wss) {
    console.warn('WebSocket server not initialized yet');
    return;
  }
  
  const message = JSON.stringify({ type, payload });
  
  // Count of clients the message was sent to
  let sentCount = 0;
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        sentCount++;
      } catch (error) {
        console.error('Error broadcasting message:', error);
      }
    }
  });
  
  console.log(`Broadcasting to all clients: ${type} (sent to ${sentCount} clients)`);
};

global.broadcastToUser = (userId: number, type: string, payload: any) => {
  if (!wss) {
    console.warn('WebSocket server not initialized yet');
    return;
  }
  
  const message = JSON.stringify({ type, payload });
  
  // Count of clients the message was sent to
  let sentCount = 0;
  
  wss.clients.forEach((client: any) => {
    // Check if the client has a userId and it matches
    if (client.readyState === WebSocket.OPEN && client.userId === userId) {
      try {
        client.send(message);
        sentCount++;
        
        // Log critical message types for debugging
        if (['qr_code', 'qr', 'qr_scanned', 'instance_status', 'instance_connected'].includes(type)) {
          console.log(`Sent '${type}' message to user ${userId}`, 
            type === 'qr_code' || type === 'qr' 
              ? { ...payload, qrCode: 'REDACTED' } 
              : payload
          );
        }
      } catch (error) {
        console.error(`Error broadcasting message to user ${userId}:`, error);
      }
    }
  });
  
  if (sentCount === 0 && ['qr_code', 'qr', 'qr_scanned', 'instance_status', 'instance_connected'].includes(type)) {
    console.warn(`No active WebSocket connection found for user ${userId} to receive ${type}`);
  } else {
    console.log(`Broadcasting to user ${userId}: ${type} (sent to ${sentCount} clients)`);
  }
};

// Local versions of the broadcast functions
export const broadcast = global.broadcast;
export const broadcastToUser = global.broadcastToUser;

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Registrar rotas para API
  app.use('/api/auth', authRoutes);  // Rotas de autenticação
  app.use('/api/admin', adminRoutes);
  app.use('/api/instances', instanceRoutes);
  app.use('/api/chats', chatRoutes);
  app.use('/api', webhookRoutes);  // Webhook routes (não requer auth)
  app.use('/api', aiAgentRoutes);  // Rotas de agentes de IA
  app.use('/api', automationRoutes); // Rotas de automação
  app.use('/api', apiKeyRoutes);   // Rotas de chaves API
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Setup WebSocket server with simpler configuration
  wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    clientTracking: true,
    // Using simpler configuration to avoid potential compression issues
    perMessageDeflate: false
  });
  
  // Handle WebSocket connections
  wss.on('connection', (ws: any, req) => {
    // Add isAlive property to identify inactive connections
    ws.isAlive = true;
    
    // Extract userId from query parameter first (most reliable method)
    try {
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      const userId = url.searchParams.get('userId');
      if (userId) {
        ws.userId = parseInt(userId, 10);
        console.log(`WebSocket connected with userId ${ws.userId} from URL parameter`);
      }
    } catch (error) {
      console.error('Error parsing URL for userId:', error);
    }
    
    // Extract session ID from cookies as backup
    if (!ws.userId) {
      try {
        const cookieString = req.headers.cookie;
        if (cookieString) {
          const cookies = parseCookies(cookieString);
          // Try both cookie names for backward compatibility
          const sessionId = cookies['connect.sid'] || cookies['zapban.sid'];
          if (sessionId) {
            // Store the session ID in the WebSocket object
            ws.sessionId = sessionId;
            console.log('WebSocket connected with session ID');
          }
        }
      } catch (error) {
        console.error('Error parsing cookies:', error);
      }
    }
    
    console.log('WebSocket connected');
    
    // Setup heartbeat check to keep connection alive
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    
    // Send initial connection success event to all clients
    ws.send(JSON.stringify({ 
      type: 'connect', 
      payload: { connected: true, timestamp: new Date().toISOString() }
    }));
    
    // For development purposes, we'll broadcast connection events to all clients
    broadcast('user_connected', { 
      timestamp: new Date().toISOString(),
      connections: wss.clients.size
    });
    
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        console.log('WebSocket message received:', data);
        
        // Reset the alive status on any message
        ws.isAlive = true;
        
        // Handle specific message types
        if (data.type === 'ping') {
          // Respond to ping with pong
          ws.send(JSON.stringify({
            type: 'pong',
            payload: {
              time: new Date().toISOString(),
              echo: data.payload?.time || null
            }
          }));
        } else if (data.type === 'identify') {
          // Allow client to identify itself with user ID
          if (data.payload && data.payload.userId) {
            ws.userId = data.payload.userId;
            console.log(`WebSocket client identified as user ${ws.userId}`);
            
            // Send confirmation
            ws.send(JSON.stringify({
              type: 'identified',
              payload: {
                userId: ws.userId,
                timestamp: new Date().toISOString()
              }
            }));
          }
        }
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
      }
    });
    
    ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
    });
    
    ws.on('close', () => {
      console.log('WebSocket disconnected');
      
      // Broadcast disconnection event to all remaining clients
      broadcast('user_disconnected', {
        timestamp: new Date().toISOString(),
        connections: wss.clients.size
      });
    });
  });
  
  // Setup a heartbeat interval to keep connections alive
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: any) => {
      if (ws.isAlive === false) {
        console.log('Terminating inactive WebSocket connection');
        return ws.terminate();
      }
      
      ws.isAlive = false;
      try {
        ws.ping();
      } catch (error) {
        console.error('Error sending ping:', error);
        ws.terminate();
      }
    });
  }, 15000); // Check every 15 seconds para evitar desconexões
  
  // Clean up interval on server close
  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });
  
  // As rotas de autenticação são registradas em server/auth.ts no setupAuth
  
  // Registro para monitoramento das rotas de autenticação (apenas para debug em desenvolvimento)
  if (process.env.NODE_ENV !== 'production') {
    console.log('WebSocket broadcast handlers registered');
  }
  
  // API Keys mock
  app.get('/api/user/api-keys', (req: any, res: any) => {
    // Mock data for API Keys
    res.json([
      {
        id: 1,
        name: "OpenAI Produção",
        provider: "openai",
        key: "sk-******************************",
        createdAt: new Date().toISOString(),
        status: 'active',
        defaultKey: true
      },
      {
        id: 2,
        name: "Google AI Teste",
        provider: "google",
        key: "AIza*****************************",
        createdAt: new Date().toISOString(),
        status: 'active',
        defaultKey: false
      }
    ]);
  });
  
  app.post('/api/user/api-keys', (req: any, res: any) => {
    // Mock response for adding API key
    const newKey = {
      ...req.body,
      id: Date.now(),
      key: req.body.key?.substring(0, 5) + "********************" || "sk-********************",
      createdAt: new Date().toISOString(),
      status: 'active',
      defaultKey: false
    };
    res.status(201).json(newKey);
  });
  
  app.delete('/api/user/api-keys/:id', (req: any, res: any) => {
    // Mock response for deleting API key
    res.status(200).json({ success: true });
  });
  
  app.patch('/api/user/api-keys/:id/default', (req: any, res: any) => {
    // Mock response for setting default API key
    res.status(200).json({ 
      id: parseInt(req.params.id),
      defaultKey: true
    });
  });
  
  // Rota para Agentes IA é gerenciada por aiAgentRoutes 
  // Definida com detalhes em /server/controllers/ai-agent.ts
  
  // Automations mock
  app.get('/api/automations', (req: any, res: any) => {
    // Mock data for Automations
    res.json([
      {
        id: 1,
        name: "Boas-vindas Automáticas",
        description: "Envia mensagem de boas-vindas para novos contatos.",
        type: "message",
        userId: req.session?.user?.id || 1,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 2,
        name: "Agendamento de Mensagens",
        description: "Envia lembretes agendados para clientes.",
        type: "schedule",
        userId: req.session?.user?.id || 1,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]);
  });

  // Analytics mock
  app.get('/api/analytics/summary', (req: any, res: any) => {
    res.json({
      totalMessages: 1248,
      totalChats: 204,
      responseRate: 92.5,
      averageResponseTime: "1h 12m",
      messagesLastWeek: [23, 45, 36, 58, 42, 35, 30],
      topTags: [
        { name: "Suporte", count: 78 },
        { name: "Vendas", count: 65 },
        { name: "Financeiro", count: 42 }
      ]
    });
  });
  
  // Set up Baileys message webhooks to broadcast to WebSocket clients
  setupBaileysWebhooks(broadcast, broadcastToUser);
  
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok',
      websocket: wss ? true : false,
      connections: wss ? wss.clients.size : 0,
      timestamp: new Date().toISOString()
    });
  });
  
  // API endpoint para verificar status do WebSocket - útil para diagnósticos
  app.get('/api/ws-status', (req, res) => {
    if (!wss) {
      return res.status(500).json({
        status: 'error',
        message: 'WebSocket server not initialized',
        timestamp: new Date().toISOString()
      });
    }
    
    // Coletar informações sobre as conexões
    const connections: any[] = [];
    wss.clients.forEach((client: any) => {
      connections.push({
        userId: client.userId || null,
        sessionId: client.sessionId ? true : false,
        readyState: client.readyState,
        isAlive: client.isAlive
      });
    });
    
    res.json({
      status: 'ok',
      connections: wss.clients.size,
      connectionDetails: connections,
      timestamp: new Date().toISOString()
    });
  });

  // WebSocket test endpoint
  app.get('/api/ws-test', (req, res) => {
    // Get user ID from session if available, otherwise use default test ID
    const userId = req.session?.user?.id || 2;
    const instanceId = 123;
    
    console.log(`Testing WebSocket broadcasts with userId: ${userId}`);
    
    // Send a test message to all connected clients
    broadcast('test', { 
      message: 'This is a test message', 
      timestamp: new Date().toISOString(),
      userId
    });
    
    // Log all connected clients and their user IDs
    let clientsInfo: any[] = [];
    wss.clients.forEach((client: any) => {
      clientsInfo.push({
        userId: client.userId || 'none',
        sessionId: client.sessionId ? 'set' : 'none',
        state: client.readyState
      });
    });
    console.log(`Connected WebSocket clients:`, clientsInfo);
    
    // Simulate QR code generation - first broadcast a status change
    setTimeout(() => {
      broadcast('instance_status', {
        instanceId,
        userId,
        status: 'qr_ready',
        timestamp: new Date().toISOString()
      });
      
      console.log(`Sent 'qr_ready' status broadcast to all clients`);
    }, 1000);
    
    // Then send the QR code directly to the specific user
    setTimeout(() => {
      // Generate a simple test QR code (this would normally be from Baileys)
      const qrData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIQAAACECAYAAABRRIOnAAAAAklEQVR4AewaftIAAAOPSURBVO3BQY4cOxIEwfAC//9l3znmqYBGD5LdNsyMP1hrXQ5rrcthrXU5rLUuh7XW5bDWuhzWWpfDWutyWGtdDmuty2GtdTmstS6HtdblsNa6HNZal8Na63L48CGl35TIm5R+k8InlOaJMik9UZon0idKvykzPIe11uWw1roc1lqXwxde8ialT1B6k9KblGZKM6UnlCeU3qQ0UZoovUnpTcoTb3rRYa11Oay1Loe11uXww4eVfpPSE0pPKE2UZkozpSeU3qQ0UZooTZRmShOlmdJMaab0m5R+0mGtdTmstS6HtdblsNa6XP7PJKIkzZQmSjOlidITSk8oTZSeUPoX/csvOqy1Loe11uWw1rpc/mWUZkpPKD2h9AlKMRGRYVJ6k9K/5LDWuhzWWpfDWuty+OGXKc2UflOs9AmlJ5RmSjOlidITShOlidJMaVaaKP0LSk+86LDWuhzWWpfDWuty+OAlSv+SkjQrTZRmSjOlidJMaab0CUpPKD2h9C8f1lqXw1rrclhrXQ4ffEjpNynNlGZKkzIpTZQmSjOlidKslCcyKU2UJkoTpYnSRGmm9JsOa63LYa11Oay1LpcvvERppvSE0hNKE6WZ0kxppvQJShOlmdJMaaY0U5ooPaH0hNJMaaL0hNJvOqy1Loe11uWw1rocfviQ0idQmilNlGZKM6WZ0kxppjRTmilNlCJKT1CaKc2UZkpPJPKE0kxppvTEiw5rrcthrXU5rLUuh8sfUSZKE6WJ0kRpojQrTZQmpaQ0UZqVYqWZ0hNKs1JMlGZKsXKmaKL0xGGtdTmstS6HtdblhzepTJRmShOlmdJvUpopTZRmpVlpojRTmpUmSjOlWWlWmpVmShOlmdITLzqstS6HtdblsNa6HD78MqVPUJopzZQmShNlUpoozZRmSjOlWWmiNFOaKU2UZkozpSeUZqVYaab0kw5rrcthrXU5rLUuP/yYmChNlCZKE6WZ0kxpojRRmilFlDNKb1KaKU2UZkoTpVlppvQnHdZal8Na63JYa10uf5nSv6Q0K82UJkozpYnSrPSE0kxpojQrTZRmpYlSTJQmSk+86LDWuhzWWpfDWuty+OAlSr9JaaY0U5opzZQmSk8ozZQmSrHSm5RmSjOlidJMaaI0KT3xosNa63JYa10Oa63L4bDWuhzWWpfDWutyWGtdDmuty2GtdTmstS6HtdblsNa6HNZal8Na63JYa10Oa63LYa11+Q/X85FpkJ3xgQAAAABJRU5ErkJggg==";
      
      // Send this directly to the user
      broadcastToUser(userId, 'qr_code', {
        instanceId,
        userId,
        qrCode: qrData,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Sent QR code to user ${userId}`);
    }, 2000);
    
    // Finally, simulate a successful connection
    setTimeout(() => {
      broadcast('instance_status', {
        instanceId,
        userId,
        status: 'connected',
        timestamp: new Date().toISOString()
      });
      
      broadcastToUser(userId, 'instance_connected', {
        instanceId,
        userId,
        phoneNumber: '+5511912345678',
        timestamp: new Date().toISOString()
      });
      
      console.log(`Sent 'connected' status broadcast`);
    }, 5000);
    
    res.json({ 
      success: true,
      message: 'Test sequence initiated - check WebSocket Debug panel',
      userId,
      connections: wss ? wss.clients.size : 0,
      clientsInfo
    });
  });

  return httpServer;
}
