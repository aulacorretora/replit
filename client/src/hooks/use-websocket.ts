import { useEffect, useState, useCallback } from 'react';
import websocket from '@/lib/websocket';
import { WS_EVENTS } from '@/lib/constants';
import { useAuth } from './use-auth';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  events?: Record<string, (data: any) => void>;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { autoConnect = true, events = {} } = options;
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  // Connect to the WebSocket server
  const connect = useCallback(() => {
    websocket.connect();
  }, []);

  // Disconnect from the WebSocket server
  const disconnect = useCallback(() => {
    websocket.disconnect();
  }, []);

  // Send a message to the WebSocket server
  const send = useCallback((type: string, payload: any) => {
    websocket.send(type, payload);
  }, []);

  // Subscribe to WebSocket events
  useEffect(() => {
    // Subscribe to connection status changes
    const statusUnsubscribe = websocket.onStatusChange(setIsConnected);

    // Subscribe to events
    const eventUnsubscribes = Object.entries(events).map(([event, handler]) => {
      return websocket.on(event, handler);
    });

    // Auto-connect if specified
    if (autoConnect && user) {
      connect();
    }

    // Clean up subscriptions
    return () => {
      statusUnsubscribe();
      eventUnsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [autoConnect, connect, events, user]);

  return {
    isConnected,
    connect,
    disconnect,
    send
  };
}

// Specialized hooks for specific use cases

// Hook for instance status updates
export function useInstanceWebSocket(instanceId: number) {
  const [status, setStatus] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);

  const handleInstanceStatus = useCallback((data: any) => {
    if (data.instanceId === instanceId) {
      setStatus(data.status);
    }
  }, [instanceId]);

  const handleQrCode = useCallback((data: any) => {
    if (data.instanceId === instanceId) {
      setQrCode(data.qrCode);
    }
  }, [instanceId]);

  const { isConnected, send } = useWebSocket({
    events: {
      [WS_EVENTS.INSTANCE_STATUS]: handleInstanceStatus,
      [WS_EVENTS.QR_CODE]: handleQrCode,
      [WS_EVENTS.QR]: handleQrCode, // Adicionando o evento 'qr' que o backend está enviando
    }
  });

  return {
    isConnected,
    status,
    qrCode,
    requestStatus: () => send('request_status', { instanceId }),
    requestQrCode: () => send('request_qrcode', { instanceId }),
  };
}

// Hook for chat message updates
export function useChatWebSocket(chatId: number) {
  const [newMessages, setNewMessages] = useState<any[]>([]);
  const [messageStatusUpdates, setMessageStatusUpdates] = useState<any[]>([]);

  const handleNewMessage = useCallback((data: any) => {
    if (data.chatId === chatId) {
      setNewMessages(prev => [...prev, data]);
    }
  }, [chatId]);

  const handleMessageStatus = useCallback((data: any) => {
    if (data.chatId === chatId) {
      setMessageStatusUpdates(prev => [...prev, data]);
    }
  }, [chatId]);

  const clearNewMessages = useCallback(() => {
    setNewMessages([]);
  }, []);

  const clearMessageStatusUpdates = useCallback(() => {
    setMessageStatusUpdates([]);
  }, []);

  const { isConnected } = useWebSocket({
    events: {
      [WS_EVENTS.NEW_MESSAGE]: handleNewMessage,
      [WS_EVENTS.MESSAGE_STATUS]: handleMessageStatus,
    }
  });

  return {
    isConnected,
    newMessages,
    messageStatusUpdates,
    clearNewMessages,
    clearMessageStatusUpdates
  };
}