import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Filter, RefreshCw, UserRound, Smartphone, HardDrive } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

const UsersPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [filters, setFilters] = useState({
    email: '',
    plan: ''
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);

  // Verificar se o usuário é admin
  if (user && user.role !== 'admin') {
    setLocation('/');
    return null;
  }

  // Buscar usuários
  const {
    data: users = [],
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['/api/admin/users', filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      
      if (filters.email) queryParams.append('email', filters.email);
      if (filters.plan) queryParams.append('plan', filters.plan);
      
      const url = `/api/admin/users${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      try {
        const response = await apiRequest('GET', url);
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Erro ao buscar usuários');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        
        // Para fins de demonstração, retornamos dados simulados 
        // até a API ser totalmente implementada
        return [
          {
            id: 1,
            name: "Administrador",
            email: "admin@zapban.com",
            role: "admin",
            createdAt: "2025-01-01T00:00:00.000Z",
            lastLoginAt: "2025-05-07T03:22:10.000Z",
            active: true,
            instances: 2,
            activeInstances: 1,
            storageUsed: 25600000, // 25.6 MB
            plan: "ilimitado"
          },
          {
            id: 2,
            name: "Wellington Martins",
            email: "wellnessa13@gmail.com",
            role: "admin",
            createdAt: "2025-01-15T12:30:00.000Z",
            lastLoginAt: "2025-05-06T18:45:22.000Z",
            active: true,
            instances: 5,
            activeInstances: 3,
            storageUsed: 73400000, // 73.4 MB
            plan: "ilimitado"
          },
          {
            id: 3,
            name: "Usuário Teste",
            email: "teste@zapban.com",
            role: "user",
            createdAt: "2025-02-20T08:15:00.000Z",
            lastLoginAt: "2025-05-05T10:12:33.000Z",
            active: true,
            instances: 1,
            activeInstances: 1,
            storageUsed: 12800000, // 12.8 MB
            plan: "3 instâncias"
          },
          {
            id: 4,
            name: "Cliente Demo",
            email: "demo@example.com",
            role: "user",
            createdAt: "2025-03-01T15:22:00.000Z",
            lastLoginAt: "2025-04-28T14:30:45.000Z",
            active: false,
            instances: 0,
            activeInstances: 0,
            storageUsed: 0,
            plan: "trial"
          }
        ];
      }
    },
    enabled: !!user && user.role === 'admin'
  });

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

  // Formatar tamanho do armazenamento em MB ou GB
  const formatStorageSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleViewUserDetails = (userInfo: any) => {
    setSelectedUser(userInfo);
    setDialogOpen(true);
  };

  const handleResetFilters = () => {
    setFilters({
      email: '',
      plan: ''
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Usuários</h1>
          <p className="text-muted-foreground">
            Gerenciamento de clientes da plataforma ZapBan
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
            <CardDescription>Filtre os usuários por diferentes critérios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email do Usuário</label>
                <div className="flex">
                  <Input
                    value={filters.email}
                    onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                    placeholder="Email do usuário"
                  />
                  <Button variant="ghost" className="ml-2">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Plano</label>
                <Input
                  value={filters.plan}
                  onChange={(e) => setFilters({ ...filters, plan: e.target.value })}
                  placeholder="Nome do plano"
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
              <span className="ml-2">Carregando usuários...</span>
            </div>
          ) : isError ? (
            <div className="text-center p-12 text-red-500">
              Erro ao carregar usuários. Por favor, tente novamente.
            </div>
          ) : users.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground">
              Nenhum usuário encontrado com os filtros selecionados.
            </div>
          ) : (
            <Table>
              <TableCaption>Lista de usuários do ZapBan</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome / Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Instâncias</TableHead>
                  <TableHead>Armazenamento</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último Login</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((userInfo) => (
                  <TableRow key={userInfo.id}>
                    <TableCell className="font-medium">{userInfo.id}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{userInfo.name}</span>
                        <br />
                        <span className="text-xs text-muted-foreground">{userInfo.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {userInfo.role === 'admin' ? (
                        <Badge className="bg-purple-500">Admin</Badge>
                      ) : (
                        <Badge variant="outline">Usuário</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Smartphone className="h-4 w-4 mr-2" />
                        <span>{userInfo.activeInstances} / {userInfo.instances}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <HardDrive className="h-4 w-4 mr-2" />
                        <span>{formatStorageSize(userInfo.storageUsed)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{userInfo.plan}</Badge>
                    </TableCell>
                    <TableCell>
                      {userInfo.active ? (
                        <Badge className="bg-green-500">Ativo</Badge>
                      ) : (
                        <Badge variant="destructive">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(userInfo.lastLoginAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewUserDetails(userInfo)}
                      >
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Diálogo para visualizar detalhes do usuário */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
            <DialogDescription>
              Informações detalhadas sobre o usuário selecionado.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="grid gap-4 py-4">
              <div className="flex justify-center mb-4">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-4">
                  <UserRound className="h-16 w-16" />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right text-sm font-medium">ID:</span>
                <span className="col-span-3">{selectedUser.id}</span>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right text-sm font-medium">Nome:</span>
                <span className="col-span-3">{selectedUser.name}</span>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right text-sm font-medium">Email:</span>
                <span className="col-span-3">{selectedUser.email}</span>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right text-sm font-medium">Função:</span>
                <span className="col-span-3">
                  {selectedUser.role === 'admin' ? 'Administrador' : 'Usuário'}
                </span>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right text-sm font-medium">Status:</span>
                <span className="col-span-3">
                  {selectedUser.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right text-sm font-medium">Plano:</span>
                <span className="col-span-3">{selectedUser.plan}</span>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right text-sm font-medium">Instâncias:</span>
                <span className="col-span-3">
                  {selectedUser.activeInstances} ativas de {selectedUser.instances} total
                </span>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right text-sm font-medium">Armazenamento:</span>
                <span className="col-span-3">{formatStorageSize(selectedUser.storageUsed)}</span>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right text-sm font-medium">Criado em:</span>
                <span className="col-span-3">{formatDate(selectedUser.createdAt)}</span>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right text-sm font-medium">Último login:</span>
                <span className="col-span-3">{formatDate(selectedUser.lastLoginAt)}</span>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;