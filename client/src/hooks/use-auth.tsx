import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/lib/constants";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User } from "@shared/schema";

// Esquemas de validação
export const loginSchema = z.object({
  email: z.string().email({ message: "E-mail inválido" }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres" }),
});

export const registerSchema = z.object({
  name: z.string().min(3, { message: "O nome deve ter pelo menos 3 caracteres" }),
  email: z.string().email({ message: "E-mail inválido" }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres" }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "E-mail inválido" }),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres" }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

// Tipos de dados para as operações
type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;
type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

// Interface do contexto de autenticação
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
  forgotPasswordMutation: UseMutationResult<void, Error, ForgotPasswordData>;
  resetPasswordMutation: UseMutationResult<void, Error, ResetPasswordData>;
  loginSchema: typeof loginSchema;
  registerSchema: typeof registerSchema;
  forgotPasswordSchema: typeof forgotPasswordSchema;
  resetPasswordSchema: typeof resetPasswordSchema;
}

// Criação do contexto
export const AuthContext = createContext<AuthContextType | null>(null);

// Provider do contexto
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [localUser, setLocalUser] = useState<User | null>(null);
  
  // Carregar usuário do localStorage na inicialização
  useEffect(() => {
    try {
      const cachedUser = localStorage.getItem('zapban_user');
      if (cachedUser) {
        setLocalUser(JSON.parse(cachedUser));
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário do localStorage:', error);
    }
  }, []);
  
  // Buscar informações do usuário atual
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: [API_ENDPOINTS.USER],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', API_ENDPOINTS.USER, undefined, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Credentials': 'include'
          },
          credentials: 'include'
        });
        if (res.ok) {
          const userData = await res.json();
          // Salvar no localStorage
          localStorage.setItem('zapban_user', JSON.stringify(userData));
          // Salvar o ID separadamente para o WebSocket
          if (userData && userData.id) {
            localStorage.setItem('userId', userData.id.toString());
          }
          return userData;
        }
        localStorage.removeItem('zapban_user');
        localStorage.removeItem('userId');
        return null;
      } catch (err) {
        console.error('Erro ao buscar informações do usuário:', err);
        return null;
      }
    },
    initialData: localUser,
  });

  // Mutation para login
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest('POST', API_ENDPOINTS.LOGIN, credentials, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Credentials': 'include'
        }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Erro ao fazer login');
      }
      return await res.json();
    },
    onSuccess: (userData: User) => {
      queryClient.setQueryData([API_ENDPOINTS.USER], userData);
      // Salvar dados do usuário no localStorage
      localStorage.setItem('zapban_user', JSON.stringify(userData));
      localStorage.setItem('userId', userData.id.toString());
      
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
      
      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo(a), ${userData.name}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no login",
        description: error.message || "Verifique suas credenciais e tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para registro
  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      const formData = {
        name: userData.name,
        email: userData.email,
        password: userData.password,
      };
      
      const res = await apiRequest('POST', API_ENDPOINTS.REGISTER, formData, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Credentials': 'include'
        }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Erro ao cadastrar');
      }
      return await res.json();
    },
    onSuccess: (userData: User) => {
      queryClient.setQueryData([API_ENDPOINTS.USER], userData);
      // Salvar dados do usuário no localStorage
      localStorage.setItem('zapban_user', JSON.stringify(userData));
      localStorage.setItem('userId', userData.id.toString());
      
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
      
      toast({
        title: "Cadastro realizado com sucesso",
        description: `Conta criada para ${userData.name}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no cadastro",
        description: error.message || "Não foi possível criar sua conta. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para logout
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', API_ENDPOINTS.LOGOUT, undefined, {
        credentials: 'include',
        headers: {
          'Credentials': 'include'
        }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Erro ao fazer logout');
      }
    },
    onSuccess: () => {
      queryClient.setQueryData([API_ENDPOINTS.USER], null);
      // Limpar dados do usuário do localStorage
      localStorage.removeItem('zapban_user');
      localStorage.removeItem('userId');
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha ao desconectar",
        description: error.message || "Não foi possível realizar o logout.",
        variant: "destructive",
      });
    },
  });

  // Mutation para recuperação de senha
  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordData) => {
      const res = await apiRequest('POST', API_ENDPOINTS.FORGOT_PASSWORD, data, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Credentials': 'include'
        }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Erro ao solicitar recuperação de senha');
      }
    },
    onSuccess: () => {
      toast({
        title: "E-mail enviado",
        description: "Verifique sua caixa de entrada para instruções de recuperação de senha.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha na solicitação",
        description: error.message || "Não foi possível enviar o e-mail de recuperação.",
        variant: "destructive",
      });
    },
  });

  // Mutation para redefinição de senha
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordData) => {
      const res = await apiRequest('POST', API_ENDPOINTS.RESET_PASSWORD, data, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Credentials': 'include'
        }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Erro ao redefinir senha');
      }
    },
    onSuccess: () => {
      toast({
        title: "Senha redefinida",
        description: "Sua senha foi alterada com sucesso. Faça login com a nova senha.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha na redefinição",
        description: error.message || "Não foi possível redefinir sua senha.",
        variant: "destructive",
      });
    },
  });

  // Retorno do contexto com todos os valores
  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        forgotPasswordMutation,
        resetPasswordMutation,
        loginSchema,
        registerSchema,
        forgotPasswordSchema,
        resetPasswordSchema,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para acessar o contexto
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
