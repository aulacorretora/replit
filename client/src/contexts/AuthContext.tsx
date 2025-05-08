import { createContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User } from '@shared/schema';
import { API_ENDPOINTS } from '@/lib/constants';
import { getQueryFn } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { supabase, getCurrentUser } from '@/lib/supabase';

// Interface para as propriedades do contexto
interface AuthContextProps {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  error: Error | null;
}

// Cria o contexto com valor inicial null
export const AuthContext = createContext<AuthContextProps | null>(null);

// Provider que envolve a aplicação e fornece os dados de autenticação
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseLoading, setSupabaseLoading] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkSupabaseSession = async () => {
      try {
        console.log('Verificando sessão do Supabase...');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log('Sessão do Supabase encontrada:', session.user.email);
          
          // Busca os dados completos do usuário da API
          const response = await fetch(`${window.location.origin}${API_ENDPOINTS.USER}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const userData = await response.json();
            console.log('Dados do usuário obtidos da API:', userData);
            setUser(userData);
            
            if (userData.id) {
              console.log("Armazenando ID do usuário no localStorage:", userData.id);
              localStorage.setItem('userId', userData.id.toString());
              localStorage.setItem('zapban_user', JSON.stringify(userData));
            }
            
            // Atualiza o cache do React Query
            queryClient.setQueryData(['user'], userData);
          } else {
            console.warn('Sessão do Supabase existe, mas não foi possível obter dados do usuário da API');
          }
        } else {
          console.log('Nenhuma sessão do Supabase encontrada');
        }
      } catch (error) {
        console.error('Erro ao verificar sessão do Supabase:', error);
      } finally {
        setSupabaseLoading(false);
      }
    };
    
    checkSupabaseSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Evento de autenticação do Supabase:', event);
        
        if (event === 'SIGNED_IN' && session) {
          console.log('Usuário autenticado no Supabase:', session.user.email);
          
          // Busca os dados completos do usuário da API
          try {
            const response = await fetch(`${window.location.origin}${API_ENDPOINTS.USER}`, {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (response.ok) {
              const userData = await response.json();
              console.log('Dados do usuário obtidos da API após login:', userData);
              setUser(userData);
              
              if (userData.id) {
                console.log("Armazenando ID do usuário no localStorage:", userData.id);
                localStorage.setItem('userId', userData.id.toString());
                localStorage.setItem('zapban_user', JSON.stringify(userData));
              }
              
              // Atualiza o cache do React Query
              queryClient.setQueryData(['user'], userData);
            }
          } catch (error) {
            console.error('Erro ao buscar dados do usuário após login:', error);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('Usuário desconectado do Supabase');
          setUser(null);
          localStorage.removeItem('userId');
          localStorage.removeItem('zapban_user');
          queryClient.setQueryData(['user'], null);
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  // Busca o usuário atual quando o componente é montado
  const fetchUser = async () => {
    try {
      const { user: supabaseUser, error: supabaseError } = await getCurrentUser();
      
      if (supabaseUser) {
        console.log('Usuário encontrado no Supabase:', supabaseUser.email);
      }
      
      const response = await fetch(`${window.location.origin}${API_ENDPOINTS.USER}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) return null;
        throw new Error('Falha ao buscar usuário');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      throw error;
    }
  };

  const {
    data: userData,
    error,
    isLoading,
  } = useQuery({
    queryKey: ['user'],
    queryFn: fetchUser,
    retry: false,
    gcTime: 1000 * 60 * 60, // 1 hora (em TanStack Query v5, use gcTime em vez de cacheTime)
    staleTime: 1000 * 60 * 5, // 5 minutos
    enabled: !supabaseLoading, // Só executa a query depois de verificar a sessão do Supabase
  });

  // Atualiza o estado de usuário quando os dados chegam
  useEffect(() => {
    if (userData) {
      const userObj = userData as User;
      setUser(userObj);
      
      // Armazena o ID do usuário no localStorage para uso em outras partes do aplicativo
      if (userObj.id) {
        console.log("Armazenando ID do usuário no localStorage:", userObj.id);
        localStorage.setItem('userId', userObj.id.toString());
        localStorage.setItem('zapban_user', JSON.stringify(userObj));
      }
    } else if (!supabaseLoading) {
      // Se não há dados do usuário e já verificamos o Supabase, limpar localStorage
      localStorage.removeItem('userId');
      localStorage.removeItem('zapban_user');
    }
  }, [userData, supabaseLoading]);

  // Exibe mensagem de erro se houver falha na busca do usuário
  useEffect(() => {
    if (error) {
      console.error('Erro ao buscar informações do usuário:', error);
      toast({
        title: "Erro de autenticação",
        description: "Não foi possível obter suas informações de login.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: isLoading || supabaseLoading,
        setUser,
        error: error as Error | null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
