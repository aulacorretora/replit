import { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { useInstances } from '@/hooks/use-instance';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart } from 'recharts';
import {
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  ChevronRight, 
  Plus, 
  Phone, 
  MessageCircle, 
  UserCheck,
  Settings,
  ExternalLink,
  ArrowUpRight
} from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { useMobile } from '@/hooks/use-mobile';
import { WebSocketDebug } from '@/components/ws-debug';

// Tooltip personalizado para o gráfico
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-md border border-neutral-200">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-primary text-sm font-semibold">
          {payload[0].value} mensagens
        </p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { instances, loadingInstances } = useInstances();
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [showDebug, setShowDebug] = useState(false);
  
  // Mock data for charts
  const chartData = [
    { name: t('dashboard.mon'), messages: 120 },
    { name: t('dashboard.tue'), messages: 230 },
    { name: t('dashboard.wed'), messages: 450 },
    { name: t('dashboard.thu'), messages: 350 },
    { name: t('dashboard.fri'), messages: 280 },
    { name: t('dashboard.sat'), messages: 190 },
    { name: t('dashboard.sun'), messages: 150 },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isMobileOpen={sidebarOpen} closeMobileMenu={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={t('dashboard.title')} openMobileMenu={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-gray-50">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              {t('dashboard.welcome', { name: user?.name?.split(' ')[0] })}
            </h1>
            <p className="text-gray-500">{t('dashboard.subtitle')}</p>
          </div>
          
          {/* Stats Cards - Design mais moderno e elegante */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow">
              <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-bl-full"></div>
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-primary" />
                  {t('dashboard.activeInstances')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="text-3xl font-bold text-gray-800 mt-2">
                  {loadingInstances ? "..." : instances?.filter(i => i.connected).length || 0}
                </div>
                <div className="flex items-center text-sm text-gray-500 mt-2">
                  <span className="flex items-center">
                    {t('dashboard.totalInstances', { total: loadingInstances ? "..." : instances?.length || 0 })}
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-bl-full"></div>
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
                  <MessageCircle className="h-4 w-4 mr-2 text-blue-500" />
                  {t('dashboard.todayMessages')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="text-3xl font-bold text-gray-800 mt-2">234</div>
                <div className="flex items-center text-sm text-gray-500 mt-2">
                  <ArrowUpRight className="h-3 w-3 mr-1 text-green-500" />
                  <span className="text-green-500 font-medium">12% </span>
                  <span className="ml-1">{t('dashboard.increaseSinceLast')}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow">
              <div className="absolute top-0 right-0 w-20 h-20 bg-purple-50 rounded-bl-full"></div>
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
                  <UserCheck className="h-4 w-4 mr-2 text-purple-500" />
                  {t('dashboard.activeContacts')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="text-3xl font-bold text-gray-800 mt-2">42</div>
                <div className="flex items-center text-sm text-gray-500 mt-2">
                  <span>de 142 contatos totais</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Chart com design aprimorado */}
          <Card className="mb-8 overflow-hidden border-none shadow-md">
            <CardHeader className="border-b bg-gray-50">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-gray-800">{t('dashboard.messageActivity')}</CardTitle>
                  <CardDescription>{t('dashboard.last7Days')}</CardDescription>
                </div>
                <div className="flex gap-2 mt-2 md:mt-0">
                  <Button size="sm" variant="outline" className="h-8 text-xs">
                    Semanal
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs bg-gray-100">
                    Mensal
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#25D366" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#25D366" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false}
                      stroke="#888"
                      fontSize={12}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      stroke="#888"
                      fontSize={12}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="messages" 
                      stroke="#25D366" 
                      fillOpacity={1} 
                      fill="url(#colorMessages)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Action Cards com design moderno */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="border-none shadow-md">
              <CardHeader className="border-b bg-gray-50">
                <CardTitle className="text-gray-800">{t('dashboard.quickActions')}</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 gap-3">
                  <Link href="/instances">
                    <a className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-all border border-gray-100 hover:border-primary/20 hover:shadow-sm group">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-primary mr-3 group-hover:bg-primary/20 transition-colors">
                          <Plus className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="font-medium text-gray-800">{t('dashboard.createInstance')}</span>
                          <p className="text-xs text-gray-500 mt-0.5">Conecte uma nova conta WhatsApp</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors" />
                    </a>
                  </Link>
                  
                  <Link href="/chat">
                    <a className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-all border border-gray-100 hover:border-primary/20 hover:shadow-sm group">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mr-3 group-hover:bg-blue-100 transition-colors">
                          <MessageSquare className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="font-medium text-gray-800">{t('dashboard.goToMessages')}</span>
                          <p className="text-xs text-gray-500 mt-0.5">Gerencie suas conversas</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    </a>
                  </Link>
                  
                  <Link href="/settings">
                    <a className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-all border border-gray-100 hover:border-primary/20 hover:shadow-sm group">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-500 mr-3 group-hover:bg-purple-100 transition-colors">
                          <Settings className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="font-medium text-gray-800">{t('dashboard.customizeSettings')}</span>
                          <p className="text-xs text-gray-500 mt-0.5">Personalize sua experiência</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
                    </a>
                  </Link>
                </div>
              </CardContent>
            </Card>
            
            {user?.role === 'admin' && (
              <Card className="border-none shadow-md">
                <CardHeader className="border-b bg-gray-50">
                  <CardTitle className="text-gray-800">{t('dashboard.adminTools')}</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 gap-3">
                    <Link href="/admin/users">
                      <a className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-all border border-gray-100 hover:border-orange-200 hover:shadow-sm group">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 mr-3 group-hover:bg-orange-100 transition-colors">
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="font-medium text-gray-800">{t('dashboard.manageUsers')}</span>
                            <p className="text-xs text-gray-500 mt-0.5">Gerencie usuários e permissões</p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                      </a>
                    </Link>
                    
                    <Link href="/admin/instances">
                      <a className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-all border border-gray-100 hover:border-cyan-200 hover:shadow-sm group">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-500 mr-3 group-hover:bg-cyan-100 transition-colors">
                            <Phone className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="font-medium text-gray-800">{t('dashboard.manageInstances')}</span>
                            <p className="text-xs text-gray-500 mt-0.5">Supervisione todas as instâncias</p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-cyan-500 transition-colors" />
                      </a>
                    </Link>
                    
                    <Link href="/admin/webhooks">
                      <a className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-all border border-gray-100 hover:border-indigo-200 hover:shadow-sm group">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 mr-3 group-hover:bg-indigo-100 transition-colors">
                            <ExternalLink className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="font-medium text-gray-800">{t('dashboard.webhookEvents')}</span>
                            <p className="text-xs text-gray-500 mt-0.5">Eventos de integrações externas</p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                      </a>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Debug toggle só aparece em ambiente de desenvolvimento */}
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-8 flex justify-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowDebug(!showDebug)}
                className="text-xs"
              >
                {showDebug ? 'Ocultar' : 'Mostrar'} WebSocket Debug
              </Button>
            </div>
          )}
          
          {/* WebSocket Debug - só mostrado quando habilitado */}
          {showDebug && <WebSocketDebug />}
        </main>
      </div>
    </div>
  );
}
