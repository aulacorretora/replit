import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useState, useEffect } from "react";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType;
}

export function ProtectedRoute({
  path,
  component: Component,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [localLoading, setLocalLoading] = useState(true);
  const [sessionVerified, setSessionVerified] = useState(false);
  const [storedUser, setStoredUser] = useState<any>(null);
  
  useEffect(() => {
    console.log('ProtectedRoute:', { path, user, isLoading, localLoading });
    
    try {
      const stored = localStorage.getItem('zapban_user');
      if (stored) {
        setStoredUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Erro ao ler usuário do localStorage:', e);
    }
    
    if (!isLoading) {
      const timer = setTimeout(() => {
        setLocalLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, path, user]);
  
  useEffect(() => {
    if (!user && storedUser && !sessionVerified && !isLoading && !localLoading) {
      console.log('User found in localStorage but not in context, verifying session...');
      
      const verifySession = async () => {
        try {
          const res = await fetch('/api/auth/user', {
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Credentials': 'include'
            }
          });
          
          setSessionVerified(true);
          
          if (!res.ok) {
            console.warn('Session verification failed, redirecting to login');
            localStorage.removeItem('zapban_user');
            localStorage.removeItem('userId');
            window.location.href = '/auth';
          } else {
            console.log('Session verified successfully');
            window.location.reload();
          }
        } catch (err) {
          console.error('Error verifying session:', err);
          setSessionVerified(true);
        }
      };
      
      verifySession();
    }
  }, [user, storedUser, sessionVerified, isLoading, localLoading]);

  // Se estiver carregando, mostra um loader
  if (isLoading || localLoading || (!user && storedUser && !sessionVerified)) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  // Se não estiver autenticado, redireciona para a página de login
  if (!user && !storedUser) {
    console.log('No user found in context or localStorage, redirecting to /auth');
    
    localStorage.removeItem('zapban_user');
    localStorage.removeItem('userId');
    
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Se estiver autenticado, renderiza o componente
  return (
    <Route path={path}>
      <Component />
    </Route>
  );
}
