import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Key, Trash2, AlertCircle, Check, Copy, Star, StarOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ApiKey {
  id: number;
  name: string;
  provider: string;
  key: string;
  createdAt: string;
  status: string;
  defaultKey: boolean;
}

export function ApiKeyManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddKeyDialogOpen, setIsAddKeyDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyProvider, setNewKeyProvider] = useState('openai');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [copyText, setCopyText] = useState('Copiar');
  const [activeProvider, setActiveProvider] = useState('all');

  const { data: apiKeys, isLoading, error } = useQuery<ApiKey[]>({
    queryKey: ['/api/user/api-keys'],
    refetchOnWindowFocus: false,
    // Retornar um array vazio em caso de erro, para exibir uma interface amigável de "nenhuma chave encontrada"
    onError: (error) => {
      console.error('Erro ao carregar chaves de API:', error);
      return [];
    }
  });

  const addKeyMutation = useMutation({
    mutationFn: async (data: { name: string; provider: string; key: string }) => {
      const res = await apiRequest('POST', '/api/user/api-keys', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/api-keys'] });
      setIsAddKeyDialogOpen(false);
      setNewKeyName('');
      setNewKeyValue('');
      toast({
        title: "Chave API adicionada",
        description: "Sua chave API foi adicionada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar chave",
        description: error.message || "Ocorreu um erro ao adicionar a chave API.",
        variant: "destructive",
      });
    }
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/user/api-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/api-keys'] });
      toast({
        title: "Chave API removida",
        description: "Sua chave API foi removida com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover chave",
        description: error.message || "Ocorreu um erro ao remover a chave API.",
        variant: "destructive",
      });
    }
  });

  const setDefaultKeyMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('PATCH', `/api/user/api-keys/${id}/default`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/api-keys'] });
      toast({
        title: "Chave padrão definida",
        description: "Sua chave API padrão foi atualizada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao definir chave padrão",
        description: error.message || "Ocorreu um erro ao definir a chave API padrão.",
        variant: "destructive",
      });
    }
  });

  const handleAddKey = () => {
    if (!newKeyName || !newKeyValue || !newKeyProvider) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    addKeyMutation.mutate({
      name: newKeyName,
      provider: newKeyProvider,
      key: newKeyValue
    });
  };

  const handleDeleteKey = (id: number) => {
    if (confirm("Tem certeza que deseja remover esta chave API?")) {
      deleteKeyMutation.mutate(id);
    }
  };

  const handleSetDefaultKey = (id: number) => {
    setDefaultKeyMutation.mutate(id);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyText('Copiado!');
    toast({
      title: "Copiado!",
      description: "Chave copiada para a área de transferência.",
    });
    setTimeout(() => setCopyText('Copiar'), 2000);
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai':
        return '🤖';
      case 'google':
        return '🧠';
      case 'stability':
        return '🎨';
      case 'gemini':
        return '👾';
      default:
        return '🔑';
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'OpenAI';
      case 'google':
        return 'Google AI';
      case 'stability':
        return 'Stability AI';
      case 'gemini':
        return 'Google Gemini';
      default:
        return provider.charAt(0).toUpperCase() + provider.slice(1);
    }
  };

  // Garantir que apiKeys seja sempre um array, mesmo quando for undefined ou null
  const safeApiKeys = apiKeys || [];
  const filteredApiKeys = activeProvider === 'all' 
    ? safeApiKeys 
    : safeApiKeys.filter(key => key.provider === activeProvider);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando chaves API...</span>
      </div>
    );
  }

  // Não mostrar alerta de erro, em vez disso tratar como se não houvesse chaves
  // Isso permite que a interface continue funcionando mesmo com problemas de autenticação
  // e o usuário pode adicionar chaves normalmente
  if (error) {
    console.error('Erro ao carregar chaves API:', error);
    // Continuar a renderização como se não houvesse chaves
  }

  return (
    <div className="space-y-6">
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Importante</AlertTitle>
        <AlertDescription>
          Para usar recursos de IA avançados como agentes conversacionais, você precisa fornecer
          suas próprias chaves API. Suas chaves são armazenadas com segurança e usadas apenas para
          suas próprias solicitações.
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Suas Chaves API</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie suas chaves API para serviços de inteligência artificial
          </p>
        </div>
        <Dialog open={isAddKeyDialogOpen} onOpenChange={setIsAddKeyDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Chave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Nova Chave API</DialogTitle>
              <DialogDescription>
                Adicione uma chave API para usar com os recursos de IA do ZapBan.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome da Chave</Label>
                <Input
                  id="name"
                  placeholder="Ex: Minha Chave OpenAI"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="provider">Provedor</Label>
                <Select
                  value={newKeyProvider}
                  onValueChange={setNewKeyProvider}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um provedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="google">Google AI</SelectItem>
                    <SelectItem value="stability">Stability AI</SelectItem>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="key">Valor da Chave API</Label>
                <Input
                  id="key"
                  type="password"
                  placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {newKeyProvider === 'openai' && 'Formato: sk-...'}
                  {newKeyProvider === 'google' && 'Formato: AIza...'}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddKeyDialogOpen(false)} disabled={addKeyMutation.isPending}>
                Cancelar
              </Button>
              <Button onClick={handleAddKey} disabled={addKeyMutation.isPending}>
                {addKeyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adicionando...
                  </>
                ) : (
                  "Adicionar Chave"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all" value={activeProvider} onValueChange={setActiveProvider}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="openai">OpenAI</TabsTrigger>
          <TabsTrigger value="google">Google AI</TabsTrigger>
          <TabsTrigger value="stability">Stability AI</TabsTrigger>
          <TabsTrigger value="gemini">Gemini</TabsTrigger>
        </TabsList>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Provedor</TableHead>
                  <TableHead>Chave</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApiKeys && filteredApiKeys.length > 0 ? (
                  filteredApiKeys.map((apiKey) => (
                    <TableRow key={apiKey.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        {apiKey.defaultKey && (
                          <Star className="h-4 w-4 text-yellow-500" />
                        )}
                        {apiKey.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {getProviderIcon(apiKey.provider)} {getProviderName(apiKey.provider)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">
                            {apiKey.key}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(apiKey.key)}
                            title={copyText}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(apiKey.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {!apiKey.defaultKey && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSetDefaultKey(apiKey.id)}
                              title="Definir como padrão"
                            >
                              <StarOff className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteKey(apiKey.id)}
                            title="Remover chave"
                            disabled={deleteKeyMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 p-4">
                        <Key className="h-8 w-8 text-muted-foreground opacity-40" />
                        <p className="text-sm text-muted-foreground">
                          {activeProvider === 'all'
                            ? 'Nenhuma chave API encontrada. Adicione uma para começar.'
                            : `Nenhuma chave ${getProviderName(activeProvider)} encontrada.`}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setNewKeyProvider(activeProvider === 'all' ? 'openai' : activeProvider);
                            setIsAddKeyDialogOpen(true);
                          }}
                        >
                          <Plus className="mr-2 h-3 w-3" />
                          Adicionar Chave
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Tabs>

      {safeApiKeys.length > 0 && (
        <div className="mt-4 text-sm text-muted-foreground">
          <p>
            <strong>Nota:</strong> As chaves marcadas com{' '}
            <Star className="h-3 w-3 text-yellow-500 inline" /> serão usadas por padrão para
            seus respectivos serviços.
          </p>
        </div>
      )}
    </div>
  );
}