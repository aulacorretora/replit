import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  UsersRound, 
  CreditCard, 
  MessageSquare, 
  Smartphone, 
  Settings, 
  BarChart, 
  Webhook,
  UserRound
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const AdminPanel = () => {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  // Verificar se o usuário é admin
  if (user && user.role !== 'admin') {
    setLocation('/');
    return null;
  }

  const adminModules = [
    {
      title: 'Usuários',
      description: 'Gerenciar usuários e permissões',
      icon: <UsersRound className="h-10 w-10 text-primary" />,
      path: '/admin/users'
    },
    {
      title: 'Webhooks',
      description: 'Eventos de pagamento e integrações',
      icon: <Webhook className="h-10 w-10 text-primary" />,
      path: '/admin/webhook-events'
    },
    {
      title: 'Instâncias',
      description: 'Todas as instâncias WhatsApp',
      icon: <Smartphone className="h-10 w-10 text-primary" />,
      path: '/admin/instances'
    },
    {
      title: 'Mensagens',
      description: 'Logs de mensagens do sistema',
      icon: <MessageSquare className="h-10 w-10 text-primary" />,
      path: '/admin/messages'
    },
    {
      title: 'Pagamentos',
      description: 'Transações e assinaturas',
      icon: <CreditCard className="h-10 w-10 text-primary" />,
      path: '/admin/payments'
    },
    {
      title: 'Relatórios',
      description: 'Estatísticas e análises',
      icon: <BarChart className="h-10 w-10 text-primary" />,
      path: '/admin/reports'
    },
    {
      title: 'Configurações',
      description: 'Configurações do sistema',
      icon: <Settings className="h-10 w-10 text-primary" />,
      path: '/admin/settings'
    }
  ];

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Painel Administrativo</h1>
          <p className="text-muted-foreground">
            Bem-vindo ao painel administrativo do ZapBan. Gerencie seu sistema a partir daqui.
          </p>
        </div>
        <div className="flex items-center">
          <div className="flex flex-col items-end mr-4">
            <span className="font-semibold">{user?.name}</span>
            <span className="text-xs text-muted-foreground">{user?.email}</span>
          </div>
          <div className="bg-primary/10 rounded-full p-2">
            <UserRound className="h-8 w-8 text-primary" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminModules.map((module, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                {module.icon}
                <span className="ml-3">{module.title}</span>
              </CardTitle>
              <CardDescription>{module.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href={module.path}>Acessar</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Status do Sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Usuários Ativos</CardTitle>
              <CardDescription>Usuários logados agora</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">24</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Instâncias Conectadas</CardTitle>
              <CardDescription>Total de WhatsApp ativos</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">38</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Mensagens Hoje</CardTitle>
              <CardDescription>Total de mensagens enviadas</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">1,243</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;