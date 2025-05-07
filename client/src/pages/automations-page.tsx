import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Edge, Node } from 'reactflow';
import { PlusCircle, Trash2, Edit, PlayCircle, Copy } from 'lucide-react';

import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

import FlowEditor from '@/components/automation/FlowEditor';
import { apiRequest, queryClient } from '@/lib/queryClient';

// Interface para os dados de automação
interface Automation {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
  draft: boolean;
  createdAt: string;
  updatedAt: string;
  userId: number;
  instanceId: number | null;
  nodeData?: any;
}

const AutomationsPage: React.FC = () => {
  const [location, setLocation] = useLocation();
  const [selectedTabId, setSelectedTabId] = useState<string>('all');
  const { toast } = useToast();
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [mode, setMode] = useState<'list' | 'edit' | 'create'>('list');
  const [initialNodes, setInitialNodes] = useState<Node[]>([]);
  const [initialEdges, setInitialEdges] = useState<Edge[]>([]);
  
  // Buscar automações
  const { data: automations = [], isLoading } = useQuery({
    queryKey: ['/api/automations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/automations');
      return await response.json() as Automation[];
    }
  });
  
  // Mutação para salvar automação
  const saveMutation = useMutation({
    mutationFn: async (automationData: any) => {
      if (mode === 'create') {
        const response = await apiRequest('POST', '/api/automations', automationData);
        return await response.json();
      } else {
        const response = await apiRequest('PUT', `/api/automations/${selectedAutomation?.id}`, automationData);
        return await response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automations'] });
      setMode('list');
      setSelectedAutomation(null);
      toast({
        title: mode === 'create' ? 'Automação criada' : 'Automação atualizada',
        description: 'A automação foi salva com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Mutação para ativar/desativar automação
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const response = await apiRequest('PATCH', `/api/automations/${id}/toggle`, { active });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automations'] });
      toast({
        title: 'Status atualizado',
        description: 'O status da automação foi atualizado com sucesso.',
      });
    },
  });
  
  // Mutação para excluir automação
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/automations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automations'] });
      toast({
        title: 'Automação excluída',
        description: 'A automação foi excluída com sucesso.',
      });
    },
  });
  
  // Filtrar automações com base na aba selecionada
  const filteredAutomations = automations.filter((automation) => {
    if (selectedTabId === 'all') return true;
    if (selectedTabId === 'active') return automation.active;
    if (selectedTabId === 'draft') return automation.draft;
    if (selectedTabId === 'inactive') return !automation.active && !automation.draft;
    return true;
  });
  
  // Manipular nova automação
  const handleNewAutomation = () => {
    setMode('create');
    setInitialNodes([]);
    setInitialEdges([]);
  };
  
  // Manipular edição de automação
  const handleEditAutomation = (automation: Automation) => {
    setSelectedAutomation(automation);
    
    // Carregar nós e arestas da automação
    let nodes: Node[] = [];
    let edges: Edge[] = [];
    
    if (automation.nodeData) {
      try {
        const data = JSON.parse(automation.nodeData);
        nodes = data.nodes || [];
        edges = data.edges || [];
      } catch (error) {
        console.error('Erro ao analisar os dados de nós da automação:', error);
      }
    }
    
    setInitialNodes(nodes);
    setInitialEdges(edges);
    setMode('edit');
  };
  
  // Manipular exclusão de automação
  const handleDeleteAutomation = (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta automação? Esta ação não pode ser desfeita.')) {
      deleteMutation.mutate(id);
    }
  };
  
  // Manipular ativação/desativação de automação
  const handleToggleActive = (id: number, currentActive: boolean) => {
    toggleActiveMutation.mutate({ id, active: !currentActive });
  };
  
  // Manipular duplicação de automação
  const handleDuplicateAutomation = (automation: Automation) => {
    // Cria uma cópia da automação
    const duplicateData = {
      ...automation,
      name: `${automation.name} (Cópia)`,
      id: undefined,
      draft: true,
    };
    
    // Salva a nova automação
    saveMutation.mutate(duplicateData);
  };
  
  // Manipular salvamento no editor de fluxo
  const handleSaveFlow = (nodes: Node[], edges: Edge[]) => {
    const automationData = {
      name: selectedAutomation?.name || 'Nova Automação',
      description: selectedAutomation?.description || '',
      draft: true,
      active: false,
      nodeData: JSON.stringify({ nodes, edges }),
    };
    
    saveMutation.mutate(automationData);
  };
  
  // Renderizar o editor de fluxo
  if (mode === 'create' || mode === 'edit') {
    return (
      <DashboardLayout>
        <div className="h-full flex flex-col">
          <div className="px-4 py-2 border-b">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">{mode === 'create' ? 'Nova Automação' : 'Editar Automação'}</h1>
              <Button 
                variant="outline" 
                onClick={() => {
                  setMode('list');
                  setSelectedAutomation(null);
                }}
              >
                Voltar para lista
              </Button>
            </div>
          </div>
          
          <div className="flex-1" style={{ minHeight: 0 }}>
            <FlowEditor
              flowId={selectedAutomation?.id}
              initialNodes={initialNodes}
              initialEdges={initialEdges}
              onSave={handleSaveFlow}
            />
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  // Renderizar a lista de automações
  return (
    <DashboardLayout>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Automações</h1>
          <Button onClick={handleNewAutomation}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Automação
          </Button>
        </div>
        
        <Tabs defaultValue="all" value={selectedTabId} onValueChange={setSelectedTabId}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="active">Ativas</TabsTrigger>
            <TabsTrigger value="draft">Rascunhos</TabsTrigger>
            <TabsTrigger value="inactive">Inativas</TabsTrigger>
          </TabsList>
          
          <TabsContent value={selectedTabId}>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <p>Carregando automações...</p>
              </div>
            ) : filteredAutomations.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-64 border rounded-lg">
                <p className="text-lg text-muted-foreground mb-4">Nenhuma automação encontrada</p>
                <Button onClick={handleNewAutomation}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Criar Nova Automação
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAutomations.map((automation) => (
                  <Card key={automation.id} className="overflow-hidden">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{automation.name}</CardTitle>
                        <div className="flex space-x-1">
                          {automation.draft && (
                            <Badge variant="outline">Rascunho</Badge>
                          )}
                          <Badge variant={automation.active ? 'default' : 'secondary'}>
                            {automation.active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </div>
                      </div>
                      {automation.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {automation.description}
                        </p>
                      )}
                    </CardHeader>
                    
                    <CardContent className="p-4 pt-2">
                      <div className="text-xs text-muted-foreground mb-4">
                        Criada em {new Date(automation.createdAt).toLocaleDateString()}
                        {automation.instanceId && (
                          <div className="mt-1">
                            Instância: {automation.instanceId}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleToggleActive(automation.id, automation.active)}
                        >
                          {automation.active ? 'Desativar' : 'Ativar'}
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              Ações
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditAutomation(automation)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateAutomation(automation)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-500 focus:text-red-500"
                              onClick={() => handleDeleteAutomation(automation.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AutomationsPage;