import { ApiKeyManager } from "@/components/ApiKeyManager";
import DashboardLayout from "@/components/layouts/DashboardLayout";

export default function ApiKeysPage() {
  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Gerenciamento de Chaves de API</h1>
        <p className="text-muted-foreground mb-8">
          Gerencie suas chaves de API para serviços externos como OpenAI, Google AI, e outros.
          Estas chaves são usadas pelos recursos de IA e automação.
        </p>
        
        <ApiKeyManager />
      </div>
    </DashboardLayout>
  );
}