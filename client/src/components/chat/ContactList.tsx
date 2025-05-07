import { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useChats } from '@/hooks/use-chat';
import { Chat } from '@shared/schema';

interface ContactListProps {
  instanceId?: number;
  selectedChatId?: number;
  onSelectChat: (chatId: number) => void;
}

export default function ContactList({ instanceId, selectedChatId, onSelectChat }: ContactListProps) {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  
  const {
    chats,
    loadingChats,
  } = useChats(instanceId);

  // Format last message time
  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const dateLocale = language === 'pt-BR' ? ptBR : enUS;
    
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: dateLocale });
    } else if (isYesterday(date)) {
      return t('chat.yesterday');
    } else {
      return format(date, 'dd/MM/yyyy', { locale: dateLocale });
    }
  };

  // Filter chats based on search query
  const filteredChats = chats?.filter(chat => 
    chat.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Loading state
  if (loadingChats) {
    return (
      <div className="w-80 border-r border-neutral-200 bg-white flex-shrink-0 flex flex-col items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-2 text-sm text-neutral-500">{t('chat.loadingContacts')}</p>
      </div>
    );
  }

  // Empty state
  if (!chats || chats.length === 0) {
    return (
      <div className="w-80 border-r border-neutral-200 bg-white flex-shrink-0 flex flex-col">
        <div className="p-3 border-b border-neutral-200">
          <div className="relative">
            <Input
              type="text"
              placeholder={t('chat.searchPlaceholder')}
              className="w-full py-2 pl-10 pr-4 rounded-lg bg-neutral-100 border-none text-sm focus:ring-2 focus:ring-primary focus:bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="h-5 w-5 text-neutral-400 absolute left-3 top-2" />
          </div>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-16 h-16 bg-neutral-200 rounded-full flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-medium text-neutral-700 mb-1">{t('chat.noChats')}</h3>
          <p className="text-sm text-neutral-500 text-center">
            {t('chat.noChatsDesc')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-r border-neutral-200 bg-white flex-shrink-0 flex flex-col">
      {/* Search Bar */}
      <div className="p-3 border-b border-neutral-200">
        <div className="relative">
          <Input
            type="text"
            placeholder={t('chat.searchPlaceholder')}
            className="w-full py-2 pl-10 pr-4 rounded-lg bg-neutral-100 border-none text-sm focus:ring-2 focus:ring-primary focus:bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="h-5 w-5 text-neutral-400 absolute left-3 top-2" />
        </div>
      </div>
      
      {/* Contact List */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-neutral-200">
          {filteredChats.map((chat) => (
            <div 
              key={chat.id}
              className={cn(
                "flex items-center px-3 py-3 hover:bg-neutral-100 cursor-pointer",
                selectedChatId === chat.id && "border-l-4 border-primary"
              )}
              onClick={() => onSelectChat(chat.id)}
            >
              <div className="relative flex-shrink-0">
                <Avatar>
                  <AvatarImage src={chat.profilePicture || ""} alt={chat.name || ""} />
                  <AvatarFallback className="bg-neutral-200">
                    {chat.name ? chat.name[0].toUpperCase() : '?'}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white",
                  chat.status === 'online' ? "bg-green-500" : "bg-neutral-300"
                )}></div>
              </div>
              
              <div className="ml-4 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-neutral-700 truncate">
                    {chat.name || chat.remoteJid}
                  </h3>
                  <span className="text-xs text-neutral-500">
                    {formatTime(chat.lastMessageAt)}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 truncate">
                  {/* Show last message preview here */}
                  {chat.lastMessageAt ? "Última mensagem" : t('chat.noMessages')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
