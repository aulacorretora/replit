import { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { cn } from '@/lib/utils';
import { Bell, Menu, Globe, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HeaderProps {
  title: string;
  openMobileMenu: () => void;
  toggleSidebar: () => void;
  isSidebarCollapsed: boolean;
}

export default function Header({ title, openMobileMenu, toggleSidebar, isSidebarCollapsed }: HeaderProps) {
  const { language, changeLanguage, languages } = useLanguage();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(1); // Example notification count
  
  // Get user initials for avatar
  const getInitials = () => {
    if (!user?.name) return 'U';
    
    const nameParts = user.name.split(' ');
    if (nameParts.length === 1) return nameParts[0][0].toUpperCase();
    
    return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
  };

  // Get short language code for display
  const getShortLangCode = (langCode: string) => {
    return langCode === 'pt-BR' ? 'PT' : 'EN';
  };

  return (
    <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center">
        {/* Botão para menu móvel - visível apenas em telas pequenas e quando sidebar não está colapsada */}
        {!isSidebarCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 md:hidden"
            onClick={openMobileMenu}
            aria-label="Abrir menu"
          >
            <Menu className="h-6 w-6 text-neutral-500" />
          </Button>
        )}
        
        {/* Botão para contrair/expandir sidebar - visível em todas as telas */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="mr-3 flex"
                onClick={toggleSidebar}
                aria-label={isSidebarCollapsed ? "Expandir menu" : "Contrair menu"}
              >
                {isSidebarCollapsed ? 
                  <PanelLeft className="h-5 w-5 text-neutral-500" /> : 
                  <PanelLeftClose className="h-5 w-5 text-neutral-500" />
                }
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isSidebarCollapsed ? "Expandir menu" : "Contrair menu"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <h2 className="text-lg font-semibold text-neutral-700">{title}</h2>
      </div>
      
      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Language Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 flex items-center text-neutral-500 hover:text-neutral-700">
              <Globe className="h-5 w-5 md:mr-1" />
              <span className="text-sm hidden md:inline">{getShortLangCode(language)}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup value={language} onValueChange={changeLanguage}>
              {Object.entries(languages).map(([code, name]) => (
                <DropdownMenuRadioItem key={code} value={code}>
                  {name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-neutral-500 hover:text-neutral-700">
              <Bell className="h-6 w-6" />
              {notifications > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute top-0 right-0 w-2 h-2 p-0 rounded-full"
                />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 md:w-80">
            <div className="p-4">
              <h3 className="font-medium text-sm mb-1">Notificações</h3>
              {notifications > 0 ? (
                <div className="space-y-2 mt-2">
                  <div className="p-3 bg-neutral-50 rounded-md">
                    <p className="text-sm text-neutral-700">Você tem uma nova mensagem.</p>
                    <p className="text-xs text-neutral-500 mt-1">Há 2 minutos</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-neutral-500">Nenhuma notificação.</p>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* User Avatar */}
        <Avatar className="h-8 w-8 cursor-pointer">
          <AvatarFallback className="bg-neutral-200 text-neutral-700 text-sm">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
