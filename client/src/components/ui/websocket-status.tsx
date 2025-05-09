import { useWebSocket } from "@/hooks/use-websocket";
import { WifiOff, Wifi } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";

export function WebSocketStatus() {
  const { isConnected } = useWebSocket();
  const [showReconnect, setShowReconnect] = useState(false);

  // Show reconnect button after 5 seconds of being disconnected
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (!isConnected) {
      timeout = setTimeout(() => {
        setShowReconnect(true);
      }, 5000);
    } else {
      setShowReconnect(false);
    }
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isConnected]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center">
          {isConnected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className={`h-4 w-4 ${showReconnect ? 'text-red-500' : 'text-orange-500'}`} />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{isConnected ? 'Conectado em tempo real' : 'Sem conexão em tempo real'}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function WebSocketStatusWithReconnect() {
  const { isConnected, connect } = useWebSocket();
  const [showReconnect, setShowReconnect] = useState(false);

  // Show reconnect button after 5 seconds of being disconnected
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (!isConnected) {
      timeout = setTimeout(() => {
        setShowReconnect(true);
      }, 5000);
    } else {
      setShowReconnect(false);
    }
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isConnected]);

  const handleReconnect = () => {
    connect();
  };

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center">
            {isConnected ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className={`h-5 w-5 ${showReconnect ? 'text-red-500' : 'text-orange-500'}`} />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{isConnected ? 'Conectado em tempo real' : 'Sem conexão em tempo real'}</p>
        </TooltipContent>
      </Tooltip>
      
      {showReconnect && !isConnected && (
        <button 
          onClick={handleReconnect}
          className="text-xs text-primary hover:underline"
        >
          Reconectar
        </button>
      )}
    </div>
  );
}