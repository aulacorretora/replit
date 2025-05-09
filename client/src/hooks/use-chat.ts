import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_ENDPOINTS } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { useState, useEffect } from 'react';
import websocket from '@/lib/websocket';
import { 
  getChats, 
  getChat, 
  getChatMessages, 
  sendTextMessage, 
  sendMediaMessage 
} from '@/lib/baileys';
import { Chat, Message } from '@shared/schema';

// Add debug logs
const DEBUG = true;
function logDebug(...args: any[]) {
  if (DEBUG) {
    console.log(...args);
  }
}

export const useChats = (instanceId?: number) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Only fetch if we have an instance ID
  const enabled = instanceId !== undefined;

  logDebug(`useChats hook initialized with instanceId:`, instanceId, `enabled:`, enabled);

  // Get all chats for an instance
  const {
    data: chats,
    isLoading: loadingChats,
    error: chatsError,
    refetch: refetchChats
  } = useQuery({
    queryKey: ['instance-chats', instanceId],
    queryFn: () => {
      logDebug(`Fetching chats for instance ID: ${instanceId}`);
      return getChats(instanceId!);
    },
    enabled,
    retry: 2,
    staleTime: 30000,
  });

  // Log results for debugging
  useEffect(() => {
    if (chats) {
      logDebug(`Loaded ${chats.length} chats for instance ${instanceId}`);
    }
    if (chatsError) {
      console.error('Error loading chats:', chatsError);
    }
  }, [chats, chatsError, instanceId]);

  // WebSocket for real-time chat updates
  useEffect(() => {
    if (!instanceId) return;

    logDebug('Setting up WebSocket listeners for instance chats:', instanceId);

    const newMessageHandler = (data: any) => {
      logDebug('Received new message notification, refreshing chats list');
      refetchChats();
    };

    websocket.connect();
    const removeListener = websocket.on('new_message', newMessageHandler);

    return () => {
      logDebug('Cleaning up WebSocket listeners for instance chats:', instanceId);
      removeListener();
    };
  }, [instanceId, refetchChats]);

  return {
    chats,
    loadingChats,
    chatsError,
    refetchChats,
  };
};

export const useChat = (chatId?: number) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Only fetch if we have a chat ID
  const enabled = chatId !== undefined;

  logDebug(`useChat hook initialized with chatId:`, chatId, `enabled:`, enabled);

  // Get chat details
  const {
    data: chat,
    isLoading: loadingChat,
    error: chatError,
    refetch: refetchChat
  } = useQuery({
    queryKey: ['chat', chatId],
    queryFn: () => {
      logDebug(`Fetching chat details for chat ID: ${chatId}`);
      return getChat(chatId!);
    },
    enabled,
    retry: 2,
    staleTime: 30000,
  });

  // Get chat messages
  const {
    data: messagesData,
    isLoading: loadingMessages,
    error: messagesError,
    refetch: refetchMessages
  } = useQuery({
    queryKey: ['chat', chatId, 'messages'],
    queryFn: () => {
      logDebug(`Fetching messages for chat ID: ${chatId}`);
      return getChatMessages(chatId!);
    },
    enabled,
    retry: 2,
    staleTime: 10000,
  });

  // Send text message mutation
  const sendTextMutation = useMutation({
    mutationFn: (message: string) => sendTextMessage({ chatId: chatId!, message }),
    onSuccess: (data) => {
      logDebug('Message sent successfully:', data);
      // Optimistically update the UI
      setMessages(prev => [...prev, data]);
      
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ 
        queryKey: ['chat', chatId, 'messages'] 
      });
    },
    onError: (error) => {
      console.error('Error sending text message:', error);
      toast({
        title: t('chat.sendError'),
        description: error.toString(),
        variant: 'destructive',
      });
    },
  });

  // Send media message mutation
  const sendMediaMutation = useMutation({
    mutationFn: ({ message, type, media }: { message: string, type: string, media: File }) => 
      sendMediaMessage({ chatId: chatId!, message, type: type as any, media }),
    onSuccess: (data) => {
      logDebug('Media message sent successfully:', data);
      // Optimistically update the UI
      setMessages(prev => [...prev, data]);
      
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ 
        queryKey: ['chat', chatId, 'messages'] 
      });
    },
    onError: (error) => {
      console.error('Error sending media message:', error);
      toast({
        title: t('chat.sendMediaError'),
        description: error.toString(),
        variant: 'destructive',
      });
    },
  });

  // WebSocket for real-time message updates
  useEffect(() => {
    if (!chatId) return;

    logDebug('Setting up WebSocket listeners for chat:', chatId);

    const newMessageHandler = (data: any) => {
      logDebug('Received new message via WebSocket:', data);
      if (data.chatId === chatId) {
        // Update local state immediately
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          const exists = prev.some(msg => msg.messageId === data.messageId);
          if (exists) return prev;
          return [...prev, data];
        });
        
        // Refetch to ensure consistency
        refetchMessages();
      }
    };

    const messageStatusHandler = (data: any) => {
      logDebug('Received message status update via WebSocket:', data);
      if (data.chatId === chatId) {
        // Update message status in local state
        setMessages(prev => 
          prev.map(msg => 
            msg.messageId === data.messageId 
              ? { ...msg, status: data.status } 
              : msg
          )
        );
      }
    };

    websocket.connect();
    const removeNewMessageListener = websocket.on('new_message', newMessageHandler);
    const removeStatusListener = websocket.on('message_status', messageStatusHandler);

    return () => {
      logDebug('Cleaning up WebSocket listeners for chat:', chatId);
      removeNewMessageListener();
      removeStatusListener();
    };
  }, [chatId, refetchMessages]);

  // Update local messages state when data changes
  useEffect(() => {
    if (messagesData) {
      logDebug('Updating messages from query data, count:', messagesData.length);
      setMessages(messagesData);
    }
  }, [messagesData]);

  // Handle errors
  useEffect(() => {
    if (chatError) {
      console.error('Error loading chat:', chatError);
    }
    if (messagesError) {
      console.error('Error loading messages:', messagesError);
    }
  }, [chatError, messagesError]);

  const sendMessage = (message: string) => {
    if (!message.trim()) return;
    logDebug('Sending message:', message);
    sendTextMutation.mutate(message);
  };

  const sendMedia = (message: string, type: string, media: File) => {
    logDebug('Sending media message:', message, type, media.name);
    sendMediaMutation.mutate({ message, type, media });
  };

  return {
    chat,
    loadingChat,
    chatError,
    refetchChat,
    messages,
    loadingMessages,
    messagesError,
    refetchMessages,
    sendMessage,
    sendMedia,
    isSending: sendTextMutation.isPending || sendMediaMutation.isPending,
  };
};
