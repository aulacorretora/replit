import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Filter, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

const WebhookEventsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [filters, setFilters] = useState({
    platform: '',
    paymentStatus: '',
    email: '',
    startDate: '',
    endDate: '',
    processed: ''
  });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [processingUserId, setProcessingUserId] = useState('');
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);

  // Verificar se o usuário é admin
  if (user && user.role !== 'admin') {
    setLocation('/');
    return null;
  }

  // Buscar eventos de webhook
  const {
    data: webhookEvents = [],
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['/api/admin/webhook-events', filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      
      if (filters.platform) queryParams.append('platform', filters.platform);
      if (filters.paymentStatus) queryParams.append('paymentStatus', filters.paymentStatus);
      if (filters.email) queryParams.append('email', filters.email);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.processed) queryParams.append('processed', filters.processed);
      
      const url = `/api/admin/webhook-events${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await apiRequest('GET', url);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao buscar eventos de webhook');
      }
      
      return await response.json();
    },
    enabled: !!user && user.role === 'admin'
  });

  // Mutation para processar um evento de webhook
  const processMutation = useMutation({
    mutationFn: async ({ eventId, userId }: { eventId: number, userId: number }) => {
      const response = await apiRequest('POST', '/api/admin/webhook-events/process', {
        eventId,
        userId
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao processar evento');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Evento processado com sucesso',
        description: 'O evento foi vinculado ao usuário selecionado',
        variant: 'default',
      });
      
      // Fechar o diálogo e limpar estados
      setDialogOpen(false);
      setSelectedEvent(null);
      setProcessingUserId('');
      
      // Atualizar a lista de eventos
      queryClient.invalidateQueries({ queryKey: ['/api/admin/webhook-events'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao processar evento',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Formatar status de pagamento para exibição
  const formatStatus = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'approved':
      case 'pago':
      case 'paid':
        return <Badge className="bg-green-500">Pago</Badge>;
      case 'pending':
      case 'pendente':
      case 'waiting':
        return <Badge className="bg-yellow-500">Pendente</Badge>;
      case 'refunded':
      case 'refund':
      case 'reembolsado':
        return <Badge className="bg-red-500">Reembolsado</Badge>;
      case 'cancelled':
      case 'canceled':
      case 'cancelado':
        return <Badge className="bg-gray-500">Cancelado</Badge>;
      default:
        return <Badge>{status || 'Desconhecido'}</Badge>;
    }
  };

  // Formatar data para exibição
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    
    try {
      const date = new Date(dateStr);
      return format(date, 'dd/MM/yyyy HH:mm', { locale: pt });
    } catch (error) {
      return 'Data inválida';
    }
  };

  const handleOpenProcessDialog = (event: any) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const handleProcessWebhook = () => {
    if (!selectedEvent || !processingUserId) {
      toast({
        title: 'Dados incompletos',
        description: 'Selecione um usuário para vincular este evento',
        variant: 'destructive',
      });
      return;
    }
    
    processMutation.mutate({
      eventId: selectedEvent.id,
      userId: parseInt(processingUserId, 10)
    });
  };

  const handleResetFilters = () => {
    setFilters({
      platform: '',
      paymentStatus: '',
      email: '',
      startDate: '',
      endDate: '',
      processed: ''
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Webhook Events</h1>
          <p className="text-muted-foreground">
            Gerenciamento de eventos externos de plataformas de pagamento
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setIsFiltersVisible(!isFiltersVisible)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {isFiltersVisible && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Filtre os eventos por diferentes critérios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Plataforma</label>
                <Select
                  value={filters.platform}
                  onValueChange={(value) => setFilters({ ...filters, platform: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as plataformas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    <SelectItem value="hotmart">Hotmart</SelectItem>
                    <SelectItem value="kiwify">Kiwify</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Status do Pagamento</label>
                <Select
                  value={filters.paymentStatus}
                  onValueChange={(value) => setFilters({ ...filters, paymentStatus: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="refunded">Reembolsado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Processado</label>
                <Select
                  value={filters.processed}
                  onValueChange={(value) => setFilters({ ...filters, processed: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="true">Processados</SelectItem>
                    <SelectItem value="false">Não Processados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Email do Comprador</label>
                <div className="flex">
                  <Input
                    value={filters.email}
                    onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                    placeholder="Email"
                  />
                  <Button variant="ghost" className="ml-2">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Inicial</label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Final</label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleResetFilters}>
              Limpar Filtros
            </Button>
            <Button onClick={() => refetch()}>
              Aplicar Filtros
            </Button>
          </CardFooter>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Carregando eventos...</span>
            </div>
          ) : isError ? (
            <div className="text-center p-12 text-red-500">
              Erro ao carregar eventos. Por favor, tente novamente.
            </div>
          ) : webhookEvents.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground">
              Nenhum evento encontrado com os filtros selecionados.
            </div>
          ) : (
            <Table>
              <TableCaption>Lista de eventos de webhook recebidos</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Processado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhookEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.id}</TableCell>
                    <TableCell>{event.platform}</TableCell>
                    <TableCell>{event.buyerEmail}</TableCell>
                    <TableCell>{event.productName}</TableCell>
                    <TableCell>{formatStatus(event.paymentStatus)}</TableCell>
                    <TableCell>{formatDate(event.transactionDate)}</TableCell>
                    <TableCell>{event.planType}</TableCell>
                    <TableCell>
                      {event.processed ? (
                        <Badge className="bg-green-500">Sim</Badge>
                      ) : (
                        <Badge variant="outline">Não</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!event.processed && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenProcessDialog(event)}
                        >
                          Vincular
                        </Button>
                      )}
                      {event.processed && event.userId && (
                        <span className="text-xs text-muted-foreground">
                          Vinculado ao usuário #{event.userId}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Diálogo para processar um evento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Evento a um Usuário</DialogTitle>
            <DialogDescription>
              Insira o ID do usuário para vincular este evento de pagamento.
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right text-sm font-medium">ID do Evento:</span>
                <span className="col-span-3">{selectedEvent.id}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right text-sm font-medium">Comprador:</span>
                <span className="col-span-3">{selectedEvent.buyerEmail}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right text-sm font-medium">Produto:</span>
                <span className="col-span-3">{selectedEvent.productName}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right text-sm font-medium">Status:</span>
                <span className="col-span-3">{formatStatus(selectedEvent.paymentStatus)}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right text-sm font-medium">ID do Usuário:</span>
                <Input
                  className="col-span-3"
                  type="number"
                  value={processingUserId}
                  onChange={(e) => setProcessingUserId(e.target.value)}
                  placeholder="Insira o ID do usuário"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleProcessWebhook}
              disabled={processMutation.isPending || !processingUserId}
            >
              {processMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Vincular Evento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WebhookEventsPage;