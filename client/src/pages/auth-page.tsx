import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";

// Logo e imagens
import logo from "@/assets/logo.svg";

const AuthPage = () => {
  const [location, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("login");
  const [forgotPasswordSubmitted, setForgotPasswordSubmitted] = useState(false);

  const { 
    user, 
    isLoading, 
    loginMutation, 
    registerMutation, 
    forgotPasswordMutation,
    loginSchema,
    registerSchema,
    forgotPasswordSchema
  } = useAuth();

  // Redirecionar se já estiver autenticado
  useEffect(() => {
    if (user) {
      console.log("Usuário autenticado, redirecionando para dashboard");
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Formulário de login
  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Formulário de registro
  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Formulário de recuperação de senha
  const forgotPasswordForm = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // Função para lidar com o login
  const handleLogin = (data: z.infer<typeof loginSchema>) => {
    console.log("Tentando fazer login com:", { email: data.email, password: "***" });
    try {
      console.log("Iniciando mutação de login");
      loginMutation.mutate(data, {
        onError: (error: Error) => {
          console.error("Erro durante login:", error);
        },
        onSuccess: (userData: any) => {
          console.log("Login bem-sucedido:", userData);
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 500);
        }
      });
    } catch (err) {
      console.error("Exceção ao tentar login:", err);
    }
  };

  // Função para lidar com o registro
  const handleRegister = (data: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(data);
  };

  // Função para lidar com a recuperação de senha
  const handleForgotPassword = (data: z.infer<typeof forgotPasswordSchema>) => {
    forgotPasswordMutation.mutate(data, {
      onSuccess: () => {
        setForgotPasswordSubmitted(true);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Lado esquerdo - Formulário */}
      <div className="flex flex-col justify-center items-center w-full md:w-1/2 p-4 md:p-8">
        <div className="mb-8">
          <img src={logo} alt="ZapBan Logo" className="h-16" />
        </div>

        <Tabs
          defaultValue="login"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full max-w-md"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Criar Conta</TabsTrigger>
          </TabsList>

          {/* Tab de Login */}
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>
                  Entre com seu email e senha para acessar sua conta.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...loginForm}>
                  <form 
                    onSubmit={loginForm.handleSubmit(handleLogin)} 
                    className="space-y-4"
                  >
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="seu.email@exemplo.com" 
                              autoComplete="email" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="******" 
                              autoComplete="current-password" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        "Entrar"
                      )}
                    </Button>
                  </form>
                </Form>

                {loginMutation.isError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertDescription>
                      {loginMutation.error?.message || "Falha no login. Verifique suas credenciais."}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button 
                  variant="link" 
                  onClick={() => setActiveTab("forgotPassword")}
                >
                  Esqueci minha senha
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Tab de Cadastro */}
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Criar Nova Conta</CardTitle>
                <CardDescription>
                  Preencha os dados abaixo para criar sua conta na plataforma.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...registerForm}>
                  <form 
                    onSubmit={registerForm.handleSubmit(handleRegister)} 
                    className="space-y-4"
                  >
                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Seu nome" 
                              autoComplete="name" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="seu.email@exemplo.com" 
                              autoComplete="email" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="******" 
                              autoComplete="new-password" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmar Senha</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="******" 
                              autoComplete="new-password" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Criando conta...
                        </>
                      ) : (
                        "Criar Conta"
                      )}
                    </Button>
                  </form>
                </Form>

                {registerMutation.isError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertDescription>
                      {registerMutation.error?.message || "Não foi possível criar a conta. Tente novamente."}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button 
                  variant="link" 
                  onClick={() => setActiveTab("login")}
                >
                  Já tem uma conta? Entrar
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Tab de Recuperação de Senha */}
          <TabsContent value="forgotPassword">
            <Card>
              <CardHeader>
                <CardTitle>Recuperar Senha</CardTitle>
                <CardDescription>
                  Informe seu e-mail para receber instruções de recuperação de senha.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {forgotPasswordSubmitted ? (
                  <div className="space-y-4">
                    <Alert className="bg-primary/10 border-primary/20">
                      <AlertDescription>
                        Se o email estiver cadastrado em nossa plataforma, você receberá em breve as instruções para recuperação de senha.
                      </AlertDescription>
                    </Alert>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setForgotPasswordSubmitted(false);
                        setActiveTab("login");
                      }}
                    >
                      Voltar para o Login
                    </Button>
                  </div>
                ) : (
                  <Form {...forgotPasswordForm}>
                    <form
                      onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)}
                      className="space-y-4"
                    >
                      <FormField
                        control={forgotPasswordForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="seu.email@exemplo.com"
                                autoComplete="email"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={forgotPasswordMutation.isPending}
                      >
                        {forgotPasswordMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          "Enviar Instruções"
                        )}
                      </Button>
                    </form>
                  </Form>
                )}

                {forgotPasswordMutation.isError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertDescription>
                      {forgotPasswordMutation.error?.message || "Não foi possível processar sua solicitação. Tente novamente."}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button
                  variant="link"
                  onClick={() => setActiveTab("login")}
                >
                  Voltar para o Login
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Lado direito - Hero */}
      <div className="hidden md:flex flex-col justify-center items-center w-1/2 bg-primary p-8 text-primary-foreground">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold mb-6">ZapBan - Gestão de WhatsApp Profissional</h1>
          <p className="text-lg mb-8">
            Uma plataforma completa para gestão de múltiplas instâncias do WhatsApp.
            Atendimento humanizado com IA, automatizações e integração com seu CRM.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary-foreground/10 p-4 rounded-lg">
              <h3 className="font-semibold text-xl mb-2">Múltiplas Instâncias</h3>
              <p>Gerencie vários números de WhatsApp em uma única interface.</p>
            </div>
            <div className="bg-primary-foreground/10 p-4 rounded-lg">
              <h3 className="font-semibold text-xl mb-2">Automações</h3>
              <p>Crie fluxos de automação avançados com o nosso editor visual.</p>
            </div>
            <div className="bg-primary-foreground/10 p-4 rounded-lg">
              <h3 className="font-semibold text-xl mb-2">Agentes de IA</h3>
              <p>Atendentes virtuais com inteligência artificial avançada.</p>
            </div>
            <div className="bg-primary-foreground/10 p-4 rounded-lg">
              <h3 className="font-semibold text-xl mb-2">Análises Detalhadas</h3>
              <p>Relatórios e métricas para acompanhar o desempenho.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
