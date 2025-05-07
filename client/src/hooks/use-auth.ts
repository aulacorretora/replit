import { useCallback } from 'react';
import { useLocation } from 'wouter';
import { User } from '@shared/schema';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/lib/constants';
import { z } from 'zod';

type AuthUser = User | null;

// Schemas para validação de formulários
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

export const registerSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'A confirmação deve ter pelo menos 6 caracteres'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não conferem',
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'A confirmação deve ter pelo menos 6 caracteres'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não conferem',
  path: ['confirmPassword'],
});

interface UseAuthReturn {
  user: AuthUser;
  loading: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (password: string, token: string) => Promise<void>;
  loginMutation: any;
  registerMutation: any;
  forgotPasswordMutation: any;
  resetPasswordMutation: any;
  loginSchema: typeof loginSchema;
  registerSchema: typeof registerSchema;
  forgotPasswordSchema: typeof forgotPasswordSchema;
  resetPasswordSchema: typeof resetPasswordSchema;
}

export const useAuth = (): UseAuthReturn => {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  // Fetch the current user data
  const { 
    data: user, 
    isLoading: loading, 
    error,
    refetch 
  } = useQuery<AuthUser>({ 
    queryKey: [API_ENDPOINTS.USER],
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 0, // Não tentar novamente em caso de erro 401 (usuário não autenticado)
    refetchOnWindowFocus: false, // Evita que o usuário seja redirecionado em loop se não estiver autenticado
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string, password: string }) => {
      try {
        console.log("Enviando requisição de login para:", API_ENDPOINTS.LOGIN);
        const response = await apiRequest('POST', API_ENDPOINTS.LOGIN, { email, password });
        
        // Verificar se a resposta foi bem-sucedida
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Resposta de erro do servidor:", errorData);
          throw new Error(errorData.message || "Erro ao fazer login");
        }
        
        const responseData = await response.json();
        console.log("Resposta do servidor de login:", { ...responseData, senha: '[REMOVIDA]' });
        return responseData;
      } catch (error) {
        console.error("Erro no processo de login:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Login bem-sucedido, redirecionando para dashboard", { ...data, senha: '[REMOVIDA]' });
      
      // Definir o usuário diretamente para garantir que temos os dados
      queryClient.setQueryData([API_ENDPOINTS.USER], data);
      
      // Em seguida, invalidar para garantir que dados frescos serão buscados
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.USER] });
      
      // Carregar os dados do usuário novamente para verificar a sessão antes do redirecionamento
      queryClient.refetchQueries({ queryKey: [API_ENDPOINTS.USER] });
      
      // Forçar um pequeno atraso para que o estado seja atualizado antes do redirecionamento
      setTimeout(() => {
        // Usar o navigate do wouter em vez de window.location para evitar recarregar a página
        console.log("Redirecionando para a página inicial");
        navigate('/');
      }, 1000); // Aumento do delay para 1 segundo para dar tempo ao estado ser atualizado
    },
    onError: (error) => {
      console.error("Erro durante o login:", error);
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', API_ENDPOINTS.LOGOUT);
    },
    onSuccess: () => {
      queryClient.clear(); // Clear all queries
      navigate('/auth');
    },
  });

  // Forgot password mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest('POST', API_ENDPOINTS.FORGOT_PASSWORD, { email });
      return response.json();
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ password, token }: { password: string, token: string }) => {
      const response = await apiRequest('POST', API_ENDPOINTS.RESET_PASSWORD, { password, token });
      return response.json();
    },
    onSuccess: () => {
      navigate('/auth');
    },
  });

  // Login function
  const login = useCallback(async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  }, [loginMutation]);

  // Logout function
  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  // Forgot password function
  const forgotPassword = useCallback(async (email: string) => {
    await forgotPasswordMutation.mutateAsync(email);
  }, [forgotPasswordMutation]);

  // Reset password function
  const resetPassword = useCallback(async (password: string, token: string) => {
    await resetPasswordMutation.mutateAsync({ password, token });
  }, [resetPasswordMutation]);

  // Criar uma mutation de registro mínima para satisfazer a interface
  const registerMutation = useMutation({
    mutationFn: async (userData: z.infer<typeof registerSchema>) => {
      const response = await apiRequest('POST', API_ENDPOINTS.REGISTER, userData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData([API_ENDPOINTS.USER], data);
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.USER] });
      setTimeout(() => {
        navigate('/');
      }, 100);
    },
  });

  return {
    user: user ?? null, // Ensure we always have a non-undefined value
    loading,
    isLoading: loading,
    error: error ? (error as Error).message : null,
    login,
    logout,
    forgotPassword,
    resetPassword,
    // Mutations
    loginMutation,
    registerMutation,
    forgotPasswordMutation,
    resetPasswordMutation,
    // Schemas
    loginSchema,
    registerSchema,
    forgotPasswordSchema,
    resetPasswordSchema
  };
};
