import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WebSocketStatusWithReconnect } from '@/components/ui/websocket-status';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Send, Zap, Smartphone, QrCode } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export function WebSocketDebug() {
  const [messages, setMessages] = useState<{type: string, payload: any, time: string}[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const { user } = useAuth();
  
  // Connect to WebSocket with reconnection logic
  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 3000; // 3 seconds
    
    // Function to create and initialize a new WebSocket connection
    const connect = () => {
      // Clear any existing connection
      if (socket) {
        socket.close();
      }
      
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      
      // Create new connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
      
      socket.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        reconnectAttempts = 0; // Reset attempts on successful connection
        
        // Send user identification if logged in
        if (user && user.id) {
          if (socket) {
            socket.send(JSON.stringify({
              type: 'identify',
              payload: { userId: user.id }
            }));
            console.log('Sent user identification to WebSocket server:', user.id);
          }
        }
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Update state based on message type
          if (data.type === 'qr_code' && data.payload && data.payload.qrCode) {
            setQrCode(data.payload.qrCode);
          }
          
          // Store all messages for display
          setMessages(prev => [
            { type: data.type, payload: data.payload, time: new Date().toLocaleTimeString() },
            ...prev.slice(0, 19) // Keep last 20 messages
          ]);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      socket.onclose = (event) => {
        console.log('WebSocket disconnected', event.code, event.reason);
        setConnected(false);
        
        // Don't try to reconnect if we're unmounting
        if (reconnectAttempts < maxReconnectAttempts) {
          console.log(`Attempting to reconnect (${reconnectAttempts + 1}/${maxReconnectAttempts})...`);
          reconnectTimer = setTimeout(() => {
            reconnectAttempts++;
            connect();
          }, reconnectDelay);
        } else {
          console.log('Max reconnect attempts reached, giving up');
        }
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      setWs(socket);
    };
    
    // Initial connection
    connect();
    
    // Cleanup function
    return () => {
      if (socket) {
        // Prevent reconnection attempts when intentionally closing
        socket.onclose = null;
        socket.close();
      }
      
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [user]);
  
  // Send a ping message
  const sendPing = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping', payload: { time: new Date().toISOString() } }));
    }
  };
  
  // Trigger the test endpoint
  const triggerTest = async () => {
    try {
      const res = await fetch('/api/ws-test');
      const data = await res.json();
      console.log('Test endpoint response:', data);
    } catch (error) {
      console.error('Error calling test endpoint:', error);
    }
  };
  
  return (
    <Card className="w-full max-w-2xl mx-auto mt-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>WebSocket Debug</span>
          <WebSocketStatusWithReconnect />
        </CardTitle>
        <CardDescription>
          Monitor and test real-time communication between client and server
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <Button size="sm" onClick={sendPing} disabled={!connected}>
              <Send className="h-4 w-4 mr-1" />
              Send Ping
            </Button>
            <Button size="sm" onClick={triggerTest} variant="outline">
              <RefreshCw className="h-4 w-4 mr-1" />
              Trigger Test
            </Button>
          </div>
          <Badge variant={connected ? "success" : "destructive"}>
            {connected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
        
        {/* QR Code Display */}
        {qrCode && (
          <div className="mb-4 flex flex-col items-center p-4 border rounded-lg bg-muted/30">
            <h3 className="text-sm font-medium mb-2 flex items-center">
              <QrCode className="h-4 w-4 mr-1" />
              Código QR WhatsApp
            </h3>
            <img 
              src={qrCode} 
              alt="QR Code para conectar WhatsApp" 
              className="max-w-xs w-full h-auto rounded-md border border-border"
            />
            <p className="text-xs text-muted-foreground mt-2 max-w-xs text-center">
              Escaneie este código com seu telefone para conectar sua conta WhatsApp
            </p>
          </div>
        )}
        
        {/* User identification info */}
        <div className="mb-4 flex justify-between items-center rounded-lg border p-2">
          <div className="flex items-center">
            <Smartphone className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="text-sm">
              {user ? `Usuário identificado: ${user.name} (ID: ${user.id})` : 'Usuário não identificado'}
            </span>
          </div>
          <Badge variant="outline" className="text-xs">
            {user?.role || 'visitante'}
          </Badge>
        </div>
        
        <div className="border rounded-lg overflow-y-auto max-h-64 p-2">
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No messages received yet
            </p>
          ) : (
            <ul className="space-y-2">
              {messages.map((msg, index) => (
                <li key={index} className="text-xs border-b pb-1 last:border-b-0">
                  <div className="font-semibold flex justify-between">
                    <span className="text-primary">{msg.type}</span>
                    <span className="text-muted-foreground">{msg.time}</span>
                  </div>
                  <pre className="whitespace-pre-wrap text-xs bg-muted p-1 rounded mt-1 overflow-x-auto">
                    {JSON.stringify(msg.payload, null, 2)}
                  </pre>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}