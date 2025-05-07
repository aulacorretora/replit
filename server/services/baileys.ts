import { Boom } from '@hapi/boom';
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  makeInMemoryStore,
  isJidUser,
  downloadMediaMessage,
  proto,
  WAMessageStatus,
  WAMessageContent
} from '@whiskeysockets/baileys';

// Obter um logger simples
function pino() {
  return {
    level: 'fatal',
    trace: (msg: string, ...args: any[]) => console.trace(`[TRACE] ${msg}`, ...args),
    debug: (msg: string, ...args: any[]) => console.debug(`[DEBUG] ${msg}`, ...args),
    info: (msg: string, ...args: any[]) => console.info(`[INFO] ${msg}`, ...args),
    warn: (msg: string, ...args: any[]) => console.warn(`[WARN] ${msg}`, ...args),
    error: (msg: string, ...args: any[]) => console.error(`[ERROR] ${msg}`, ...args),
    fatal: (msg: string, ...args: any[]) => console.error(`[FATAL] ${msg}`, ...args),
    child: () => pino()
  };
}
import fs from 'fs';
import path from 'path';
import { storage } from '../storage';
import { Instance, InsertChat, InsertMessage } from '@shared/schema';

// Add types for global broadcast functions
declare global {
  var broadcast: (type: string, payload: any) => void;
  var broadcastToUser: (userId: number, type: string, payload: any) => void;
}

// Map to store active WhatsApp connections
const instances = new Map();

// Map to store QR codes
const qrCodes = new Map();

// Map to store connection states
const connectionStates = new Map();

// Store path for session data
const SESSION_PATH = path.join(process.cwd(), 'whatsapp-sessions');

// Create sessions directory if it doesn't exist
if (!fs.existsSync(SESSION_PATH)) {
  fs.mkdirSync(SESSION_PATH, { recursive: true });
}

// In-memory message store
const store = makeInMemoryStore({});

// Initialize instance with QR code callback
export async function initializeInstance(instanceId: number, userId: number, onQRCode: (qrCode: string) => void) {
  try {
    const instance = await storage.getInstance(instanceId);
    
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }
    
    // === Diferente da abordagem anterior, agora vamos SEMPRE fechar e reiniciar a conexão ===
    // Isso vai garantir que tenhamos um QR code fresco toda vez
    if (instances.has(instanceId)) {
      console.log(`Encontrada conexão existente para instância ${instanceId}. Fechando antes de reiniciar...`);
      const oldSock = instances.get(instanceId);
      try {
        // Tentar desconectar adequadamente
        await oldSock.logout();
      } catch (err) {
        console.log(`Erro ao fazer logout: ${err}`);
      }
      try {
        // Tentar encerrar a conexão
        await oldSock.end();
      } catch (err) {
        console.log(`Erro ao encerrar conexão: ${err}`);
      }
      // Remover da lista de instâncias ativas
      instances.delete(instanceId);
      console.log(`Conexão anterior encerrada para instância ${instanceId}`);
    }

    // Path for storing session data
    const sessionPath = path.join(SESSION_PATH, `session-${instanceId}`);
    
    // IMPORTANTE: Remover completamente os arquivos da sessão anterior para garantir QR code fresco
    if (fs.existsSync(sessionPath)) {
      console.log(`Removendo diretório de sessão existente: ${sessionPath}`);
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
    
    // Criar diretório de sessão limpo
    console.log(`Criando diretório de sessão limpo: ${sessionPath}`);
    fs.mkdirSync(sessionPath, { recursive: true });
    
    // Load auth state from file (agora garantimos que será um estado novo)
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    
    // Initialize WhatsApp connection with optimized settings
    console.log(`Iniciando nova conexão WhatsApp para instância ${instanceId}...`);
    const sock = makeWASocket({
      printQRInTerminal: true,
      auth: state,
      logger: pino(),
      browser: ['ZapBan Web', 'Chrome', '114.0.5735.199'],
      syncFullHistory: false,
      connectTimeoutMs: 120000, // Increased timeout for connection
      qrTimeout: 60000, // Increased timeout for QR code
      defaultQueryTimeoutMs: 60000,
      emitOwnEvents: true, // Enable to receive all events
      retryRequestDelayMs: 1000,
      markOnlineOnConnect: true, // Ensure device shows as online
      patchMessageBeforeSending: true // Ensure message format is correct
    });
    
    // Connect store to socket
    store.bind(sock.ev);
    
    // Update instance status
    await storage.updateInstance(instanceId, {
      status: 'connecting',
      connected: false
    });
    
    // Listen for connection update events
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr, receivedPendingNotifications } = update;
      
      console.log(`Connection update for instance ${instanceId}:`, { 
        connection, 
        qrAvailable: !!qr, 
        disconnectReason: lastDisconnect ? JSON.stringify(lastDisconnect.error || 'Unknown') : 'None',
        receivedPendingNotifications
      });
      
      // Track connection state in memory for debugging
      connectionStates.set(instanceId, {
        ...connectionStates.get(instanceId) || {},
        lastUpdate: new Date().toISOString(),
        connection,
        qrAvailable: !!qr
      });
      
      // Handle QR code generation
      if (qr) {
        console.log(`QR code generated for instance ${instanceId} for user ${userId}`);
        
        try {
          // Store QR code with timestamp in memory
          qrCodes.set(instanceId, {
            qrCode: qr,
            timestamp: new Date().toISOString()
          });
          
          // Update instance in storage with QR code
          await storage.updateInstance(instanceId, {
            status: 'qr_ready',
            qrCode: qr,
            qrCodeGeneratedAt: new Date().toISOString()
          });
          
          // Call the callback function to notify caller
          onQRCode(qr);
          
          // Broadcast status and QR code to user
          console.log(`Sending QR code directly to user ${userId} for instance ${instanceId}`);
          
          // Broadcast status change
          global.broadcast('instance_status', {
            instanceId,
            userId,
            status: 'qr_ready',
            timestamp: new Date().toISOString()
          });
          
          // Send QR code via both event names for compatibility
          global.broadcastToUser(userId, 'qr', {
            instanceId,
            qrCode: qr,
            timestamp: new Date().toISOString()
          });
          
          global.broadcastToUser(userId, 'qr_code', {
            instanceId,
            qrCode: qr,
            timestamp: new Date().toISOString()
          });
          
          console.log(`QR code event broadcasted to user ${userId} for instance ${instanceId}`);
        } catch (error) {
          console.error(`Error processing QR code for instance ${instanceId}:`, error);
        }
      }
      
      // Special case: QR code was scanned but connection is still establishing
      if (update.isNewLogin === true || receivedPendingNotifications === true || (qr === undefined && connection === 'connecting' && connectionStates.get(instanceId)?.qrAvailable)) {
        console.log(`Instance ${instanceId} appears to have been authenticated, waiting for full connection...`);
        
        // Update connection state in memory
        connectionStates.set(instanceId, {
          ...connectionStates.get(instanceId) || {},
          lastUpdate: new Date().toISOString(),
          connection: 'connecting_authenticated',
          qrAvailable: false,
          qrScanned: true
        });
        
        // Update instance status to connecting after QR scan
        await storage.updateInstance(instanceId, {
          status: 'connecting',
          connected: false,
          qrCode: null // Clear QR code as it's been scanned
        });
        
        // Notify the user that their QR code was scanned successfully
        global.broadcastToUser(userId, 'qr_scanned', {
          instanceId,
          message: 'QR code escaneado! Conectando ao WhatsApp...',
          timestamp: new Date().toISOString()
        });
        
        // Update status for all clients
        global.broadcast('instance_status', {
          instanceId,
          userId,
          status: 'connecting',
          message: 'Autenticando com o WhatsApp...',
          timestamp: new Date().toISOString()
        });
      }
      
      // Handle connection status changes
      if (connection) {
        if (connection === 'open') {
          // Successfully connected
          console.log(`Instance ${instanceId} connected successfully`);
          
          // Get device info
          const phoneInfo = await getDeviceInfo(sock);
          
          // Update instance status
          await storage.updateInstance(instanceId, {
            status: 'connected',
            connected: true,
            phoneNumber: sock.user?.id.split(':')[0],
            lastConnectedAt: new Date().toISOString(),
            deviceInfo: phoneInfo
          });
          
          // Broadcast connection event via WebSocket
          try {
            // Send connection status to all clients
            global.broadcast('instance_status', {
              instanceId,
              userId,
              status: 'connected',
              timestamp: new Date().toISOString()
            });
            
            // Send specific notification to the owner
            global.broadcastToUser(userId, 'instance_connected', {
              instanceId,
              timestamp: new Date().toISOString(),
              phoneNumber: sock.user?.id.split(':')[0] || null
            });
            
            console.log(`Connection status broadcasted for instance ${instanceId}`);
          } catch (err) {
            console.error('Error broadcasting connection status:', err);
          }
        } else if (connection === 'connecting') {
          // Conexão em andamento - após escanear o QR code
          console.log(`Instance ${instanceId} is connecting...`);
          
          // Notificar o usuário sobre o status intermediário
          global.broadcastToUser(userId, 'instance_status', {
            instanceId,
            status: 'connecting',
            message: 'Autenticando com o WhatsApp...',
            timestamp: new Date().toISOString()
          });
          
        } else if (connection === 'close') {
          // Obter detalhes mais precisos sobre o motivo da desconexão
          let disconnectReason = 'Desconexão desconhecida';
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          
          // Analisar o erro de desconexão para mostrar mensagem mais útil
          if (lastDisconnect?.error) {
            const error = lastDisconnect.error;
            if ((error as Boom)?.output?.payload?.message) {
              disconnectReason = (error as Boom).output.payload.message;
            } else if (typeof error === 'string') {
              disconnectReason = error;
            } else if (error instanceof Error) {
              disconnectReason = error.message;
            }
            
            // Logar o erro completo para diagnóstico
            console.error(`Detailed disconnect reason for instance ${instanceId}:`, JSON.stringify(lastDisconnect.error, null, 2));
          }
          
          // Detecção específica para erro de ambiente restrito (Replit)
          const restrictedEnvironment = disconnectReason.includes('Connection Terminated by Server') || 
                                      statusCode === 428 || 
                                      disconnectReason.includes('Precondition Required');
          
          if (restrictedEnvironment) {
            console.error(`⚠️ AVISO: Ambiente restrito detectado para instância ${instanceId}`);
            console.error(`O servidor do WhatsApp parece estar bloqueando este ambiente (possível restrição do Replit).`);
            console.error(`Recomendamos migrar a aplicação para a VPS em zapban.com para conexão completa.`);
            
            // Notificar o usuário sobre o problema
            global.broadcastToUser(userId, 'instance_status', {
              instanceId,
              status: 'error',
              message: 'Ambiente restrito detectado. O WhatsApp bloqueou a conexão. Tente na VPS zapban.com.',
              timestamp: new Date().toISOString(),
              error: disconnectReason
            });
            
            // Atualizar status da instância
            await storage.updateInstance(instanceId, {
              status: 'error',
              connected: false,
              lastError: `Ambiente restrito: ${disconnectReason}`
            });
            
            // Limpar a sessão para permitir novas tentativas
            try {
              fs.rmSync(sessionPath, { recursive: true, force: true });
              instances.delete(instanceId);
              qrCodes.delete(instanceId);
            } catch (err) {
              console.error(`Error cleaning up session for instance ${instanceId}:`, err);
            }
            
            return; // Não tenta reconectar automaticamente em ambientes restritos
          }
          
          if (statusCode === DisconnectReason.loggedOut) {
            console.log(`Instance ${instanceId} logged out`);
            
            // Remove credentials and session
            try {
              fs.rmSync(sessionPath, { recursive: true, force: true });
              instances.delete(instanceId);
              qrCodes.delete(instanceId);
            } catch (err) {
              console.error(`Error cleaning up session for instance ${instanceId}:`, err);
            }
            
            // Update instance status
            await storage.updateInstance(instanceId, {
              status: 'disconnected',
              connected: false,
              lastError: disconnectReason
            });
            
            // Notificar o usuário
            global.broadcastToUser(userId, 'instance_status', {
              instanceId,
              status: 'disconnected',
              message: 'Desconectado do WhatsApp. Faça login novamente.',
              timestamp: new Date().toISOString()
            });
          } else {
            console.log(`Instance ${instanceId} disconnected, attempting reconnect... Reason: ${disconnectReason}`);
            
            // Update instance status
            await storage.updateInstance(instanceId, {
              status: 'connecting',
              connected: false,
              lastError: disconnectReason
            });
            
            // Notificar o usuário
            global.broadcastToUser(userId, 'instance_status', {
              instanceId,
              status: 'reconnecting',
              message: 'Reconectando ao WhatsApp...',
              timestamp: new Date().toISOString()
            });
            
            // Auto reconnect unless logged out or explicitly disconnected
            setTimeout(() => {
              if (!instances.has(instanceId)) {
                initializeInstance(instanceId, userId, onQRCode);
              }
            }, 5000);
          }
        }
      }
    });
    
    // Save auth credentials when updated
    sock.ev.on('creds.update', saveCreds);
    
    // Handle incoming messages
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      
      for (const message of messages) {
        // Only process if it has a valid conversation
        if (!message.key.remoteJid) continue;
        
        // Skip non-user messages (like groups, broadcasts, etc.)
        if (!isJidUser(message.key.remoteJid)) continue;
        
        // Process the message
        await handleIncomingMessage(instanceId, userId, sock, message);
      }
    });
    
    // Handle message status updates
    sock.ev.on('messages.update', async (updates) => {
      for (const update of updates) {
        // Only process status updates
        if (!update.key.remoteJid || !update.update.status) continue;
        
        // Update message status in database
        await updateMessageStatus(instanceId, update.key.id!, update.update.status);
      }
    });
    
    // Store the socket instance
    instances.set(instanceId, sock);
    
    return sock;
  } catch (error) {
    console.error(`Error initializing instance ${instanceId}:`, error);
    
    // Update instance status to failed
    await storage.updateInstance(instanceId, {
      status: 'failed',
      connected: false
    });
    
    throw error;
  }
}

// Disconnect an instance
export async function disconnectInstance(instanceId: number) {
  // Check if instance exists
  if (!instances.has(instanceId)) {
    throw new Error(`Instance ${instanceId} not connected`);
  }
  
  const sock = instances.get(instanceId);
  
  try {
    // Logout from WhatsApp
    await sock.logout();
    
    // Remove from instances map
    instances.delete(instanceId);
    qrCodes.delete(instanceId);
    
    // Update instance status
    await storage.updateInstance(instanceId, {
      status: 'disconnected',
      connected: false
    });
    
    // Clean up session files
    const sessionPath = path.join(SESSION_PATH, `session-${instanceId}`);
    fs.rmSync(sessionPath, { recursive: true, force: true });
    
    return true;
  } catch (error) {
    console.error(`Error disconnecting instance ${instanceId}:`, error);
    
    // Force update instance status
    await storage.updateInstance(instanceId, {
      status: 'disconnected',
      connected: false
    });
    
    // Force remove from instances map
    instances.delete(instanceId);
    qrCodes.delete(instanceId);
    
    throw error;
  }
}

// Get QR code for an instance
export function getInstanceQRCode(instanceId: number) {
  console.log(`Getting QR code for instance ${instanceId}, exists:`, qrCodes.has(instanceId));
  
  // First check for QR code in memory
  if (qrCodes.has(instanceId)) {
    const { qrCode, timestamp } = qrCodes.get(instanceId);
    
    if (!qrCode) {
      console.log(`QR code for instance ${instanceId} is null in memory`);
    } else {
      // Check if QR code is still valid (60 seconds)
      const expiryTime = new Date(timestamp);
      expiryTime.setSeconds(expiryTime.getSeconds() + 60);
      
      if (new Date() > expiryTime) {
        console.log(`QR code for instance ${instanceId} expired`);
        qrCodes.delete(instanceId);
      } else {
        console.log(`Returning valid QR code from memory for instance ${instanceId}`);
        return qrCode;
      }
    }
  }
  
  // For this implementation, we'll rely on the in-memory cache or QR codes stored in the instance
  // rather than trying to fetch asynchronously, since our API expects synchronous behavior
  
  // Try to get from database synchronously (through instance already in cache)
  try {
    // This assumes getInstance has a local cache or it's a synchronous operation (like in MemStorage)
    const instance = storage.getInstance(instanceId);
    if (instance instanceof Promise) {
      // If it returns a promise, we can't use it synchronously - just log and continue
      console.log(`Can't get instance synchronously for ${instanceId}, skipping DB check`);
    } else if (instance && instance.qrCode && instance.qrCodeGeneratedAt) {
      // Check if still valid (60 seconds)
      const expiryTime = new Date(instance.qrCodeGeneratedAt);
      expiryTime.setSeconds(expiryTime.getSeconds() + 60);
      
      if (new Date() > expiryTime) {
        console.log(`QR code for instance ${instanceId} expired in database`);
      } else {
        // Update in-memory cache
        qrCodes.set(instanceId, {
          qrCode: instance.qrCode,
          timestamp: instance.qrCodeGeneratedAt
        });
        
        console.log(`Returning valid QR code from database for instance ${instanceId}`);
        return instance.qrCode;
      }
    }
  } catch (error) {
    console.error(`Error getting QR code from database for instance ${instanceId}:`, error);
  }
  
  console.log(`No valid QR code found for instance ${instanceId}`);
  return null;
}

// Force reset and generate new QR code
export async function forceResetConnection(instanceId: number, userId: number): Promise<string | null> {
  console.log(`Force resetting connection for instance ${instanceId}`);
  
  try {
    // First check if we have an active connection
    if (instances.has(instanceId)) {
      const existingSocket = instances.get(instanceId);
      
      try {
        console.log(`Closing existing socket connection for instance ${instanceId}`);
        // Try to gracefully close the connection
        await existingSocket.logout();
      } catch (error) {
        console.log(`Error logging out existing connection: ${error.message}`);
        // Continue with cleanup even if logout fails
      }
      
      // Remove the instance from our maps
      instances.delete(instanceId);
      qrCodes.delete(instanceId);
      connectionStates.delete(instanceId);
    }
    
    // Clean up session files to force new QR code generation
    console.log(`Cleaning up session files for instance ${instanceId}`);
    const sessionPath = path.join(SESSION_PATH, `session-${instanceId}`);
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
    
    // Update instance status
    await storage.updateInstance(instanceId, {
      status: 'disconnected',
      connected: false,
      qrCode: null,
      qrCodeGeneratedAt: null
    });
    
    // Notify front end that instance is being reset
    global.broadcastToUser(userId, 'instance_status', {
      instanceId,
      status: 'resetting',
      message: 'Limpando sessão e gerando novo QR code...',
      timestamp: new Date().toISOString()
    });
    
    // Create a promise that will be resolved when we get a QR code
    const qrCodePromise = new Promise<string>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('QR code generation timed out after 45 seconds'));
      }, 45000); // 45 second timeout
      
      // Create a callback for QR code generation
      const onQrCode = (qrCode: string) => {
        clearTimeout(timeoutId);
        resolve(qrCode);
      };
      
      // Initialize a new connection
      console.log(`Initializing new connection for instance ${instanceId}`);
      initializeInstance(instanceId, userId, onQrCode)
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
    
    // Wait for QR code to be generated
    const qrCode = await qrCodePromise;
    console.log(`New QR code generated successfully for instance ${instanceId}`);
    
    // Ensure the QR code is stored both in memory and database
    qrCodes.set(instanceId, {
      qrCode,
      timestamp: new Date().toISOString()
    });
    
    await storage.updateInstance(instanceId, {
      status: 'qr_ready',
      connected: false,
      qrCode,
      qrCodeGeneratedAt: new Date().toISOString()
    });
    
    return qrCode;
  } catch (error) {
    console.error(`Error resetting connection for instance ${instanceId}:`, error);
    
    // Update instance to error state
    await storage.updateInstance(instanceId, {
      status: 'failed',
      connected: false
    });
    
    // Notify front end about error
    global.broadcastToUser(userId, 'instance_status', {
      instanceId,
      status: 'failed',
      message: 'Falha ao reiniciar conexão. Tente novamente.',
      timestamp: new Date().toISOString()
    });
    
    return null;
  }
}

// Get device info for an instance
async function getDeviceInfo(sock: any) {
  try {
    const phoneNumber = sock.user?.id.split(':')[0];
    
    // This is a simplified version as Baileys doesn't directly expose device info
    // In a real app, we'd parse more info from various events
    const deviceInfo = {
      phone: {
        device_model: 'Unknown', // We'd get this from connection info in a real app
        os_version: 'Unknown',
        platform: sock.user?.platform || 'android', 
        wa_version: sock.user?.version || 'Unknown',
        phone_number: phoneNumber,
        battery: 'Unknown', // We'd get this from connection info in a real app
      }
    };
    
    return deviceInfo;
  } catch (error) {
    console.error('Error getting device info:', error);
    return null;
  }
}

// Handle incoming message
async function handleIncomingMessage(instanceId: number, userId: number, sock: any, message: proto.IWebMessageInfo) {
  try {
    const remoteJid = message.key.remoteJid!;
    const fromMe = message.key.fromMe || false;
    const messageId = message.key.id!;
    const messageTimestamp = message.messageTimestamp! as number;
    
    // Format timestamp
    const timestamp = new Date(messageTimestamp * 1000).toISOString();
    
    // Get or create chat
    let chat = await storage.getChatByRemoteJid(instanceId, remoteJid);
    
    if (!chat) {
      // Get contact info
      const contactInfo = await sock.getContactInfo(remoteJid);
      const pushName = contactInfo?.name || message.pushName || 'Unknown';
      
      // Create new chat
      const chatData: InsertChat = {
        instanceId,
        remoteJid,
        name: pushName,
        lastMessageAt: timestamp,
        unreadCount: fromMe ? 0 : 1,
        profilePicture: null,
        pushName,
        status: 'active'
      };
      
      chat = await storage.createChat(chatData);
    } else {
      // Update chat metadata
      await storage.updateChat(chat.id, {
        lastMessageAt: timestamp,
        unreadCount: fromMe ? chat.unreadCount : chat.unreadCount + 1,
        pushName: message.pushName || chat.pushName
      });
    }
    
    // Extract message content
    const messageContent = extractMessageContent(message.message!);
    
    // Create message record
    const messageData: InsertMessage = {
      chatId: chat.id,
      instanceId,
      messageId,
      remoteJid,
      fromMe,
      type: messageContent.type,
      content: messageContent.content,
      mediaUrl: messageContent.mediaUrl,
      mediaType: messageContent.mediaType,
      status: fromMe ? 'sent' : 'received',
      timestamp
    };
    
    // Save message to database
    const savedMessage = await storage.createMessage(messageData);
    
    // Broadcast to websocket
    global.broadcast && global.broadcast('new_message', savedMessage);
    global.broadcastToUser && global.broadcastToUser(userId, 'new_message', savedMessage);
    
    return savedMessage;
  } catch (error) {
    console.error('Error handling incoming message:', error);
    throw error;
  }
}

// Extract content from different message types
function extractMessageContent(messageContent: WAMessageContent) {
  try {
    if (!messageContent) {
      return { type: 'unknown', content: '', mediaUrl: null, mediaType: null };
    }
    
    // Text message
    if (messageContent.conversation) {
      return {
        type: 'text',
        content: messageContent.conversation,
        mediaUrl: null,
        mediaType: null
      };
    }
    
    // Extended text message
    if (messageContent.extendedTextMessage) {
      return {
        type: 'text',
        content: messageContent.extendedTextMessage.text || '',
        mediaUrl: null,
        mediaType: null
      };
    }
    
    // Image message
    if (messageContent.imageMessage) {
      return {
        type: 'image',
        content: messageContent.imageMessage.caption || '',
        mediaUrl: messageContent.imageMessage.url || null,
        mediaType: messageContent.imageMessage.mimetype || 'image/jpeg'
      };
    }
    
    // Video message
    if (messageContent.videoMessage) {
      return {
        type: 'video',
        content: messageContent.videoMessage.caption || '',
        mediaUrl: messageContent.videoMessage.url || null,
        mediaType: messageContent.videoMessage.mimetype || 'video/mp4'
      };
    }
    
    // Audio message
    if (messageContent.audioMessage) {
      return {
        type: 'audio',
        content: '',
        mediaUrl: messageContent.audioMessage.url || null,
        mediaType: messageContent.audioMessage.mimetype || 'audio/mp4'
      };
    }
    
    // Document message
    if (messageContent.documentMessage) {
      return {
        type: 'document',
        content: messageContent.documentMessage.fileName || '',
        mediaUrl: messageContent.documentMessage.url || null,
        mediaType: messageContent.documentMessage.mimetype || 'application/octet-stream'
      };
    }
    
    // Default fallback
    return {
      type: 'unknown',
      content: JSON.stringify(messageContent),
      mediaUrl: null,
      mediaType: null
    };
  } catch (error) {
    console.error('Error extracting message content:', error);
    return { type: 'error', content: 'Error processing message', mediaUrl: null, mediaType: null };
  }
}

// Update message status
async function updateMessageStatus(instanceId: number, messageId: string, status: WAMessageStatus) {
  try {
    // Map WhatsApp status to our application status
    let appStatus = 'sent';
    
    switch (status) {
      case WAMessageStatus.PENDING:
        appStatus = 'sending';
        break;
      case WAMessageStatus.SERVER_ACK:
        appStatus = 'sent';
        break;
      case WAMessageStatus.DELIVERY_ACK:
        appStatus = 'delivered';
        break;
      case WAMessageStatus.READ:
        appStatus = 'read';
        break;
      case WAMessageStatus.PLAYED:
        appStatus = 'played';
        break;
    }
    
    // Find message by message_id in any chat for this instance
    // This is a simplification - in a real app we'd have a more efficient query
    const chats = await storage.getChatsByInstance(instanceId);
    
    for (const chat of chats) {
      const message = await storage.getMessageByMessageId(chat.id, messageId);
      
      if (message) {
        // Update message status
        await storage.updateMessage(message.id, { status: appStatus });
        
        // Broadcast status update
        global.broadcast && global.broadcast('message_status', {
          messageId,
          chatId: chat.id,
          instanceId,
          status: appStatus
        });
        
        break;
      }
    }
  } catch (error) {
    console.error('Error updating message status:', error);
  }
}

// Send text message
export async function sendTextMessage(instanceId: number, userId: number, chatId: number, text: string) {
  try {
    // Get socket instance
    const sock = instances.get(instanceId);
    if (!sock) {
      throw new Error(`Instance ${instanceId} not connected`);
    }
    
    // Get chat info
    const chat = await storage.getChat(chatId);
    if (!chat) {
      throw new Error(`Chat ${chatId} not found`);
    }
    
    // Generate unique message ID
    const messageId = `${Date.now()}.${Math.floor(Math.random() * 1000)}`;
    
    // Send message
    const result = await sock.sendMessage(chat.remoteJid, { text }, { quoted: null });
    
    // Create message in database
    const messageData: InsertMessage = {
      chatId,
      instanceId,
      messageId: result.key.id!,
      remoteJid: chat.remoteJid,
      fromMe: true,
      type: 'text',
      content: text,
      mediaUrl: null,
      mediaType: null,
      status: 'sent',
      timestamp: new Date().toISOString()
    };
    
    // Save message to database
    const savedMessage = await storage.createMessage(messageData);
    
    // Update chat's last message time
    await storage.updateChat(chatId, {
      lastMessageAt: savedMessage.timestamp
    });
    
    // Broadcast to websocket
    global.broadcast && global.broadcast('new_message', savedMessage);
    global.broadcastToUser && global.broadcastToUser(userId, 'new_message', savedMessage);
    
    return savedMessage;
  } catch (error) {
    console.error('Error sending text message:', error);
    throw error;
  }
}

// Send media message (image, video, document, audio)
export async function sendMediaMessage(
  instanceId: number, 
  userId: number,
  chatId: number, 
  type: 'image' | 'video' | 'document' | 'audio',
  caption: string,
  mediaBuffer: Buffer,
  mimetype: string,
  filename?: string
) {
  try {
    // Get socket instance
    const sock = instances.get(instanceId);
    if (!sock) {
      throw new Error(`Instance ${instanceId} not connected`);
    }
    
    // Get chat info
    const chat = await storage.getChat(chatId);
    if (!chat) {
      throw new Error(`Chat ${chatId} not found`);
    }
    
    // Prepare media message based on type
    let messageContent: any;
    
    switch (type) {
      case 'image':
        messageContent = {
          image: mediaBuffer,
          caption,
          mimetype
        };
        break;
      case 'video':
        messageContent = {
          video: mediaBuffer,
          caption,
          mimetype
        };
        break;
      case 'document':
        messageContent = {
          document: mediaBuffer,
          mimetype,
          fileName: filename || 'file'
        };
        break;
      case 'audio':
        messageContent = {
          audio: mediaBuffer,
          mimetype,
          ptt: mimetype.includes('ogg')
        };
        break;
      default:
        throw new Error(`Unsupported media type: ${type}`);
    }
    
    // Send message
    const result = await sock.sendMessage(chat.remoteJid, messageContent);
    
    // Create message in database
    const messageData: InsertMessage = {
      chatId,
      instanceId,
      messageId: result.key.id!,
      remoteJid: chat.remoteJid,
      fromMe: true,
      type,
      content: caption || filename || '',
      mediaUrl: null, // In a real app, we would store URLs to our stored media
      mediaType: mimetype,
      status: 'sent',
      timestamp: new Date().toISOString()
    };
    
    // Save message to database
    const savedMessage = await storage.createMessage(messageData);
    
    // Update chat's last message time
    await storage.updateChat(chatId, {
      lastMessageAt: savedMessage.timestamp
    });
    
    // Broadcast to websocket
    global.broadcast && global.broadcast('new_message', savedMessage);
    global.broadcastToUser && global.broadcastToUser(userId, 'new_message', savedMessage);
    
    return savedMessage;
  } catch (error) {
    console.error('Error sending media message:', error);
    throw error;
  }
}

// Get connection status for an instance
export async function getInstanceStatus(instanceId: number) {
  try {
    // Get instance from database
    const instance = await storage.getInstance(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }
    
    // Check if instance is connected
    const isConnected = instances.has(instanceId);
    
    // If database and memory state don't match, update database
    if (isConnected !== instance.connected) {
      await storage.updateInstance(instanceId, {
        connected: isConnected,
        status: isConnected ? 'connected' : 'disconnected'
      });
    }
    
    return {
      id: instance.id,
      status: isConnected ? 'connected' : 'disconnected',
      connected: isConnected,
      qrCode: qrCodes.get(instanceId)?.qrCode || null,
      phoneNumber: instance.phoneNumber || null,
      deviceInfo: instance.deviceInfo || null,
      lastConnectedAt: instance.lastConnectedAt || null
    };
  } catch (error) {
    console.error('Error getting instance status:', error);
    throw error;
  }
}

// Setup webhooks for Baileys events
export function setupBaileysWebhooks(broadcast: Function, broadcastToUser: Function) {
  // Make these functions available globally for the message handlers
  global.broadcast = broadcast;
  global.broadcastToUser = broadcastToUser;
  
  // We'll use the events directly from each socket instance
  // instead of trying to use store.on which is not a function
  
  // Note: The Baileys event handlers are set up in the initializeInstance function
  // where we have access to the socket instance and can register event listeners
  console.log('WebSocket broadcast handlers registered');
}
