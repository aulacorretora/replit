import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Home,
  Cpu,
  User,
  Settings,
  LogOut,
  Bot,
  Workflow,
  Key,
  BarChart,
  Users,
  ChevronRight,
  ChevronLeft,
  X
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  isMobileOpen: boolean;
  closeMobileMenu: () => void;
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ isMobileOpen, closeMobileMenu, isCollapsed, toggleSidebar }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  
  // Extract first and last initials from user name
  const getInitials = () => {
    if (!user?.name) return 'U';
    
    const nameParts = user.name.split(' ');
    if (nameParts.length === 1) return nameParts[0][0].toUpperCase();
    
    return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
  };

  // NavLink component for consistent styling
  const NavLink = ({ to, icon: Icon, label }: { to: string, icon: React.ElementType, label: string }) => {
    const isActive = location === to;
    
    // Versão normal do link (com texto)
    const fullLink = (
      <Link 
        href={to}
        className={cn(
          "flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors",
          isActive 
            ? "text-primary bg-neutral-100 font-medium" 
            : "text-neutral-600 hover:bg-neutral-100 hover:text-primary-dark"
        )}
        onClick={() => closeMobileMenu()}
      >
        <Icon className="h-5 w-5 mr-3" />
        <span className="whitespace-nowrap overflow-hidden">{label}</span>
      </Link>
    );
    
    // Versão colapsada do link (apenas ícone)
    const collapsedLink = (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link 
              href={to}
              className={cn(
                "flex justify-center items-center p-2 mx-auto rounded-lg transition-colors",
                isActive 
                  ? "text-primary bg-neutral-100 font-medium" 
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-primary-dark"
              )}
              onClick={() => closeMobileMenu()}
            >
              <Icon className="h-5 w-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    
    return isCollapsed ? collapsedLink : fullLink;
  };

  return (
    <aside className={cn(
      "bg-white h-full border-r border-neutral-200 flex flex-col",
      "fixed inset-y-0 left-0 z-50 transition-all duration-300 transform",
      "md:relative md:translate-x-0",
      isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      isCollapsed ? "w-20" : "w-64"
    )}>
      {/* Logo & Title */}
      <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
        <div className={cn("flex items-center", isCollapsed ? "justify-center w-full" : "space-x-2")}>
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && <h1 className="text-xl font-bold text-neutral-700">ZapBan</h1>}
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden" 
          onClick={closeMobileMenu}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Navigation */}
      <nav className={cn(
        "flex-1 py-4 overflow-y-auto",
        isCollapsed ? "px-2" : "px-4"  
      )}>
        {!isCollapsed && (
          <div className="px-4 mb-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            {t('sidebar.conversations')}
          </div>
        )}
        
        <NavLink to="/" icon={Home} label={t('sidebar.dashboard')} />
        <NavLink to="/chat" icon={MessageSquare} label={t('sidebar.chats')} />
        <NavLink to="/instances" icon={Cpu} label={t('sidebar.instances')} />
        
        {!isCollapsed && (
          <div className="px-4 mt-6 mb-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            {t('sidebar.tools') || 'Ferramentas'}
          </div>
        )}
        {isCollapsed && <div className="my-6"></div>}
        
        <NavLink to="/ai-agents" icon={Bot} label={t('sidebar.aiAgents') || 'Agente Humanizado'} />
        <NavLink to="/automations" icon={Workflow} label={t('sidebar.automations') || 'Automações'} />
        <NavLink to="/api-keys" icon={Key} label={t('sidebar.apiKeys') || 'Chaves de API'} />
        <NavLink to="/analytics" icon={BarChart} label={t('sidebar.analytics') || 'Relatórios'} />
        
        {!isCollapsed && (
          <div className="px-4 mt-6 mb-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            {t('sidebar.settings')}
          </div>
        )}
        {isCollapsed && <div className="my-6"></div>}
        
        <NavLink to="/profile" icon={User} label={t('sidebar.profile')} />
        <NavLink to="/settings" icon={Settings} label={t('sidebar.settings')} />
        
        {/* Admin section only for admin users */}
        {user?.role === 'admin' && (
          <>
            {!isCollapsed && (
              <div className="px-4 mt-6 mb-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                {t('sidebar.admin')}
              </div>
            )}
            {isCollapsed && <div className="my-6"></div>}
            <NavLink to="/admin" icon={Settings} label={t('sidebar.adminPanel')} />
          </>
        )}
        
        {/* Botão de colapsar para desktop - visível só em telas grandes */}
        <div className="mt-6 hidden md:block">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className={cn(
              "w-full text-neutral-500",
              isCollapsed ? "justify-center" : "justify-between"
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <span className="text-sm">Recolher menu</span>
                <ChevronLeft className="h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </nav>
      
      {/* User profile */}
      <div className={cn(
        "mt-auto p-4 border-t border-neutral-200",
        isCollapsed ? "flex justify-center" : ""
      )}>
        {isCollapsed ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar>
                  <AvatarImage src="" alt={user?.name || ""} />
                  <AvatarFallback className="bg-neutral-200 text-neutral-600">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="right">
                <div className="py-1">
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-xs text-neutral-500">{user?.email}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src="" alt={user?.name || ""} />
              <AvatarFallback className="bg-neutral-200 text-neutral-600">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-700 truncate">{user?.name}</p>
              <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <LogOut className="h-4 w-4 text-neutral-400 hover:text-neutral-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('user.account')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link 
                    href="/profile"
                    className="w-full flex items-center cursor-pointer"
                  >
                    <User className="mr-2 h-4 w-4" />
                    {t('user.profile')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link 
                    href="/settings"
                    className="w-full flex items-center cursor-pointer"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    {t('user.settings')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('user.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </aside>
  );
}
