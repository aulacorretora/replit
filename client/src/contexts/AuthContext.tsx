import { createContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User } from '@shared/schema';
import { API_ENDPOINTS } from '@/lib/constants';
import { getQueryFn } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

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
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Busca o usuário atual quando o componente é montado
  const {
    data: userData,
    error,
    isLoading,
  } = useQuery({
    queryKey: [API_ENDPOINTS.USER],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    gcTime: 1000 * 60 * 60, // 1 hora (em TanStack Query v5, use gcTime em vez de cacheTime)
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Atualiza o estado de usuário quando os dados chegam
  useEffect(() => {
    if (userData) {
      const userObj = userData as User;
      setUser(userObj);
      
      // Armazena o ID do usuário no localStorage para uso em outras partes do aplicativo
      if (userObj.id) {
        console.log("Armazenando ID do usuário no localStorage:", userObj.id);
        localStorage.setItem('user_id', userObj.id.toString());
      }
    } else {
      // Se não há dados do usuário, limpar localStorage
      localStorage.removeItem('user_id');
    }
  }, [userData]);

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
        loading: isLoading,
        setUser,
        error: error as Error | null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
