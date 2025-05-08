import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { z } from "zod";
import React from "react";
import { useToast } from "./use-toast";
import { API_ENDPOINTS } from "../lib/constants";
import { apiRequest, queryClient } from "../lib/queryClient";
import { User } from "../../../shared/schema";
import { supabase, signIn, signOut, resetPassword, updatePassword, getCurrentUser } from "../lib/supabase";

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
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
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

  // Mutation para login usando Supabase
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("Tentando login com Supabase:", credentials.email);
      
      try {
        // Usar o Supabase para autenticação
        const { data, error } = await signIn(credentials.email, credentials.password);
        
        if (error) {
          console.error("Erro de autenticação Supabase:", error);
          throw new Error(error.message || 'Erro ao fazer login com Supabase');
        }
        
        if (!data.user) {
          throw new Error('Usuário não encontrado');
        }
        
        // Buscar dados adicionais do usuário do banco de dados
        const res = await apiRequest('POST', API_ENDPOINTS.LOGIN, credentials, {
          'Content-Type': 'application/json'
        });
        
        if (!res.ok) {
          console.error("API local retornou erro após login Supabase");
          return {
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuário',
            role: data.user.user_metadata?.role || 'user',
            active: true
          };
        }
        
        const localUserData = await res.json();
        return localUserData;
      } catch (err) {
        console.error("Erro durante login com Supabase:", err);
        throw err;
      }
    },
    onSuccess: async (userData: User) => {
      console.log("Login com Supabase bem-sucedido:", userData);
      queryClient.setQueryData([API_ENDPOINTS.USER], userData);
      
      // Salvar dados do usuário no localStorage
      localStorage.setItem('zapban_user', JSON.stringify(userData));
      localStorage.setItem('userId', userData.id.toString());
      
      try {
        const { user, error } = await getCurrentUser();
        
        if (error) {
          console.warn('Erro ao verificar sessão do Supabase:', error);
        } else if (user) {
          console.log('Sessão do Supabase verificada com sucesso');
        }
      } catch (err) {
        console.error('Erro ao verificar sessão do Supabase:', err);
      }
      
      console.log('Redirecionando para dashboard imediatamente');
      window.location.href = '/dashboard';
      
      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo(a), ${userData.name}!`,
      });
    },
    onError: (error: Error) => {
      console.error("Erro durante login:", error);
      toast({
        title: "Falha no login",
        description: error.message || "Verifique suas credenciais e tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para registro usando Supabase
  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      console.log("Tentando registro com Supabase:", userData.email);
      
      try {
        // Registrar usuário no Supabase
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: userData.email,
          password: userData.password,
          options: {
            data: {
              name: userData.name,
              role: 'user'
            }
          }
        });
        
        if (authError) {
          console.error("Erro de registro Supabase:", authError);
          throw new Error(authError.message || 'Erro ao cadastrar com Supabase');
        }
        
        if (!authData.user) {
          throw new Error('Falha ao criar usuário');
        }
        
        const formData = {
          name: userData.name,
          email: userData.email,
          password: userData.password,
        };
        
        try {
          const res = await apiRequest('POST', API_ENDPOINTS.REGISTER, formData, {
            'Content-Type': 'application/json'
          });
          
          if (res.ok) {
            const localUserData = await res.json();
            return localUserData;
          }
        } catch (localError) {
          console.warn("Erro ao registrar no sistema local, usando dados do Supabase:", localError);
        }
        
        // Se o registro local falhar, retornar dados do Supabase
        return {
          id: authData.user.id,
          email: authData.user.email || '',
          name: userData.name,
          role: 'user',
          active: true
        };
      } catch (err) {
        console.error("Erro durante registro com Supabase:", err);
        throw err;
      }
    },
    onSuccess: async (userData: User) => {
      console.log("Registro com Supabase bem-sucedido:", userData);
      queryClient.setQueryData([API_ENDPOINTS.USER], userData);
      
      // Salvar dados do usuário no localStorage
      localStorage.setItem('zapban_user', JSON.stringify(userData));
      localStorage.setItem('userId', userData.id.toString());
      
      try {
        const { user, error } = await getCurrentUser();
        
        if (error) {
          console.warn('Erro ao verificar sessão do Supabase após registro:', error);
        } else if (user) {
          console.log('Sessão do Supabase verificada com sucesso após registro');
        }
      } catch (err) {
        console.error('Erro ao verificar sessão do Supabase após registro:', err);
      }
      
      console.log('Redirecionando para dashboard imediatamente');
      window.location.href = '/dashboard';
      
      toast({
        title: "Cadastro realizado com sucesso",
        description: `Conta criada para ${userData.name}.`,
      });
    },
    onError: (error: Error) => {
      console.error("Erro durante registro:", error);
      toast({
        title: "Falha no cadastro",
        description: error.message || "Não foi possível criar sua conta. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para logout usando Supabase
  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log("Tentando logout com Supabase");
      
      try {
        // Usar o Supabase para logout
        const { error } = await signOut();
        
        if (error) {
          console.error("Erro de logout Supabase:", error);
          throw new Error(error.message || 'Erro ao fazer logout com Supabase');
        }
        
        try {
          const res = await apiRequest('POST', API_ENDPOINTS.LOGOUT, undefined, {});
          if (!res.ok) {
            console.warn("Erro ao fazer logout no sistema local, mas continuando com logout do Supabase");
          }
        } catch (localError) {
          console.warn("Erro ao fazer logout no sistema local:", localError);
        }
      } catch (err) {
        console.error("Erro durante logout com Supabase:", err);
        throw err;
      }
    },
    onSuccess: () => {
      console.log("Logout com Supabase bem-sucedido");
      queryClient.setQueryData([API_ENDPOINTS.USER], null);
      
      // Limpar dados do usuário do localStorage
      localStorage.removeItem('zapban_user');
      localStorage.removeItem('userId');
      
      window.location.href = '/auth';
      
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    },
    onError: (error: Error) => {
      console.error("Erro durante logout:", error);
      toast({
        title: "Falha ao desconectar",
        description: error.message || "Não foi possível realizar o logout.",
        variant: "destructive",
      });
    },
  });

  // Mutation para recuperação de senha usando Supabase
  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordData) => {
      console.log("Tentando recuperação de senha com Supabase:", data.email);
      
      try {
        // Usar o Supabase para recuperação de senha
        const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        
        if (error) {
          console.error("Erro de recuperação de senha Supabase:", error);
          throw new Error(error.message || 'Erro ao solicitar recuperação de senha com Supabase');
        }
        
        try {
          const res = await apiRequest('POST', API_ENDPOINTS.FORGOT_PASSWORD, data, {
            'Content-Type': 'application/json'
          });
          if (!res.ok) {
            console.warn("Erro ao solicitar recuperação de senha no sistema local, mas continuando com Supabase");
          }
        } catch (localError) {
          console.warn("Erro ao solicitar recuperação de senha no sistema local:", localError);
        }
      } catch (err) {
        console.error("Erro durante recuperação de senha com Supabase:", err);
        throw err;
      }
    },
    onSuccess: () => {
      console.log("Recuperação de senha com Supabase bem-sucedida");
      toast({
        title: "E-mail enviado",
        description: "Verifique sua caixa de entrada para instruções de recuperação de senha.",
      });
    },
    onError: (error: Error) => {
      console.error("Erro durante recuperação de senha:", error);
      toast({
        title: "Falha na solicitação",
        description: error.message || "Não foi possível enviar o e-mail de recuperação.",
        variant: "destructive",
      });
    },
  });

  // Mutation para redefinição de senha usando Supabase
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordData) => {
      console.log("Tentando redefinir senha com Supabase");
      
      try {
        // Usar o Supabase para redefinição de senha
        const { error } = await updatePassword(data.password);
        
        if (error) {
          console.error("Erro de redefinição de senha Supabase:", error);
          throw new Error(error.message || 'Erro ao redefinir senha com Supabase');
        }
        
        try {
          const res = await apiRequest('POST', API_ENDPOINTS.RESET_PASSWORD, data, {
            'Content-Type': 'application/json'
          });
          if (!res.ok) {
            console.warn("Erro ao redefinir senha no sistema local, mas continuando com Supabase");
          }
        } catch (localError) {
          console.warn("Erro ao redefinir senha no sistema local:", localError);
        }
      } catch (err) {
        console.error("Erro durante redefinição de senha com Supabase:", err);
        throw err;
      }
    },
    onSuccess: () => {
      console.log("Redefinição de senha com Supabase bem-sucedida");
      toast({
        title: "Senha redefinida",
        description: "Sua senha foi alterada com sucesso. Faça login com a nova senha.",
      });
      
      window.location.href = '/auth';
    },
    onError: (error: Error) => {
      console.error("Erro durante redefinição de senha:", error);
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
