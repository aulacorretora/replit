import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useState, useEffect, useMemo } from "react";

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
  
  console.log('ProtectedRoute:', { path, user, isLoading, localLoading });
  
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setLocalLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);
  
  const storedUser = useMemo(() => {
    if (!user) {
      try {
        const stored = localStorage.getItem('zapban_user');
        return stored ? JSON.parse(stored) : null;
      } catch (e) {
        console.error('Erro ao ler usuário do localStorage:', e);
        return null;
      }
    }
    return null;
  }, [user]);

  // Se estiver carregando, mostra um loader
  if (isLoading || localLoading) {
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
    
    setTimeout(() => {
      window.location.href = '/auth';
    }, 1500); // Aumentado para 1500ms para consistência com outros redirecionamentos
    
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }
  
  if (!user && storedUser) {
    console.log('User found in localStorage but not in context, verifying session...');
    
    useEffect(() => {
      const verifySession = async () => {
        try {
          const res = await fetch('https://zapban.com/api/auth/user', {
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Credentials': 'include'
            }
          });
          
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
        }
      };
      
      verifySession();
    }, []);
    
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
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
