import { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_ENDPOINTS } from '@/lib/constants';
import { apiRequest } from '@/lib/queryClient';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { WebhookEvent } from '@shared/schema';
import { 
  Loader2, 
  Search, 
  Webhook, 
  CheckCircle, 
  XCircle, 
  Copy,
  RefreshCw,
  Filter,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export default function AdminWebhooks() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  
  // Event management state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  // Fetch webhook events
  const { data: webhookEvents, isLoading: loadingEvents } = useQuery({
    queryKey: [API_ENDPOINTS.ADMIN_WEBHOOKS],
    enabled: user?.role === 'admin',
  });
  
  // Reprocess webhook event mutation
  const reprocessMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const response = await apiRequest('POST', `${API_ENDPOINTS.ADMIN_WEBHOOKS}/${eventId}/reprocess`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ADMIN_WEBHOOKS] });
      setDetailsDialogOpen(false);
      toast({
        title: t('admin.reprocessSuccess'),
        description: t('admin.eventReprocessed'),
      });
    },
    onError: (error) => {
      toast({
        title: t('admin.reprocessError'),
        description: error.toString(),
        variant: 'destructive',
      });
    },
  });

  // Copy webhook URL to clipboard
  const copyWebhookUrl = () => {
    const baseUrl = window.location.origin;
    const hotmartWebhookUrl = `${baseUrl}${API_ENDPOINTS.WEBHOOK_HOTMART}`;
    
    navigator.clipboard.writeText(hotmartWebhookUrl).then(() => {
      toast({
        title: t('admin.copied'),
        description: hotmartWebhookUrl,
      });
    });
  };
  
  // Show event details
  const showEventDetails = (event: WebhookEvent) => {
    setSelectedEvent(event);
    setDetailsDialogOpen(true);
  };
  
  // Format date
  const formatDate = (date?: string) => {
    if (!date) return '';
    
    return format(new Date(date), 'dd/MM/yyyy HH:mm:ss', {
      locale: language === 'pt-BR' ? ptBR : enUS
    });
  };
  
  // Filter events based on tab and search query
  const filterEvents = () => {
    if (!webhookEvents) return [];
    
    let filtered = webhookEvents;
    
    // Filter by tab
    if (activeTab === 'pending') {
      filtered = filtered.filter(event => !event.processed && !event.error);
    } else if (activeTab === 'processed') {
      filtered = filtered.filter(event => event.processed && !event.error);
    } else if (activeTab === 'failed') {
      filtered = filtered.filter(event => !!event.error);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => 
        event.provider.toLowerCase().includes(query) ||
        event.event.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };
  
  const filteredEvents = filterEvents();
  
  // Redirect non-admin users
  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-100">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">{t('admin.accessDenied')}</h2>
              <p className="text-neutral-500 mb-6">{t('admin.adminOnly')}</p>
              <Button asChild className="bg-primary hover:bg-primary-dark">
                <a href="/">{t('admin.backToDashboard')}</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-800 text-white">
      <Sidebar isMobileOpen={sidebarOpen} closeMobileMenu={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={t('admin.webhooks')} openMobileMenu={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">{t('admin.webhooks')}</h1>
              <p className="text-neutral-400">{t('admin.manageWebhooksDesc')}</p>
            </div>
            
            <Button 
              onClick={() => queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ADMIN_WEBHOOKS] })} 
              variant="outline"
              className="mt-4 md:mt-0 border-neutral-700 text-white hover:bg-neutral-700"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('admin.refresh')}
            </Button>
          </div>
          
          {/* Hotmart Webhook Card */}
          <Card className="bg-neutral-900 border-neutral-800 text-white mb-6">
            <CardHeader>
              <CardTitle>{t('admin.hotmartWebhook')}</CardTitle>
              <CardDescription className="text-neutral-400">
                {t('admin.hotmartWebhookDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="w-full relative">
                  <Input
                    value={`${window.location.origin}${API_ENDPOINTS.WEBHOOK_HOTMART}`}
                    readOnly
                    className="bg-neutral-800 border-neutral-700 text-white pr-24"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute right-1 top-1 h-8 border-neutral-700 text-white hover:bg-neutral-700"
                    onClick={copyWebhookUrl}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    {t('admin.copyUrl')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Events List */}
          <Card className="bg-neutral-900 border-neutral-800 text-white">
            <CardHeader className="pb-2">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <CardTitle>{t('admin.eventsList')}</CardTitle>
                <div className="mt-2 md:mt-0 relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                  <Input 
                    placeholder={t('admin.searchInstances')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-400 w-full md:w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-4 mb-4 bg-neutral-800">
                  <TabsTrigger 
                    value="all" 
                    className="data-[state=active]:bg-neutral-700 data-[state=active]:text-white"
                  >
                    {t('admin.allEvents')}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="pending" 
                    className="data-[state=active]:bg-neutral-700 data-[state=active]:text-white"
                  >
                    {t('admin.pendingEvents')}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="processed" 
                    className="data-[state=active]:bg-neutral-700 data-[state=active]:text-white"
                  >
                    {t('admin.processedEvents')}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="failed" 
                    className="data-[state=active]:bg-neutral-700 data-[state=active]:text-white"
                  >
                    {t('admin.failedEvents')}
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value={activeTab}>
                  {loadingEvents ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                      <span className="ml-2 text-neutral-400">{t('common.loading')}</span>
                    </div>
                  ) : filteredEvents.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-neutral-700">
                            <TableHead>{t('admin.provider')}</TableHead>
                            <TableHead>{t('admin.event')}</TableHead>
                            <TableHead>{t('admin.processed')}</TableHead>
                            <TableHead>{t('admin.timestamp')}</TableHead>
                            <TableHead className="text-right">{t('admin.actions')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredEvents.map((event) => (
                            <TableRow key={event.id} className="border-neutral-700">
                              <TableCell>
                                <Badge variant="outline" className="border-neutral-600 text-white">
                                  {event.provider}
                                </Badge>
                              </TableCell>
                              <TableCell>{event.event}</TableCell>
                              <TableCell>
                                {event.error ? (
                                  <div className="flex items-center">
                                    <XCircle className="h-4 w-4 text-red-500 mr-1" />
                                    <span className="text-red-400 text-sm">Failed</span>
                                  </div>
                                ) : event.processed ? (
                                  <div className="flex items-center">
                                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                                    <span className="text-green-400 text-sm">Processed</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center">
                                    <Loader2 className="h-4 w-4 text-yellow-500 mr-1 animate-spin" />
                                    <span className="text-yellow-400 text-sm">Pending</span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>{formatDate(event.createdAt)}</TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-neutral-800 border-neutral-700 text-white">
                                    <DropdownMenuItem 
                                      onClick={() => showEventDetails(event)}
                                      className="cursor-pointer hover:bg-neutral-700"
                                    >
                                      <Eye className="mr-2 h-4 w-4" />
                                      {t('admin.viewPayload')}
                                    </DropdownMenuItem>
                                    {(event.error || !event.processed) && (
                                      <DropdownMenuItem 
                                        onClick={() => reprocessMutation.mutate(event.id)}
                                        className="cursor-pointer hover:bg-neutral-700"
                                        disabled={reprocessMutation.isPending}
                                      >
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        {t('admin.resend')}
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Webhook className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-neutral-300 mb-1">
                        {searchQuery ? t('admin.noSearchResults') : t('admin.noWebhooks')}
                      </h3>
                      <p className="text-neutral-400 mb-4">
                        {searchQuery ? t('admin.tryDifferentSearch') : "Webhook events will appear here once received"}
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </main>
      </div>
      
      {/* Event Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-w-3xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t('admin.webhookDetails')}</DialogTitle>
            <DialogDescription className="text-neutral-400">
              {selectedEvent ? `${selectedEvent.provider} - ${selectedEvent.event}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-auto max-h-[60vh] pr-2">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-neutral-300">{t('admin.timestamp')}</h3>
              <p className="text-sm text-neutral-400">
                {selectedEvent ? formatDate(selectedEvent.createdAt) : ""}
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-neutral-300">{t('admin.status')}</h3>
              <div>
                {selectedEvent?.error ? (
                  <div className="flex items-center">
                    <XCircle className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-red-400 text-sm">Failed: {selectedEvent.error}</span>
                  </div>
                ) : selectedEvent?.processed ? (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-400 text-sm">Processed at {selectedEvent.processedAt ? formatDate(selectedEvent.processedAt) : ""}</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 text-yellow-500 mr-1 animate-spin" />
                    <span className="text-yellow-400 text-sm">Pending</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-neutral-300">{t('admin.payload')}</h3>
              <pre className="bg-neutral-800 p-4 rounded-md text-sm text-neutral-300 overflow-x-auto">
                {selectedEvent ? JSON.stringify(selectedEvent.payload, null, 2) : ""}
              </pre>
            </div>
          </div>
          <DialogFooter>
            {selectedEvent && (selectedEvent.error || !selectedEvent.processed) ? (
              <Button 
                onClick={() => selectedEvent && reprocessMutation.mutate(selectedEvent.id)}
                className="bg-primary hover:bg-primary-dark"
                disabled={reprocessMutation.isPending}
              >
                {reprocessMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('admin.reprocessing')}
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t('admin.reprocessEvent')}
                  </>
                )}
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={() => setDetailsDialogOpen(false)}
                className="border-neutral-700 text-white hover:bg-neutral-700"
              >
                {t('common.cancel')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
