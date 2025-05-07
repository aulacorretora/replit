import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Interface para o tipo de agente IA
export interface Agent {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  model: string;
  systemPrompt: string | null;
  tone?: string;
  objective?: string;
  createdAt: Date;
  updatedAt?: Date;
  active?: boolean;
  status?: string;
  type?: string;
  temperature?: number;
  maxTokens?: number;
  knowledgeBase?: boolean;
  voiceEnabled?: boolean;
  voiceModel?: string | null;
}

// Interface para criação de um agente
export interface CreateAgentData {
  name: string;
  description?: string | null;
  model: string;
  systemPrompt: string;
  tone?: string;
  objective?: string;
  type?: string;
  status?: string;
  temperature?: number;
  maxTokens?: number;
  knowledgeBase?: boolean;
  voiceEnabled?: boolean;
  voiceModel?: string | null;
}

export function useAiAgents() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar todos os agentes do usuário
  const { 
    data: agents = [], 
    isLoading,
    error,
    refetch
  } = useQuery<Agent[]>({
    queryKey: ['/api/ai-agents'],
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 60000,
    // Tratar erros especificamente para esta query
    queryFn: async () => {
      try {
        const response = await fetch('/api/ai-agents', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
        
        // Se a resposta for 401 (não autorizado), retornar array vazio em vez de propagar o erro
        if (response.status === 401) {
          console.warn('Usuário não autorizado a acessar agentes de IA. Retornando array vazio.');
          return [];
        }
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Erro ao buscar agentes de IA:', error);
        // Em caso de erro de rede, retornar array vazio em vez de propagar o erro
        return [];
      }
    }
  });

  // Buscar um agente específico pelo ID
  const getAgent = (id: number) => {
    return useQuery<Agent>({
      queryKey: ['/api/ai-agents', id],
      refetchOnWindowFocus: false,
      retry: 1,
      queryFn: async () => {
        try {
          const response = await fetch(`/api/ai-agents/${id}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          });
          
          if (response.status === 401) {
            console.warn('Usuário não autorizado a acessar este agente de IA.');
            throw new Error('Não autorizado');
          }
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
          }
          
          return await response.json();
        } catch (error) {
          console.error(`Erro ao buscar agente de IA ${id}:`, error);
          throw error;
        }
      }
    });
  };

  // Criar um novo agente
  const createAgentMutation = useMutation({
    mutationFn: async (agentData: CreateAgentData) => {
      const response = await apiRequest('POST', '/api/ai-agents', agentData);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar agente');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Agente criado',
        description: 'O agente foi criado com sucesso',
        variant: 'default',
      });
      
      // Invalidar a query para recarregar a lista de agentes
      queryClient.invalidateQueries({ queryKey: ['/api/ai-agents'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar agente',
        variant: 'destructive',
      });
    },
  });

  // Atualizar um agente existente
  const updateAgentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateAgentData> }) => {
      const response = await apiRequest('PATCH', `/api/ai-agents/${id}`, data);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar agente');
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Agente atualizado',
        description: 'O agente foi atualizado com sucesso',
        variant: 'default',
      });
      
      // Invalidar a query para o agente específico e a lista geral
      queryClient.invalidateQueries({ queryKey: ['/api/ai-agents', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-agents'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar agente',
        variant: 'destructive',
      });
    },
  });

  // Excluir um agente
  const deleteAgentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/ai-agents/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao excluir agente');
      }
      
      return response.json();
    },
    onSuccess: (_, id) => {
      toast({
        title: 'Agente excluído',
        description: 'O agente foi excluído com sucesso',
        variant: 'default',
      });
      
      // Invalidar a query para a lista de agentes
      queryClient.invalidateQueries({ queryKey: ['/api/ai-agents'] });
      // Remover o agente específico do cache
      queryClient.removeQueries({ queryKey: ['/api/ai-agents', id] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir agente',
        variant: 'destructive',
      });
    },
  });

  return {
    agents,
    isLoading,
    error,
    refetch,
    getAgent,
    createAgent: createAgentMutation.mutate,
    updateAgent: updateAgentMutation.mutate,
    deleteAgent: deleteAgentMutation.mutate,
    createAgentLoading: createAgentMutation.isPending,
    updateAgentLoading: updateAgentMutation.isPending,
    deleteAgentLoading: deleteAgentMutation.isPending,
  };
}