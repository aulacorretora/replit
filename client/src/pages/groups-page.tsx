import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2, UserPlus, Users, MessageSquare, Settings, BarChart2, PlusCircle, Trash2, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Definição do esquema para criação de grupo
const createGroupSchema = z.object({
  instanceId: z.string().min(1, { message: 'Selecione uma instância' }),
  name: z.string().min(3, { message: 'Nome deve ter no mínimo 3 caracteres' }),
  description: z.string().optional(),
  participants: z.array(z.string()).optional(),
});

// Interfaces para tipagem
interface Group {
  id: number;
  instanceId: number;
  userId: number;
  name: string;
  description: string | null;
  groupJid: string;
  photoUrl: string | null;
  createdBy: string;
  memberCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Instance {
  id: number;
  name: string;
  status: string;
}

export default function GroupsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Estados locais
  const [activeTab, setActiveTab] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  // Consulta para buscar instâncias do usuário
  const { data: instances = [], isLoading: loadingInstances } = useQuery<Instance[]>({
    queryKey: ['/api/instances'],
    enabled: !!user,
  });

  // Consulta para buscar grupos
  const { data: groups = [], isLoading: loadingGroups } = useQuery<Group[]>({
    queryKey: ['/api/groups'],
    enabled: !!user,
  });
  
  // Mutação para criar um novo grupo
  const createGroupMutation = useMutation({
    mutationFn: async (data: { 
      instanceId: number; 
      name: string; 
      description?: string; 
      participants?: string[];
    }) => {
      const response = await apiRequest('POST', '/api/groups', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Grupo criado",
        description: "O grupo foi criado com sucesso",
      });
      setCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      form.reset();
    },
    onError: (error: Error) => {
      console.error('Erro ao criar grupo:', error);
      toast({
        title: "Erro ao criar grupo",
        description: error.message || "Ocorreu um erro ao criar o grupo",
        variant: "destructive",
      });
    }
  });
  
  // Configuração do formulário de criação de grupo
  const form = useForm<z.infer<typeof createGroupSchema>>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      instanceId: '',
      name: '',
      description: '',
      participants: [],
    },
  });
  
  // Handler para envio do formulário
  function onSubmit(values: z.infer<typeof createGroupSchema>) {
    // Convertendo instanceId para número
    const formData = {
      ...values,
      instanceId: parseInt(values.instanceId),
    };
    createGroupMutation.mutate(formData);
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col w-full p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t('Grupos do WhatsApp')}</h1>
            <p className="text-muted-foreground">{t('Gerencie grupos criados com seu WhatsApp')}</p>
          </div>
          
          <Button onClick={() => setCreateDialogOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            {t('Criar Grupo')}
          </Button>
        </div>
        
        <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">{t('Todos')}</TabsTrigger>
            <TabsTrigger value="active">{t('Ativos')}</TabsTrigger>
            <TabsTrigger value="inactive">{t('Inativos')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadingGroups ? (
                <div className="col-span-full flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : groups.length > 0 ? (
                groups.map((group: Group) => (
                  <GroupCard 
                    key={group.id} 
                    group={group} 
                    onSelect={() => setSelectedGroup(group)}
                  />
                ))
              ) : (
                <div className="col-span-full text-center p-8 bg-muted rounded-lg">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <h3 className="text-lg font-medium">{t('Nenhum grupo encontrado')}</h3>
                  <p className="text-muted-foreground mb-4">{t('Você ainda não criou nenhum grupo')}</p>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    {t('Criar Primeiro Grupo')}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="active">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadingGroups ? (
                <div className="col-span-full flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : groups.filter((group: Group) => group.isActive).length > 0 ? (
                groups
                  .filter((group: Group) => group.isActive)
                  .map((group: Group) => (
                    <GroupCard 
                      key={group.id} 
                      group={group} 
                      onSelect={() => setSelectedGroup(group)}
                    />
                  ))
              ) : (
                <div className="col-span-full text-center p-8 bg-muted rounded-lg">
                  <h3 className="text-lg font-medium">{t('Nenhum grupo ativo')}</h3>
                  <p className="text-muted-foreground">{t('Todos os seus grupos estão inativos')}</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="inactive">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadingGroups ? (
                <div className="col-span-full flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : groups.filter((group: Group) => !group.isActive).length > 0 ? (
                groups
                  .filter((group: Group) => !group.isActive)
                  .map((group: Group) => (
                    <GroupCard 
                      key={group.id} 
                      group={group} 
                      onSelect={() => setSelectedGroup(group)}
                    />
                  ))
              ) : (
                <div className="col-span-full text-center p-8 bg-muted rounded-lg">
                  <h3 className="text-lg font-medium">{t('Nenhum grupo inativo')}</h3>
                  <p className="text-muted-foreground">{t('Todos os seus grupos estão ativos')}</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Dialog para criar novo grupo */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('Criar Novo Grupo')}</DialogTitle>
            <DialogDescription>
              {t('Crie um novo grupo no WhatsApp utilizando sua instância conectada')}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="instanceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Instância')}</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={loadingInstances}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('Selecione uma instância')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {instances.map((instance: Instance) => (
                          <SelectItem key={instance.id} value={instance.id.toString()}>
                            {instance.name} {instance.status === 'CONNECTED' ? '(Online)' : '(Offline)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t('A instância deve estar conectada para criar grupos')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Nome do Grupo')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('Digite o nome do grupo')} {...field} />
                    </FormControl>
                    <FormDescription>
                      {t('Nome que será exibido para o grupo')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Descrição')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={t('Digite uma descrição para o grupo (opcional)')}
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('Uma descrição opcional para o grupo')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createGroupMutation.isPending}
                >
                  {createGroupMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {t('Criar Grupo')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog para detalhes do grupo (a ser implementado) */}
      {selectedGroup && (
        <Dialog open={!!selectedGroup} onOpenChange={(open) => !open && setSelectedGroup(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{selectedGroup.name}</DialogTitle>
              <DialogDescription>
                {selectedGroup.description || t('Sem descrição')}
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="members">
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="members">
                  <Users className="h-4 w-4 mr-2" />
                  {t('Membros')}
                </TabsTrigger>
                <TabsTrigger value="messages">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {t('Mensagens')}
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="h-4 w-4 mr-2" />
                  {t('Configurações')}
                </TabsTrigger>
                <TabsTrigger value="statistics">
                  <BarChart2 className="h-4 w-4 mr-2" />
                  {t('Estatísticas')}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="members">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm font-medium">{t('Membros do Grupo')}</h3>
                      <Button variant="outline" size="sm">
                        <UserPlus className="h-4 w-4 mr-2" />
                        {t('Adicionar')}
                      </Button>
                    </div>
                    
                    <div className="text-center p-4 text-muted-foreground">
                      {t('Carregando membros...')}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="messages">
                <div className="text-center p-4 text-muted-foreground">
                  {t('Histórico de mensagens será exibido aqui')}
                </div>
              </TabsContent>
              
              <TabsContent value="settings">
                <div className="text-center p-4 text-muted-foreground">
                  {t('Configurações do grupo serão exibidas aqui')}
                </div>
              </TabsContent>
              
              <TabsContent value="statistics">
                <div className="text-center p-4 text-muted-foreground">
                  {t('Estatísticas do grupo serão exibidas aqui')}
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedGroup(null)}>
                {t('Fechar')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}

// Componente de card para exibição de grupos
function GroupCard({ group, onSelect }: { group: Group; onSelect: () => void }) {
  const { t } = useTranslation();
  
  const formattedDate = new Date(group.createdAt).toLocaleDateString();
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{group.name}</CardTitle>
          <Badge variant={group.isActive ? "success" : "secondary"}>
            {group.isActive ? t('Ativo') : t('Inativo')}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2">
          {group.description || t('Sem descrição')}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="flex items-center text-sm text-muted-foreground mb-1">
          <Users className="h-4 w-4 mr-2" />
          {t('{{count}} membros', { count: group.memberCount })}
        </div>
        
        <div className="text-sm text-muted-foreground">
          {t('Criado em')} {formattedDate}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between pt-2">
        <Button variant="outline" size="sm" onClick={onSelect}>
          {t('Gerenciar')}
        </Button>
        
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}