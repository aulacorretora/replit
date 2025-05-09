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
import { Instance } from '@shared/schema';
import { 
  Loader2, 
  Search, 
  RefreshCw, 
  QrCode, 
  Smartphone, 
  Wifi,
  WifiOff,
  MoreHorizontal, 
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import QRCodeModal from '@/components/modals/QRCodeModal';
import InstanceStatusModal from '@/components/modals/InstanceStatusModal';

export default function AdminInstances() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  
  // Search and filtering state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Instance management state
  const [selectedInstanceId, setSelectedInstanceId] = useState<number | null>(null);
  const [qrCodeModalOpen, setQrCodeModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Fetch all instances (admin view)
  const { data: instances, isLoading: loadingInstances } = useQuery({
    queryKey: [API_ENDPOINTS.ADMIN_INSTANCES],
    enabled: user?.role === 'admin',
  });
  
  // Fetch selected instance details including QR code
  const { data: selectedInstance, isLoading: loadingInstance } = useQuery({
    queryKey: [API_ENDPOINTS.ADMIN_INSTANCES, selectedInstanceId],
    enabled: !!selectedInstanceId && (statusModalOpen || qrCodeModalOpen),
  });
  
  // Connect instance mutation
  const connectMutation = useMutation({
    mutationFn: async (instanceId: number) => {
      const response = await apiRequest('POST', `${API_ENDPOINTS.ADMIN_INSTANCES}/${instanceId}/connect`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ADMIN_INSTANCES] });
      toast({
        title: t('admin.instanceConnecting'),
        description: t('admin.instanceConnectingDesc'),
      });
    },
    onError: (error) => {
      toast({
        title: t('admin.error'),
        description: error.toString(),
        variant: 'destructive',
      });
    },
  });
  
  // Disconnect instance mutation
  const disconnectMutation = useMutation({
    mutationFn: async (instanceId: number) => {
      const response = await apiRequest('POST', `${API_ENDPOINTS.ADMIN_INSTANCES}/${instanceId}/disconnect`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ADMIN_INSTANCES] });
      toast({
        title: t('admin.instanceDisconnected'),
        description: t('admin.instanceDisconnectedDesc'),
      });
    },
    onError: (error) => {
      toast({
        title: t('admin.error'),
        description: error.toString(),
        variant: 'destructive',
      });
    },
  });
  
  // Delete instance mutation
  const deleteMutation = useMutation({
    mutationFn: async (instanceId: number) => {
      await apiRequest('DELETE', `${API_ENDPOINTS.ADMIN_INSTANCES}/${instanceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ADMIN_INSTANCES] });
      setDeleteDialogOpen(false);
      toast({
        title: t('admin.instanceDeleted'),
        description: t('admin.instanceDeletedDesc'),
      });
    },
    onError: (error) => {
      toast({
        title: t('admin.error'),
        description: error.toString(),
        variant: 'destructive',
      });
    },
  });
  
  // Generate new QR code
  const generateQRCode = async (instanceId: number) => {
    try {
      // First disconnect the instance
      await apiRequest('POST', `${API_ENDPOINTS.ADMIN_INSTANCES}/${instanceId}/disconnect`);
      // Then reconnect to generate a new QR code
      await apiRequest('POST', `${API_ENDPOINTS.ADMIN_INSTANCES}/${instanceId}/connect`);
      
      // Refresh the instance data
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ADMIN_INSTANCES, instanceId] });
      
      toast({
        title: t('admin.qrCodeGenerating'),
        description: t('admin.qrCodeGeneratingDesc'),
      });
    } catch (error) {
      toast({
        title: t('admin.error'),
        description: error.toString(),
        variant: 'destructive',
      });
    }
  };
  
  // Show QR code modal
  const handleShowQRCode = (instance: Instance) => {
    setSelectedInstanceId(instance.id);
    setQrCodeModalOpen(true);
  };
  
  // Show status modal
  const handleShowStatus = (instance: Instance) => {
    setSelectedInstanceId(instance.id);
    setStatusModalOpen(true);
  };
  
  // Confirm delete
  const handleConfirmDelete = (instance: Instance) => {
    setSelectedInstanceId(instance.id);
    setDeleteDialogOpen(true);
  };
  
  // Format date
  const formatDate = (date?: string) => {
    if (!date) return '-';
    
    return format(new Date(date), 'dd/MM/yyyy HH:mm', {
      locale: language === 'pt-BR' ? ptBR : enUS
    });
  };
  
  // Get status badge class
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-600 hover:bg-green-700">{t('admin.connected')}</Badge>;
      case 'connecting':
        return <Badge className="bg-yellow-600 hover:bg-yellow-700">{t('admin.connecting')}</Badge>;
      case 'qr_ready':
        return <Badge className="bg-blue-600 hover:bg-blue-700">{t('admin.qrReady')}</Badge>;
      case 'disconnected':
      default:
        return <Badge variant="outline" className="text-neutral-400 border-neutral-600">{t('admin.disconnected')}</Badge>;
    }
  };
  
  // Filter instances by search query
  const filteredInstances = instances?.filter(instance => 
    instance.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (instance.phoneNumber && instance.phoneNumber.includes(searchQuery))
  ) || [];
  
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
        <Header title={t('admin.instances')} openMobileMenu={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">{t('admin.instances')}</h1>
              <p className="text-neutral-400">{t('admin.manageInstancesDesc')}</p>
            </div>
            
            <Button 
              onClick={() => queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ADMIN_INSTANCES] })} 
              variant="outline"
              className="mt-4 md:mt-0 border-neutral-700 text-white hover:bg-neutral-700"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('admin.refresh')}
            </Button>
          </div>
          
          {/* Search and Filters */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
              <Input 
                placeholder={t('admin.searchInstances')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-400"
              />
            </div>
          </div>
          
          {/* Instances Table */}
          <Card className="bg-neutral-900 border-neutral-800 text-white">
            <CardHeader className="pb-2">
              <CardTitle>{t('admin.instancesList')}</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingInstances ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <span className="ml-2 text-neutral-400">{t('admin.loadingInstances')}</span>
                </div>
              ) : filteredInstances.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-neutral-700">
                        <TableHead>{t('admin.instance')}</TableHead>
                        <TableHead>{t('admin.owner')}</TableHead>
                        <TableHead>{t('admin.status')}</TableHead>
                        <TableHead>{t('admin.phoneNumber')}</TableHead>
                        <TableHead>{t('admin.createdAt')}</TableHead>
                        <TableHead>{t('admin.lastConnected')}</TableHead>
                        <TableHead className="text-right">{t('admin.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInstances.map((instance) => (
                        <TableRow key={instance.id} className="border-neutral-700">
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 mr-3">
                                <Smartphone className="h-5 w-5" />
                              </div>
                              <div className="text-white">
                                {instance.name}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <div className="w-6 h-6 rounded-full bg-neutral-700 flex items-center justify-center text-neutral-300 mr-2 text-xs">
                                {instance.user?.name?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <span>{instance.user?.name || '—'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(instance.status)}
                          </TableCell>
                          <TableCell>
                            {instance.phoneNumber || '—'}
                          </TableCell>
                          <TableCell>{formatDate(instance.createdAt)}</TableCell>
                          <TableCell>{instance.lastConnectedAt ? formatDate(instance.lastConnectedAt) : '—'}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-neutral-800 border-neutral-700 text-white">
                                <DropdownMenuLabel>{t('admin.actions')}</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-neutral-700" />
                                <DropdownMenuItem 
                                  onClick={() => handleShowQRCode(instance)}
                                  className="cursor-pointer hover:bg-neutral-700"
                                >
                                  <QrCode className="mr-2 h-4 w-4" />
                                  {t('admin.showQR')}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleShowStatus(instance)}
                                  className="cursor-pointer hover:bg-neutral-700"
                                >
                                  <Smartphone className="mr-2 h-4 w-4" />
                                  {t('admin.viewDetails')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-neutral-700" />
                                {instance.connected ? (
                                  <DropdownMenuItem 
                                    onClick={() => disconnectMutation.mutate(instance.id)}
                                    className="cursor-pointer hover:bg-neutral-700"
                                    disabled={disconnectMutation.isPending}
                                  >
                                    <WifiOff className="mr-2 h-4 w-4" />
                                    {t('admin.disconnect')}
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem 
                                    onClick={() => connectMutation.mutate(instance.id)}
                                    className="cursor-pointer hover:bg-neutral-700"
                                    disabled={connectMutation.isPending}
                                  >
                                    <Wifi className="mr-2 h-4 w-4" />
                                    {t('admin.connect')}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => handleConfirmDelete(instance)}
                                  className="cursor-pointer text-red-500 hover:bg-neutral-700 focus:text-red-500"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {t('admin.delete')}
                                </DropdownMenuItem>
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
                  <Smartphone className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-neutral-300 mb-1">
                    {searchQuery ? t('admin.noSearchResults') : t('admin.noInstances')}
                  </h3>
                  <p className="text-neutral-400 mb-4">
                    {searchQuery ? t('admin.tryDifferentSearch') : t('admin.usersCanCreateInstances')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
      
      {/* QR Code Modal */}
      <QRCodeModal
        open={qrCodeModalOpen}
        onClose={() => setQrCodeModalOpen(false)}
        qrCode={selectedInstance?.qrCode || null}
        onRefresh={() => selectedInstanceId && generateQRCode(selectedInstanceId)}
        isLoading={loadingInstance || connectMutation.isPending}
      />
      
      {/* Instance Status Modal */}
      <InstanceStatusModal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        instance={selectedInstance || null}
        onDisconnect={() => {
          if (selectedInstanceId) {
            disconnectMutation.mutate(selectedInstanceId);
            setStatusModalOpen(false);
          }
        }}
        onReconnect={() => {
          if (selectedInstanceId) {
            connectMutation.mutate(selectedInstanceId);
            setStatusModalOpen(false);
          }
        }}
        isLoading={connectMutation.isPending || disconnectMutation.isPending}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-neutral-900 border-neutral-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              {t('admin.deleteInstanceConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-neutral-700 text-white hover:bg-neutral-800">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedInstanceId && deleteMutation.mutate(selectedInstanceId)}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t('admin.deleteInstance')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
