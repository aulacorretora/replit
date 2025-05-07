import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useInstances } from '@/hooks/use-instance';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ContactList from '@/components/chat/ContactList';
import ChatWindow from '@/components/chat/ChatWindow';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useMobile } from '@/hooks/use-mobile';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Instance } from '@shared/schema';

export default function Chat() {
  const { t } = useLanguage();
  const { instances, loadingInstances } = useInstances();
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  
  const [selectedInstanceId, setSelectedInstanceId] = useState<number | undefined>(undefined);
  const [selectedChatId, setSelectedChatId] = useState<number | undefined>(undefined);
  
  // Set first active instance as default when instances load and handle auto-selection
  useEffect(() => {
    if (instances && instances.length > 0 && !selectedInstanceId) {
      console.log("Attempting to auto-select instance from:", instances);
      
      // First try to find a connected instance with proper type annotation
      const connectedInstances = instances.filter((instance: { connected: boolean }) => instance.connected);
      const activeInstance = connectedInstances.length > 0 ? connectedInstances[0] : null;
      
      if (activeInstance) {
        console.log("Selected active instance:", activeInstance.id);
        setSelectedInstanceId(activeInstance.id);
      } else if (instances[0]) {
        // Fall back to the first instance if none are connected
        console.log("No active instances, selecting first available:", instances[0].id);
        setSelectedInstanceId(instances[0].id);
      }
    }
  }, [instances, selectedInstanceId]);
  
  // Debug log for tracking state changes
  useEffect(() => {
    console.log("Chat component state - selectedInstanceId:", selectedInstanceId, "selectedChatId:", selectedChatId);
    console.log("Instances:", instances);
  }, [instances, selectedInstanceId, selectedChatId]);
  
  const handleInstanceChange = (value: string) => {
    setSelectedInstanceId(Number(value));
    setSelectedChatId(undefined);
  };
  
  const handleChatSelect = (chatId: number) => {
    setSelectedChatId(chatId);
    
    // On mobile, hide the contact list when a chat is selected
    if (isMobile) {
      setSidebarOpen(false);
    }
  };
  
  // No instances state
  if (!loadingInstances && (!instances || instances.length === 0)) {
    return (
      <div className="flex h-screen overflow-hidden bg-neutral-100">
        <Sidebar isMobileOpen={sidebarOpen} closeMobileMenu={() => setSidebarOpen(false)} />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title={t('chat.title')} openMobileMenu={() => setSidebarOpen(true)} />
          
          <main className="flex-1 overflow-auto p-4 md:p-6 flex items-center justify-center">
            <Card className="max-w-md w-full">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-neutral-100 rounded-full mx-auto flex items-center justify-center mb-4">
                    <AlertCircle className="h-8 w-8 text-neutral-400" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">{t('chat.noInstances')}</h2>
                  <p className="text-neutral-500 mb-6">{t('chat.createInstanceFirst')}</p>
                  <Button asChild className="bg-primary hover:bg-primary-dark">
                    <Link href="/instances">
                      {t('chat.goToInstances')}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen overflow-hidden bg-neutral-100">
      <Sidebar isMobileOpen={sidebarOpen} closeMobileMenu={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={t('chat.title')} openMobileMenu={() => setSidebarOpen(true)} />
        
        <div className="px-4 py-2 bg-white border-b border-neutral-200">
          <div className="flex items-center space-x-4">
            <div className="w-40">
              <Label htmlFor="instance-select" className="text-xs text-neutral-500 mb-1 block">
                {t('chat.selectInstance')}
              </Label>
              <Select
                value={selectedInstanceId?.toString()}
                onValueChange={handleInstanceChange}
                disabled={loadingInstances}
              >
                <SelectTrigger id="instance-select" className="w-full">
                  <SelectValue placeholder={t('chat.selectInstance')} />
                </SelectTrigger>
                <SelectContent>
                  {instances?.map((instance: Instance) => (
                    <SelectItem key={instance.id} value={instance.id.toString()}>
                      <div className="flex items-center">
                        <span>{instance.name}</span>
                        <span className={`ml-2 w-2 h-2 rounded-full ${instance.connected ? 'bg-green-500' : 'bg-neutral-300'}`}></span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <div className="flex-1 flex overflow-hidden">
          {/* Show/hide contact list based on mobile state and selection */}
          <div className={`${(isMobile && selectedChatId && !sidebarOpen) ? 'hidden' : 'block'}`}>
            <ContactList 
              instanceId={selectedInstanceId} 
              selectedChatId={selectedChatId}
              onSelectChat={handleChatSelect}
            />
          </div>
          
          {/* Show/hide chat window based on mobile state and selection */}
          <div className={`flex-1 ${(isMobile && !selectedChatId) ? 'hidden' : 'block'}`}>
            <ChatWindow 
              chatId={selectedChatId}
              instanceId={selectedInstanceId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
