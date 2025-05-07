import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Clock, LineChart, TrendingUp, Users } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import DashboardLayout from "@/components/layouts/DashboardLayout";

export default function AnalyticsPage() {
  const { t } = useLanguage();
  
  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{t('analytics.title') || 'Relatórios e Estatísticas'}</h1>
            <p className="text-muted-foreground">
              {t('analytics.description') || 'Acompanhe e analise o desempenho das suas conversas e automações.'}
            </p>
          </div>

          {/* Seção de estatísticas em breve */}
          <Card className="p-10 flex flex-col items-center justify-center text-center">
            <div className="mb-6 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <BarChart className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {t('analytics.comingSoon') || 'Em breve você poderá acompanhar estatísticas da sua operação aqui.'}
            </h2>
            <p className="text-muted-foreground max-w-xl">
              {t('analytics.comingSoonDesc') || 'Estamos trabalhando para trazer análises detalhadas, gráficos de desempenho e métricas importantes para ajudar você a otimizar sua operação.'}
            </p>
          </Card>

          {/* Cards de mockup para demonstrar o layout futuro */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="opacity-60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('analytics.totalConversations') || 'Total de Conversas'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">--</div>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="opacity-60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('analytics.responseTime') || 'Tempo de Resposta'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">--</div>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="opacity-60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('analytics.automationUse') || 'Uso de Automações'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">--</div>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="opacity-60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('analytics.aiAgentEfficiency') || 'Eficiência dos Agentes'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">--</div>
                  <LineChart className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}