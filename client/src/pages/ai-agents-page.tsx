import { useState } from 'react';
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Plus, Bot, Loader2, AlertCircle, Settings, Edit, Trash2, UploadCloud, MessageSquare, BrainCircuit } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAiAgents, Agent } from '@/hooks/use-ai-agent';

export default function AiAgentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentDescription, setNewAgentDescription] = useState("");
  const [newAgentModel, setNewAgentModel] = useState("gpt-4o");
  const [newAgentSystemPrompt, setNewAgentSystemPrompt] = useState("");

  // Usar o hook personalizado para gerenciar agentes de IA
  const { agents, isLoading, error, createAgent, updateAgent, deleteAgent } = useAiAgents();

  interface CreateAgentData {
    name: string;
    description?: string | null;
    model: string;
    systemPrompt?: string | null;
    type?: string;
    status?: string;
    tone?: string;
    objective?: string;
  }

  const createAgentMutation = useMutation({
    mutationFn: async (agentData: CreateAgentData) => {
      const res = await apiRequest('POST', '/api/ai/agents', agentData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/agents'] });
      setCreateDialogOpen(false);
      setNewAgentName("");
      setNewAgentDescription("");
      setNewAgentSystemPrompt("");
      toast({
        title: "Assistente criado",
        description: "Seu assistente de IA foi criado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar assistente",
        description: error.message || "Ocorreu um erro ao criar o assistente de IA.",
        variant: "destructive",
      });
    },
  });

  const handleCreateAgent = () => {
    if (!newAgentName) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, forneça um nome para o assistente.",
        variant: "destructive",
      });
      return;
    }

    createAgentMutation.mutate({
      name: newAgentName,
      description: newAgentDescription,
      model: newAgentModel,
      systemPrompt: newAgentSystemPrompt,
      type: "support",
      status: "active"
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2">Carregando assistentes...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro ao carregar assistentes</AlertTitle>
            <AlertDescription>
              Ocorreu um erro ao carregar seus assistentes de IA. Por favor, tente novamente mais tarde.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Assistentes de IA</h1>
            <p className="text-muted-foreground">
              Crie e gerencie assistentes inteligentes para seu atendimento
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Assistente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Criar Novo Assistente</DialogTitle>
                <DialogDescription>
                  Configure um assistente de IA para suas conversas no WhatsApp
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome do Assistente</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Assistente de Suporte"
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    placeholder="Ex: Responde dúvidas frequentes de clientes"
                    value={newAgentDescription}
                    onChange={(e) => setNewAgentDescription(e.target.value)}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="model">Modelo</Label>
                  <Select
                    value={newAgentModel}
                    onValueChange={setNewAgentModel}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o">GPT-4o (Recomendado)</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="systemPrompt">Instruções do Sistema (opcional)</Label>
                  <Textarea
                    id="systemPrompt"
                    placeholder="Ex: Você é um assistente de suporte técnico especializado em..."
                    className="h-24"
                    value={newAgentSystemPrompt}
                    onChange={(e) => setNewAgentSystemPrompt(e.target.value)}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateAgent} disabled={createAgentMutation.isPending}>
                  {createAgentMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    "Criar Assistente"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Alert variant="info" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Agentes Humanizados</AlertTitle>
          <AlertDescription>
            Crie assistentes de IA com personalidades e conhecimentos específicos para automatizar seu atendimento ao cliente.
            Utilize os modelos pré-configurados abaixo para começar ou crie um do zero com suas próprias instruções.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="active">Ativos</TabsTrigger>
            <TabsTrigger value="inactive">Inativos</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents && agents.length > 0 ? (
                agents.map((agent) => (
                  <Card key={agent.id} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-10 w-10 bg-primary/10">
                            <AvatarFallback>
                              <Bot className="h-6 w-6 text-primary" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-base">{agent.name}</CardTitle>
                            <CardDescription className="text-sm">{agent.type === 'support' ? 'Suporte' : 'Documentos'}</CardDescription>
                          </div>
                        </div>
                        <Badge variant={agent.status === 'active' ? "success" : "secondary"}>
                          {agent.status === 'active' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <p className="text-sm text-muted-foreground mb-3">
                        {agent.description || "Sem descrição"}
                      </p>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Modelo: {agent.model || 'gpt-4o'}</span>
                        <span>Criado em: {new Date(agent.createdAt).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between pt-3">
                      <Button variant="outline" size="sm">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Conversar
                      </Button>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <UploadCloud className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <BrainCircuit className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
                  <h3 className="mt-4 text-lg font-medium">Nenhum assistente encontrado</h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                    Você ainda não possui assistentes de IA. Crie um para começar a automatizar suas conversas.
                  </p>
                  <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Novo Assistente
                  </Button>
                </div>
              )}
              
              {/* Template Cards for New Assistants */}
              <Card className="border-2 border-dashed border-neutral-200 hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bot className="h-5 w-5 mr-2 text-primary" />
                    Assistente de Suporte
                  </CardTitle>
                  <CardDescription>
                    Responde dúvidas frequentes e soluciona problemas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Assistente especializado em dar suporte técnico e responder dúvidas frequentes com base em sua documentação interna.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" onClick={() => {
                    setNewAgentName("Assistente de Suporte");
                    setNewAgentDescription("Responde dúvidas frequentes e soluciona problemas");
                    setNewAgentSystemPrompt("Você é um assistente de suporte técnico especializado. Seja sempre educado, claro e objetivo em suas respostas.");
                    setCreateDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Usar este modelo
                  </Button>
                </CardFooter>
              </Card>
              
              <Card className="border-2 border-dashed border-neutral-200 hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BrainCircuit className="h-5 w-5 mr-2 text-primary" />
                    Processador de Documentos
                  </CardTitle>
                  <CardDescription>
                    Analisa documentos e extrai informações
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Especializado em processar documentos, extrair informações relevantes e responder perguntas com base no conteúdo.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" onClick={() => {
                    setNewAgentName("Processador de Documentos");
                    setNewAgentDescription("Analisa documentos e extrai informações");
                    setNewAgentSystemPrompt("Você é um assistente especializado em analisar documentos. Extraia informações importantes e responda perguntas com base no conteúdo dos documentos.");
                    setCreateDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Usar este modelo
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="active" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents && agents.filter((agent) => agent.status === 'active').length > 0 ? (
                agents
                  .filter((agent) => agent.status === 'active')
                  .map((agent) => (
                    <Card key={agent.id} className="shadow-sm hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-10 w-10 bg-primary/10">
                              <AvatarFallback>
                                <Bot className="h-6 w-6 text-primary" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-base">{agent.name}</CardTitle>
                              <CardDescription className="text-sm">{agent.type === 'support' ? 'Suporte' : 'Documentos'}</CardDescription>
                            </div>
                          </div>
                          <Badge variant="success">Ativo</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <p className="text-sm text-muted-foreground mb-3">
                          {agent.description || "Sem descrição"}
                        </p>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Modelo: {agent.model || 'gpt-4o'}</span>
                          <span>Criado em: {new Date(agent.createdAt).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between pt-3">
                        <Button variant="outline" size="sm">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Conversar
                        </Button>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <BrainCircuit className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
                  <h3 className="mt-4 text-lg font-medium">Nenhum assistente ativo</h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                    Você não possui assistentes ativos no momento. Ative um assistente ou crie um novo.
                  </p>
                  <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Novo Assistente
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="inactive" className="mt-6">
            <div className="text-center py-12">
              <Bot className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
              <h3 className="mt-4 text-lg font-medium">Nenhum assistente inativo</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                Você não possui assistentes inativos no momento.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}