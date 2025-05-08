import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "./hooks/use-auth";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useWebSocket } from "./hooks/use-websocket";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ProtectedRoute } from "./lib/protected-route";

// Pages
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/Dashboard";
import Chat from "@/pages/Chat";
import Instances from "@/pages/Instances";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import AdminPanel from "@/pages/admin/AdminPanel";
import NotFound from "@/pages/not-found";
// Novas páginas
import AiAgentsPage from "@/pages/ai-agents-page";
import AutomationsPage from "@/pages/automations-page";
import ApiKeysPage from "@/pages/api-keys-page";
import AnalyticsPage from "@/pages/analytics-page";
// Novas páginas administrativas
import WebhookEventsPage from "@/pages/admin/webhook-events-page";
import UsersPage from "@/pages/admin/users-page";

// Componente para proteger rotas de administrador
function AdminRoute({ path, component: Component }: { path: string, component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="animate-spin h-12 w-12 text-primary" />
        </div>
      </Route>
    );
  }
  
  // Verificar se o usuário é administrador
  if (!user || user.role !== 'admin') {
    return (
      <Route path={path}>
        <NotFound />
      </Route>
    );
  }
  
  return (
    <Route path={path}>
      <Component />
    </Route>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/chat" component={Chat} />
      <ProtectedRoute path="/instances" component={Instances} />
      <ProtectedRoute path="/profile" component={Profile} />
      <ProtectedRoute path="/settings" component={Settings} />
      
      {/* Novas Rotas */}
      <ProtectedRoute path="/ai-agents" component={AiAgentsPage} />
      <ProtectedRoute path="/automations" component={AutomationsPage} />
      <ProtectedRoute path="/api-keys" component={ApiKeysPage} />
      <ProtectedRoute path="/analytics" component={AnalyticsPage} />
      
      {/* Admin Routes */}
      <AdminRoute path="/admin" component={AdminPanel} />
      <AdminRoute path="/admin/users" component={UsersPage} />
      <AdminRoute path="/admin/webhook-events" component={WebhookEventsPage} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

// Single WebSocket connection manager
function WebSocketManager() {
  const { user } = useAuth();
  const [wsInstance, setWsInstance] = useState<any>(null);
  const [hasIdentified, setHasIdentified] = useState(false);
  
  // Load WebSocket module and connect only once when app starts
  useEffect(() => {
    console.log("WebSocketManager initialized - importing module...");
    const initWebSocket = async () => {
      try {
        // Dynamic import of the WebSocket module
        const ws = await import('@/lib/websocket');
        const websocket = ws.default;
        
        console.log("WebSocket module imported successfully");
        setWsInstance(websocket);
        
        // Connect only once at startup
        console.log("Establishing single global WebSocket connection...");
        websocket.connect();
      } catch (error) {
        console.error("Failed to initialize WebSocket:", error);
      }
    };
    
    // Only initialize once
    initWebSocket();
    
    // Clean up function for component unmount
    return () => {
      console.log("App unmounting - no need to disconnect WebSocket as it's a singleton");
      // We don't disconnect since other components might use the same connection
    };
  }, []); // Empty dependency array makes this run only once at app mount
  
  // Identify user when both websocket is available and user is authenticated
  useEffect(() => {
    if (wsInstance && !hasIdentified) {
      const storedUserId = localStorage.getItem('userId');
      const userId = (user && user.id) || storedUserId;
      
      if (userId) {
        console.log(`Attempting to identify user ${userId} with WebSocket (source: ${storedUserId ? 'localStorage' : 'context'})`);
        
        const timer = setTimeout(() => {
          // Only send if socket is ready
          try {
            wsInstance.send('identify', { userId });
            console.log(`WebSocket identified as user ${userId}`);
            setHasIdentified(true);
          } catch (err) {
            console.error('Error identifying WebSocket user:', err);
            setTimeout(() => {
              if (wsInstance) {
                try {
                  wsInstance.send('identify', { userId });
                  console.log(`WebSocket retry identification successful for user ${userId}`);
                  setHasIdentified(true);
                } catch (retryErr) {
                  console.error('Retry identification failed:', retryErr);
                }
              }
            }, 2000);
          }
        }, 2000);
        
        return () => clearTimeout(timer);
      } else {
        console.log('No user ID available for WebSocket identification');
      }
    }
  }, [user, wsInstance, hasIdentified]); // Run when user or wsInstance changes
  
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <ThemeProvider attribute="class">
            <TooltipProvider>
              <Toaster />
              <WebSocketManager />
              <Router />
            </TooltipProvider>
          </ThemeProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
