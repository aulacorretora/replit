import { WS_EVENTS } from './constants';

type MessageHandler = (data: any) => void;
type StatusChangeHandler = (status: boolean) => void;

class WebSocketClient {
  private socket: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private statusChangeHandlers: Set<StatusChangeHandler> = new Set();
  private isConnected: boolean = false;
  private url: string;
  private maxReconnectAttempts: number = 15; // Aumentado para maior resiliência
  private reconnectAttempts: number = 0;
  private baseReconnectInterval: number = 1000; // Valor base para o cálculo do backoff exponencial
  private reconnectInterval: number = 1000; // Valor inicial
  private heartbeatInterval: number = 10000; // Reduzido para 10 segundos para evitar desconexões
  private connecting: boolean = false;

  constructor() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    
    // Tentar obter o userId do localStorage para incluir na URL de conexão
    let userId = '';
    try {
      const storedUserId = localStorage.getItem('userId');
      if (storedUserId) {
        userId = `?userId=${storedUserId}`;
      }
    } catch (err) {
      console.error('Erro ao obter userId do localStorage:', err);
    }
    
    this.url = `${protocol}//${window.location.host}/ws${userId}`;
  }

  connect(): void {
    // If already connecting or connected, don't create a new connection
    if (this.connecting) {
      console.log('WebSocket connection already in progress');
      return;
    }
    
    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
      console.log(`Socket exists in state ${this.socket.readyState}, not creating a new one`);
      return;
    }
    
    // Set connecting flag
    this.connecting = true;
    console.log('Initiating WebSocket connection...');
    
    // Atualizar a URL com o userId mais recente
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    let userId = '';
    try {
      const storedUserId = localStorage.getItem('userId');
      if (storedUserId) {
        userId = `?userId=${storedUserId}`;
      }
    } catch (err) {
      console.error('Erro ao obter userId do localStorage para reconexão:', err);
    }
    this.url = `${protocol}//${window.location.host}/ws${userId}`;
    
    // If socket is null or CLOSED, create a new one
    this.socket = new WebSocket(this.url);

    // Set event handlers
    this.socket.onopen = () => {
      this.isConnected = true;
      this.connecting = false;
      this.reconnectAttempts = 0;
      this.notifyStatusChange(true);
      console.log('WebSocket connected successfully');
      
      // Start sending heartbeats to keep the connection alive
      this.startHeartbeat();
      
      // Attempt to get user ID from session
      this.identifyUser();
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { type, payload } = data;
        
        if (type && this.messageHandlers.has(type)) {
          const handlers = this.messageHandlers.get(type);
          if (handlers) {
            handlers.forEach(handler => handler(payload));
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.socket.onclose = (event) => {
      console.log(`WebSocket closed with code ${event.code}: ${event.reason || 'No reason provided'}`);
      this.isConnected = false;
      this.connecting = false;
      this.notifyStatusChange(false);
      this.attemptReconnect();
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.connecting = false;
      
      // Não fechar o WebSocket imediatamente - permitir que o mecanismo de close/reconnect normal funcione
      // A conexão será fechada automaticamente pelo browser na maioria dos casos de erro
      // Apenas agendar uma tentativa de reconexão se a conexão não fechar automaticamente
      setTimeout(() => {
        if (this.socket && this.socket.readyState !== WebSocket.CLOSED && this.socket.readyState !== WebSocket.CLOSING) {
          console.log('Conexão ainda aberta após erro, tentando fechar e reconectar...');
          this.socket.close();
        }
      }, 1000);
    };
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.isConnected = false;
    this.notifyStatusChange(false);
  }

  on(event: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, new Set());
    }
    
    const handlers = this.messageHandlers.get(event);
    handlers?.add(handler);
    
    return () => {
      const handlers = this.messageHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(event);
        }
      }
    };
  }

  onStatusChange(handler: StatusChangeHandler): () => void {
    this.statusChangeHandlers.add(handler);
    
    // Call the handler immediately with the current connection status
    handler(this.isConnected);
    
    return () => {
      this.statusChangeHandlers.delete(handler);
    };
  }

  send(type: string, payload: any): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      // Queue the message to be sent when the socket connects
      this.connectWithRetry().then(() => {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type, payload }));
          console.log(`Queued message ${type} sent after reconnection`);
        }
      }).catch(err => {
        console.error('Failed to send message after reconnection attempts:', err);
      });
      return;
    }
    
    try {
      this.socket.send(JSON.stringify({ type, payload }));
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
    }
  }
  
  // Connect with retry logic
  private async connectWithRetry(): Promise<void> {
    return new Promise((resolve, reject) => {
      // If already connected, resolve immediately
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      
      // Set a flag to track if this promise is resolved
      let resolved = false;
      
      // Create connection status handler
      const connectionHandler = (status: boolean) => {
        if (status && !resolved) {
          resolved = true;
          removeListener();
          resolve();
        }
      };
      
      // Add listener for connection status
      const removeListener = this.onStatusChange(connectionHandler);
      
      // Start connection
      this.connect();
      
      // Set timeout for connection
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          removeListener();
          reject(new Error('Connection timed out'));
        }
      }, 10000); // 10 second timeout
    });
  }

  private attemptReconnect(): void {
    // Clear any existing timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // Reset connection flags
    this.connecting = false;
    
    // Check if max attempts reached
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Maximum reconnect attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    
    // Calcular intervalo com backoff exponencial (1s, 2s, 4s, 8s, etc.)
    // com um limite máximo e um componente aleatório para evitar "thundering herd"
    const maxInterval = 30000; // 30 segundos no máximo
    const exponent = Math.min(this.reconnectAttempts, 10); // Limitar expoente para evitar números enormes
    const backoff = Math.min(Math.pow(2, exponent - 1) * this.baseReconnectInterval, maxInterval);
    
    // Adicionar um jitter (variação aleatória) de até 25% para evitar que todos os clientes tentem reconectar ao mesmo tempo
    const jitter = Math.random() * 0.25 * backoff;
    const finalInterval = backoff + jitter;
    
    console.log(`Programando reconexão em ${Math.round(finalInterval / 1000)}s (tentativa ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    // Schedule reconnection attempt
    this.reconnectTimer = setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      // Only attempt reconnect if not currently connecting
      if (!this.connecting && (!this.socket || this.socket.readyState === WebSocket.CLOSED)) {
        this.connect();
      } else {
        console.log('Skipping reconnect attempt as connection already in progress');
      }
    }, finalInterval);
  }

  private notifyStatusChange(status: boolean): void {
    this.statusChangeHandlers.forEach(handler => handler(status));
  }
  
  // Start sending regular heartbeats to keep the connection alive
  private startHeartbeat(): void {
    // Clear existing heartbeat timer if any
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    // Start a new heartbeat timer
    this.heartbeatTimer = setInterval(() => {
      if (this.socket) {
        if (this.socket.readyState === WebSocket.OPEN) {
          try {
            // Send ping message
            this.send('ping', { time: new Date().toISOString() });
          } catch (error) {
            console.error('Error sending heartbeat:', error);
            // Try to reconnect if error sending heartbeat
            if (this.socket.readyState !== WebSocket.CONNECTING) {
              this.socket.close();
            }
          }
        } else if (this.socket.readyState === WebSocket.CLOSED || this.socket.readyState === WebSocket.CLOSING) {
          // If socket is closed or closing, try to reconnect
          this.connect();
        }
      } else {
        // If no socket exists, try to create one
        this.connect();
      }
    }, this.heartbeatInterval);
  }

  // Send user identification to server
  public identifyUser(): void {
    // First try to get the current userId from localStorage if available
    try {
      const userId = localStorage.getItem('userId');
      if (userId) {
        const userIdNum = parseInt(userId, 10);
        if (!isNaN(userIdNum)) {
          this.send('identify', { userId: userIdNum });
          console.log(`Sent user identification to WebSocket server:`, userIdNum);
          return;
        }
      }
    } catch (error) {
      console.error('Error getting userId from localStorage:', error);
    }

    // Otherwise fetch the user data from the API
    fetch('/api/auth/user', { 
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Not authenticated');
      })
      .then(userData => {
        if (userData && userData.id) {
          // Send identification to server
          const userId = userData.id;
          this.send('identify', { userId });
          console.log(`Sent user identification to WebSocket server:`, userId);
          
          // Store userId for future use
          localStorage.setItem('userId', userId.toString());
        }
      })
      .catch(error => {
        console.warn('Could not identify WebSocket user:', error);
      });
  }
}

// Create a singleton instance
const websocket = new WebSocketClient();

export default websocket;
