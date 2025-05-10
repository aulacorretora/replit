import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import supabase from '@/lib/supabase';

// API Endpoints
const INSTANCES_API = '/api/instances';

// Interfaces para tipagem
interface Instance {
  id: number;
  name: string;
  userId: number;
  status: string;
  connected: boolean;
  phoneNumber: string | null;
  qrCode: string | null;
  qrCodeGeneratedAt: string | null;
  deviceInfo: any | null;
  createdAt: string;
  lastConnectedAt: string | null;
  user?: any;
}

// Funções de API
const getInstances = async (): Promise<Instance[]> => {
  const response = await apiRequest('GET', INSTANCES_API);
  if (!response.ok) {
    throw new Error('Falha ao buscar instâncias');
  }
  return response.json();
};

const getInstance = async (id: number): Promise<Instance> => {
  const response = await apiRequest('GET', `${INSTANCES_API}/${id}`);
  if (!response.ok) {
    throw new Error('Falha ao buscar instância');
  }
  return response.json();
};

const getQrCode = async (id: number): Promise<{ qrCode: string | null }> => {
  const response = await apiRequest('GET', `${INSTANCES_API}/${id}/qr`);
  if (!response.ok) {
    throw new Error('Falha ao obter QR code');
  }
  return response.json();
};

const createInstance = async (name: string): Promise<Instance> => {
  const response = await apiRequest('POST', INSTANCES_API, { name });
  if (!response.ok) {
    throw new Error('Falha ao criar instância');
  }
  return response.json();
};

const deleteInstance = async (id: number): Promise<void> => {
  const response = await apiRequest('DELETE', `${INSTANCES_API}/${id}`);
  if (!response.ok) {
    throw new Error('Falha ao excluir instância');
  }
};

const connectInstance = async (id: number): Promise<Instance> => {
  const response = await apiRequest('POST', `${INSTANCES_API}/${id}/connect`);
  if (!response.ok) {
    throw new Error('Falha ao conectar instância');
  }
  return response.json();
};

const disconnectInstance = async (id: number): Promise<Instance> => {
  const response = await apiRequest('POST', `${INSTANCES_API}/${id}/disconnect`);
  if (!response.ok) {
    throw new Error('Falha ao desconectar instância');
  }
  return response.json();
};

const resetInstance = async (id: number): Promise<Instance> => {
  const response = await apiRequest('POST', `${INSTANCES_API}/${id}/reset`);
  if (!response.ok) {
    throw new Error('Falha ao resetar instância');
  }
  return response.json();
};

// Hook para lidar com múltiplas instâncias
export const useInstances = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Query para buscar todas as instâncias
  const { 
    data: instances = [], 
    isLoading: loadingInstances, 
    error: instancesError,
    refetch: refetchInstances
  } = useQuery({
    queryKey: ['instances'],
    queryFn: getInstances,
  });

  // Create instance mutation
  const createInstanceMutation = useMutation({
    mutationFn: async (name: string) => {
      console.log("Creating instance directly in Supabase");
      
      if (!user || !user.id) {
        throw new Error('Usuário não autenticado');
      }
      
      const { data, error } = await supabase
        .from('instances')
        .insert([
          {
            user_id: user.id,
            users_uuid: user.id, // Use UUID from Supabase Auth
            name: name || 'Nova Instância',
            status: 'inactive',
            created_at: new Date().toISOString(),
          },
        ])
        .select();
      
      if (error) {
        console.error('Erro ao criar instância no Supabase:', error.message);
        throw new Error(`Erro ao criar instância: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        throw new Error('Nenhum dado retornado ao criar instância');
      }
      
      console.log("Instance created successfully in Supabase:", data[0]);
      return data[0];
    },
    onSuccess: (data) => {
      console.log("Instance created successfully:", data);
      
      // Invalidar todas as queries relacionadas às instâncias
      queryClient.invalidateQueries({ queryKey: ['instances'] });
      
      toast({
        title: t('instances.created'),
        description: t('instances.createdDesc'),
      });
      
      // Após criar a instância, iniciar automaticamente a conexão
      if (data && data.id) {
        console.log("Automatically connecting new instance:", data.id);
        
        // Adicionar dados da nova instância ao cache imediatamente
        queryClient.setQueryData(['instance', data.id], data);
        
        // Esperamos um momento antes de iniciar a conexão
        setTimeout(() => {
          connectInstance(data.id)
            .then(() => {
              console.log("Instance connection initiated:", data.id);
              
              // Invalidar a query para atualizar o status
              queryClient.invalidateQueries({ queryKey: ['instance', data.id] });
            })
            .catch(error => {
              console.error("Failed to connect instance:", error);
              
              // Invalidar a query para atualizar o status mesmo em caso de erro
              queryClient.invalidateQueries({ queryKey: ['instance', data.id] });
            });
        }, 1000);
      }
    },
    onError: (error) => {
      console.error("Error creating instance:", error);
      toast({
        title: t('instances.createError'),
        description: error.toString(),
        variant: 'destructive',
      });
    },
  });

  // Delete instance mutation
  const deleteInstanceMutation = useMutation({
    mutationFn: (id: number) => deleteInstance(id),
    onSuccess: (_, id) => {
      // Invalidar todas as queries relacionadas às instâncias
      queryClient.invalidateQueries({ queryKey: ['instances'] });
      queryClient.invalidateQueries({ queryKey: ['instance', id] });
      
      toast({
        title: t('instances.deleted'),
        description: t('instances.deletedDesc'),
      });
    },
    onError: (error) => {
      console.error("Error deleting instance:", error);
      toast({
        title: t('instances.deleteError'),
        description: error.toString(),
        variant: 'destructive',
      });
    },
  });

  return {
    instances,
    loadingInstances,
    instancesError,
    refetchInstances,
    createInstance: createInstanceMutation.mutate,
    isCreating: createInstanceMutation.isPending,
    deleteInstance: deleteInstanceMutation.mutate,
    isDeleting: deleteInstanceMutation.isPending,
  };
};

// Hook para lidar com uma instância específica
export const useInstance = (id?: number) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [qrCode, setQrCode] = useState<string | null>(null);
  
  // Only fetch if we have an ID
  const enabled = id !== undefined;

  // Query para buscar os detalhes da instância
  const { 
    data: instance, 
    isLoading: loadingInstance,
    error: instanceError,
    refetch: refetchInstance
  } = useQuery({
    queryKey: ['instance', id],
    queryFn: () => getInstance(id!),
    enabled,
  });

  // Query para buscar o QR code da instância
  const { 
    data: qrCodeData,
    isLoading: loadingQR,
    error: qrCodeError,
    refetch: refetchQR
  } = useQuery({
    queryKey: ['instance', id, 'qr'],
    queryFn: () => getQrCode(id!),
    enabled: enabled && !!instance && (instance.status === 'awaiting_qr' || instance.status === 'qr_ready'),
    refetchInterval: (instance?.status === 'awaiting_qr' || instance?.status === 'qr_ready') ? 10000 : false, // Refetch every 10 seconds if QR is ready
    onSuccess: (data) => {
      if (data && data.qrCode) {
        setQrCode(data.qrCode);
      }
    }
  });

  // Um handler genérico para gerar QR Code
  const generateQRCode = useCallback(async () => {
    if (!id) return;
    
    try {
      const response = await apiRequest('GET', `${INSTANCES_API}/${id}/qr?force=true`);
      if (!response.ok) throw new Error('Falha ao gerar QR code');
      
      const data = await response.json();
      if (data && data.qrCode) {
        setQrCode(data.qrCode);
        return data.qrCode;
      }
      return null;
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: t('qrcode.generateError'),
        description: error.toString(),
        variant: 'destructive',
      });
      return null;
    }
  }, [id, toast, t]);

  // Connect instance
  const connectInstanceMutation = useMutation({
    mutationFn: () => connectInstance(id!),
    onSuccess: () => {
      // Invalidar todas as queries relacionadas à instância
      queryClient.invalidateQueries({ queryKey: ['instance', id] });
      
      toast({
        title: t('instances.connecting'),
        description: t('instances.connectingDesc'),
      });
      
      // Refetch QR code after a short delay
      setTimeout(() => {
        refetchQR();
      }, 2000);
    },
    onError: (error) => {
      console.error("Error connecting instance:", error);
      toast({
        title: t('instances.connectError'),
        description: error.toString(),
        variant: 'destructive',
      });
    },
  });

  // Disconnect instance
  const disconnectInstanceMutation = useMutation({
    mutationFn: () => disconnectInstance(id!),
    onSuccess: () => {
      // Invalidar todas as queries relacionadas à instância
      queryClient.invalidateQueries({ queryKey: ['instance', id] });
      queryClient.invalidateQueries({ queryKey: ['instances'] });
      
      toast({
        title: t('instances.disconnected'),
        description: t('instances.disconnectedDesc'),
      });
    },
    onError: (error) => {
      console.error('Error disconnecting instance:', error);
      toast({
        title: t('instances.disconnectError'),
        description: error.toString(),
        variant: 'destructive',
      });
    },
  });
  
  // Reset instance and force QR code generation
  const resetInstanceMutation = useMutation({
    mutationFn: () => resetInstance(id!),
    onSuccess: (data) => {
      console.log('Instance reset successful, response:', data);
      
      // Set QR code directly from the response
      if (data.qrCode) {
        setQrCode(data.qrCode);
      }
      
      // Invalidar todas as queries relacionadas à instância
      queryClient.invalidateQueries({ queryKey: ['instance', id] });
      queryClient.invalidateQueries({ queryKey: ['instance', id, 'qr'] });
      queryClient.invalidateQueries({ queryKey: ['instances'] });
      
      toast({
        title: t('instance.reset'),
        description: t('instance.resetDesc'),
      });
    },
    onError: (error) => {
      console.error('Error resetting instance:', error);
      toast({
        title: t('instance.resetError'),
        description: error.toString(),
        variant: 'destructive',
      });
    },
  });

  return {
    instance,
    loadingInstance,
    instanceError,
    refetchInstance,
    qrCode: qrCode || (qrCodeData?.qrCode ?? null),
    loadingQR,
    qrCodeError,
    generateQRCode,
    connectInstance: connectInstanceMutation.mutate,
    isConnecting: connectInstanceMutation.isPending,
    disconnectInstance: disconnectInstanceMutation.mutate,
    isDisconnecting: disconnectInstanceMutation.isPending,
    resetInstance: resetInstanceMutation.mutate, 
    isResetting: resetInstanceMutation.isPending,
  };
};
