import { useRef, useEffect, useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { Paperclip, Smile, Send, Search, MoreVertical, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import MessageBubble from './MessageBubble';
import { useChat } from '@/hooks/use-chat';
import { Chat, Message } from '@shared/schema';
import { Link } from 'wouter';

interface ChatWindowProps {
  chatId?: number;
  instanceId?: number;
}

export default function ChatWindow({ chatId, instanceId }: ChatWindowProps) {
  const { t, language } = useLanguage();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newMessage, setNewMessage] = useState('');
  const [fileInput, setFileInput] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    chat,
    loadingChat,
    messages,
    loadingMessages,
    sendMessage,
    sendMedia,
    isSending
  } = useChat(chatId);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle send message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() && !fileInput) return;
    
    if (fileInput) {
      // Determine media type from file mime type
      const fileType = fileInput.type.split('/')[0];
      let type = 'document';
      
      if (fileType === 'image') type = 'image';
      else if (fileType === 'video') type = 'video';
      else if (fileType === 'audio') type = 'audio';
      
      sendMedia(newMessage, type, fileInput);
      setFileInput(null);
    } else {
      sendMessage(newMessage);
    }
    
    setNewMessage('');
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileInput(e.target.files[0]);
    }
  };

  // Format date for the chat
  const formatMessageDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const dateLocale = language === 'pt-BR' ? ptBR : enUS;
    
    if (isToday(date)) {
      return t('chat.today');
    } else if (isYesterday(date)) {
      return t('chat.yesterday');
    } else {
      return format(date, 'dd MMMM', { locale: dateLocale });
    }
  };

  // Group messages by date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    
    messages.forEach(message => {
      const messageDate = formatMessageDate(message.timestamp);
      const existingGroup = groups.find(group => group.date === messageDate);
      
      if (existingGroup) {
        existingGroup.messages.push(message);
      } else {
        groups.push({
          date: messageDate,
          messages: [message]
        });
      }
    });
    
    return groups;
  };

  const messageGroups = groupMessagesByDate(messages || []);

  // Loading state
  if (loadingChat || loadingMessages) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-2 text-sm text-neutral-500">{t('chat.loading')}</p>
      </div>
    );
  }

  // Instance not connected
  if (!instanceId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-neutral-50">
        <div className="w-16 h-16 bg-neutral-200 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-neutral-400" />
        </div>
        <h3 className="text-xl font-medium text-neutral-700 mb-2">Nenhuma instância conectada</h3>
        <p className="text-sm text-neutral-500 text-center max-w-md mb-6">
          Conecte uma conta do WhatsApp para usar o chat. Acesse a página de Instâncias para escanear um QR code.
        </p>
        <Button asChild className="bg-primary hover:bg-primary-dark">
          <Link href="/instances">
            Ir para Instâncias
          </Link>
        </Button>
      </div>
    );
  }
  
  // Empty state - no chat selected
  if (!chatId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-neutral-50">
        <div className="w-16 h-16 bg-neutral-200 rounded-full flex items-center justify-center mb-4">
          <MessageBubble message="" fromMe={false} className="h-8 w-8 text-neutral-400" />
        </div>
        <h3 className="text-xl font-medium text-neutral-700 mb-2">{t('chat.noSelection')}</h3>
        <p className="text-sm text-neutral-500 text-center max-w-md">
          {t('chat.noSelectionDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-neutral-100">
      {/* Chat Header */}
      <div className="h-16 flex items-center justify-between px-4 bg-white border-b border-neutral-200">
        <div className="flex items-center">
          <div className="relative flex-shrink-0">
            <Avatar>
              <AvatarImage src={chat?.profilePicture || ""} alt={chat?.name || ""} />
              <AvatarFallback className="bg-neutral-200">
                {chat?.name ? chat.name[0].toUpperCase() : '?'}
              </AvatarFallback>
            </Avatar>
            <div className={cn(
              "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white",
              chat?.status === 'online' ? "bg-green-500" : "bg-neutral-300"
            )}></div>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-neutral-700">{chat?.name}</h3>
            <p className="text-xs text-neutral-500">
              {chat?.status === 'online' ? t('chat.online') : t('chat.lastSeen')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon">
            <Search className="h-5 w-5 text-neutral-500" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5 text-neutral-500" />
          </Button>
        </div>
      </div>
      
      {/* Chat Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ backgroundImage: "url('https://web.whatsapp.com/img/bg-chat-tile-light_a4be512e7195b6b733d9110b408f075d.png')" }}
      >
        {messageGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="space-y-4">
            {/* Date Separator */}
            <div className="flex justify-center">
              <div className="bg-white px-3 py-1 rounded-full text-xs text-neutral-500 shadow-sm">
                {group.date}
              </div>
            </div>
            
            {/* Messages */}
            {group.messages.map((message, messageIndex) => (
              <MessageBubble
                key={message.id || messageIndex}
                message={message.content || ''}
                fromMe={message.fromMe}
                timestamp={message.timestamp}
                status={message.status}
                type={message.type}
                mediaUrl={message.mediaUrl}
                mediaType={message.mediaType}
              />
            ))}
          </div>
        ))}
        
        {/* Ref for scrolling to bottom */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area for file upload preview */}
      {fileInput && (
        <div className="bg-white border-t border-neutral-200 p-2">
          <div className="flex items-center justify-between bg-neutral-50 p-2 rounded-md">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-neutral-200 rounded-md flex items-center justify-center">
                <Paperclip className="h-5 w-5 text-neutral-500" />
              </div>
              <div className="ml-2">
                <p className="text-sm font-medium text-neutral-700 truncate max-w-[200px]">
                  {fileInput.name}
                </p>
                <p className="text-xs text-neutral-500">
                  {(fileInput.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-neutral-500"
              onClick={() => setFileInput(null)}
            >
              ×
            </Button>
          </div>
        </div>
      )}
      
      {/* Chat Input */}
      <form onSubmit={handleSendMessage} className="bg-white border-t border-neutral-200 p-3">
        <div className="flex items-end space-x-2">
          <Button type="button" variant="ghost" size="icon">
            <Smile className="h-6 w-6 text-neutral-500" />
          </Button>
          
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            onChange={handleFileSelect}
          />
          
          <Button 
            type="button" 
            variant="ghost" 
            size="icon"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-6 w-6 text-neutral-500" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder={t('chat.typeMessage')}
              className="w-full py-2 px-4 rounded-full bg-neutral-100 border-none text-sm focus:ring-2 focus:ring-primary focus:bg-white"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={isSending}
            />
          </div>
          
          <Button 
            type="submit"
            className="flex-shrink-0 bg-primary w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm hover:bg-primary-dark"
            disabled={isSending || (!newMessage.trim() && !fileInput)}
          >
            {isSending ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
