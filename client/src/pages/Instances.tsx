import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useInstances, useInstance } from '@/hooks/use-instance';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import QRCodeModal from '@/components/modals/QRCodeModal';
import InstanceStatusModal from '@/components/modals/InstanceStatusModal';
import { useMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { Loader2, Plus, Smartphone, QrCode, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

export default function Instances() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  
  const { 
    instances, 
    loadingInstances, 
    createInstance, 
    isCreating,
    deleteInstance,
    isDeleting
  } = useInstances();
  
  const [newInstanceName, setNewInstanceName] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // Selected instance states
  const [selectedInstanceId, setSelectedInstanceId] = useState<number | null>(null);
  const [qrCodeModalOpen, setQrCodeModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Verificar autenticação
  useEffect(() => {
    if (!authLoading && !user) {
      console.log('User not authenticated, redirecting to login');
      toast({
        title: 'Autenticação necessária',
        description: 'Faça login para acessar suas instâncias.',
        variant: 'destructive',
      });
      navigate('/auth');
    }
  }, [user, authLoading, navigate, toast]);
  
  // Get the selected instance details
  const {
    instance: selectedInstance,
    qrCode,
    loadingQR,
    connectInstance,
    isConnecting,
    disconnectInstance,
    isDisconnecting,
    resetInstance,
    isResetting,
    generateQRCode
  } = useInstance(selectedInstanceId || undefined);
  
  const handleCreateInstance = async () => {
    if (!newInstanceName.trim()) {
      toast({
        title: t('instance.nameRequired'),
        variant: 'destructive',
      });
      return;
    }
    
    await createInstance(newInstanceName.trim());
    setNewInstanceName('');
    setIsCreateDialogOpen(false);
  };
  
  const handleDeleteInstance = async () => {
    if (selectedInstanceId) {
      await deleteInstance(selectedInstanceId);
      setDeleteDialogOpen(false);
      setSelectedInstanceId(null);
    }
  };
  
  const handleShowQRCode = (id: number) => {
    setSelectedInstanceId(id);
    setQrCodeModalOpen(true);
  };
  
  const handleShowStatus = (id: number) => {
    setSelectedInstanceId(id);
    setStatusModalOpen(true);
  };
  
  const handleConfirmDelete = (id: number) => {
    setSelectedInstanceId(id);
    setDeleteDialogOpen(true);
  };
  
  // Format date
  const formatDate = (date?: string) => {
    if (!date) return '';
    
    return format(new Date(date), 'dd/MM/yyyy HH:mm', {
      locale: language === 'pt-BR' ? ptBR : enUS
    });
  };
  
  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800';
      case 'connecting':
        return 'bg-yellow-100 text-yellow-800';
      case 'qr_ready':
        return 'bg-blue-100 text-blue-800';
      case 'disconnected':
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral-800">{t('instances.title')}</h1>
            <p className="text-neutral-500">{t('instances.subtitle')}</p>
          </div>
          
          <Button 
            onClick={() => setIsCreateDialogOpen(true)} 
            className="mt-4 md:mt-0 bg-primary hover:bg-primary-dark"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('instances.createNew')}
          </Button>
        </div>
        
        {/* Instances Grid */}
        {loadingInstances ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <span className="ml-2 text-neutral-500">{t('instances.loading')}</span>
          </div>
        ) : instances && instances.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {instances.map(instance => (
              <Card key={instance.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{instance.name}</CardTitle>
                      <CardDescription>{instance.phoneNumber || t('instances.noPhoneNumber')}</CardDescription>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(instance.status)}`}>
                      {t(`instances.status.${instance.status}`)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">{t('instances.created')}:</span>
                      <span className="text-neutral-700">{formatDate(instance.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">{t('instances.lastConnected')}:</span>
                      <span className="text-neutral-700">
                        {instance.lastConnectedAt ? formatDate(instance.lastConnectedAt) : t('instances.never')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">{t('instances.connectionStatus')}:</span>
                      <span className="text-neutral-700">
                        {instance.connected ? (
                          <span className="flex items-center text-green-600">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {t('instances.active')}
                          </span>
                        ) : (
                          <span className="flex items-center text-red-600">
                            <XCircle className="h-4 w-4 mr-1" />
                            {t('instances.inactive')}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between pt-4 border-t">
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleShowQRCode(instance.id)}
                    >
                      <QrCode className="h-4 w-4 mr-1" />
                      {t('instances.qrCode')}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleShowStatus(instance.id)}
                    >
                      <Smartphone className="h-4 w-4 mr-1" />
                      {t('instances.status.title')}
                    </Button>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleConfirmDelete(instance.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                <Smartphone className="h-8 w-8 text-neutral-400" />
              </div>
              <h3 className="text-lg font-medium text-neutral-700 mb-2">{t('instances.noInstances')}</h3>
              <p className="text-neutral-500 text-center mb-4">{t('instances.getStarted')}</p>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)} 
                className="bg-primary hover:bg-primary-dark"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('instances.createNew')}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Create Instance Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('instances.createNew')}</DialogTitle>
            <DialogDescription>{t('instances.createDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t('instances.name')}</Label>
              <Input
                id="name"
                placeholder={t('instances.namePlaceholder')}
                value={newInstanceName}
                onChange={(e) => setNewInstanceName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCreateDialogOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleCreateInstance}
              className="bg-primary hover:bg-primary-dark"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('instances.creating')}
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('instances.create')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* QR Code Modal */}
      <QRCodeModal
        open={qrCodeModalOpen}
        onClose={() => setQrCodeModalOpen(false)}
        qrCode={qrCode}
        onRefresh={() => {
          connectInstance();
          generateQRCode();
        }}
        onReset={() => resetInstance()}
        isLoading={loadingQR || isConnecting}
        isResetting={isResetting}
      />
      
      {/* Instance Status Modal */}
      <InstanceStatusModal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        instance={selectedInstance || null}
        onDisconnect={() => {
          disconnectInstance();
          setStatusModalOpen(false);
        }}
        onReconnect={() => {
          connectInstance();
          setStatusModalOpen(false);
        }}
        onReset={() => {
          resetInstance();
          // Mantemos o modal aberto para ver o status da reinicialização
        }}
        isLoading={isConnecting || isDisconnecting}
        isResetting={isResetting}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('instances.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('instances.deleteWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInstance}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {t('instances.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}