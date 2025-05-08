import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { users } from '@shared/schema';
import { createClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import { HTTP_STATUS, ERROR_TYPES } from '../lib/constants';

// Inicializa client do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// Verifica se as variáveis de ambiente estão definidas
if (!supabaseUrl || !supabaseKey) {
  console.error('ERRO CRÍTICO: Variáveis de ambiente do Supabase não estão definidas.');
  console.error('Por favor, configure SUPABASE_URL e SUPABASE_SERVICE_KEY no arquivo .env');
  process.exit(1); // Encerra o processo se as variáveis não estiverem definidas
}

console.log(`Inicializando Supabase client com URL: ${supabaseUrl}`);
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Função para verificar a conexão com o Supabase
const verifySupabaseConnection = async () => {
  try {
    console.log('Verificando conexão com Supabase...');
    const { error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }
    console.log('Supabase client inicializado com sucesso e conexão verificada');
    return true;
  } catch (error) {
    console.error('Erro fatal ao verificar cliente Supabase:', error);
    return false;
  }
};

verifySupabaseConnection().catch(error => {
  console.error('Erro ao verificar conexão com Supabase:', error);
  process.exit(1);
});

/**
 * Registra um novo usuário no sistema
 */
export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        type: ERROR_TYPES.VALIDATION_ERROR,
        message: 'Email, senha e nome são obrigatórios',
      });
    }

    // Verificar se o Supabase está disponível
    if (!supabase) {
      console.error('Supabase não está disponível para registro');
      return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
        type: ERROR_TYPES.SERVER_ERROR,
        message: 'Serviço de registro indisponível',
      });
    }

    // Verifica se o usuário já existe no Supabase
    console.log(`Verificando se o usuário ${email} já existe no Supabase...`);
    
    // Primeiro tenta criar o usuário no Supabase
    console.log(`Tentando criar usuário ${email} no Supabase...`);
    let supabaseUser = null;
    let supabaseData = null;
    
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: { name },
        email_confirm: true
      });
      
      if (error) {
        console.error('Erro ao criar usuário via admin API:', {
          message: error.message,
          status: error.status,
          code: error.code
        });
        
        if (error.message.includes('already exists') || error.status === 400) {
          return res.status(HTTP_STATUS.CONFLICT).json({
            type: ERROR_TYPES.DUPLICATED_ERROR,
            message: 'Este email já está em uso',
          });
        }
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
            },
          },
        });

        if (signUpError) {
          console.error('Erro ao criar usuário no Supabase via signUp:', {
            message: signUpError.message,
            status: signUpError.status,
            code: signUpError.code
          });
          
          if (signUpError.message.includes('already exists') || signUpError.status === 400) {
            return res.status(HTTP_STATUS.CONFLICT).json({
              type: ERROR_TYPES.DUPLICATED_ERROR,
              message: 'Este email já está em uso',
            });
          }
          
          // Se não conseguiu criar no Supabase, verifica se existe no banco local
          const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
          
          if (existingUser.length > 0) {
            return res.status(HTTP_STATUS.CONFLICT).json({
              type: ERROR_TYPES.DUPLICATED_ERROR,
              message: 'Este email já está em uso',
            });
          }
          
          // Se chegou aqui, é um erro do Supabase mas o usuário não existe no banco local
          console.log(`Falha ao criar no Supabase. Criando usuário ${email} apenas no banco local...`);
        } else {
          console.log(`Usuário ${email} criado com sucesso no Supabase via signUp`);
          supabaseUser = signUpData.user;
          supabaseData = signUpData;
        }
      } else {
        console.log(`Usuário ${email} criado com sucesso no Supabase via admin API`);
        supabaseUser = data.user;
        
        const { data: loginData } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        supabaseData = loginData;
      }
      
      // Hash da senha para armazenamento no banco local
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Verifica se o usuário já existe no banco local
      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
      
      if (existingUser.length > 0) {
        // Se o usuário já existe no banco local mas foi criado com sucesso no Supabase,
        if (supabaseUser) {
          await db.update(users)
            .set({
              name: name,
              active: true,
              lastLoginAt: new Date()
            })
            .where(eq(users.id, existingUser[0].id));
            
          // Define o usuário na sessão
          if (req.session) {
            req.session.user = {
              id: existingUser[0].id,
              email: existingUser[0].email,
              name: name,
              role: existingUser[0].role,
            };
            
            // Define a sessão do Supabase se disponível
            if (supabaseData && supabaseData.session) {
              try {
                await supabase.auth.setSession({
                  access_token: supabaseData.session.access_token,
                  refresh_token: supabaseData.session.refresh_token
                });
                console.log("Sessão do Supabase definida com sucesso após registro");
              } catch (sessionError) {
                console.error("Erro ao definir sessão do Supabase após registro:", sessionError);
              }
            }
            
            req.session.save((err) => {
              if (err) {
                console.error('Erro ao salvar sessão após registro:', err);
              }
              
              // Remove informações sensíveis
              const { password, ...userResponse } = existingUser[0];
              
              return res.status(HTTP_STATUS.CREATED).json(userResponse);
            });
          } else {
            // Remove informações sensíveis
            const { password, ...userResponse } = existingUser[0];
            
            return res.status(HTTP_STATUS.CREATED).json(userResponse);
          }
        } else {
          return res.status(HTTP_STATUS.CONFLICT).json({
            type: ERROR_TYPES.DUPLICATED_ERROR,
            message: 'Este email já está em uso',
          });
        }
      } else {
        // Salva o usuário no banco local
        const newUser = await db.insert(users).values({
          email,
          password: hashedPassword,
          name,
          role: 'user',
          active: true,
          language: 'pt-BR',
          createdAt: new Date(),
          lastLoginAt: new Date(),
        }).returning();
        
        // Define o usuário na sessão
        if (req.session) {
          req.session.user = {
            id: newUser[0].id,
            email: newUser[0].email,
            name: newUser[0].name,
            role: newUser[0].role,
          };
          
          // Define a sessão do Supabase se disponível
          if (supabaseData && supabaseData.session) {
            try {
              await supabase.auth.setSession({
                access_token: supabaseData.session.access_token,
                refresh_token: supabaseData.session.refresh_token
              });
              console.log("Sessão do Supabase definida com sucesso após registro");
            } catch (sessionError) {
              console.error("Erro ao definir sessão do Supabase após registro:", sessionError);
            }
          }
          
          req.session.save((err) => {
            if (err) {
              console.error('Erro ao salvar sessão após registro:', err);
            }
            
            // Remove informações sensíveis
            const { password, ...userResponse } = newUser[0];
            
            return res.status(HTTP_STATUS.CREATED).json(userResponse);
          });
        } else {
          // Remove informações sensíveis
          const { password, ...userResponse } = newUser[0];
          
          return res.status(HTTP_STATUS.CREATED).json(userResponse);
        }
      }
    } catch (error: any) {
      console.error('Exceção ao criar usuário no Supabase:', error?.message || error);
      return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
        type: ERROR_TYPES.SERVER_ERROR,
        message: 'Erro ao criar usuário',
        details: error?.message || 'Erro desconhecido',
      });
    }
  } catch (error) {
    console.error('Erro no registro:', error);
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      type: ERROR_TYPES.SERVER_ERROR,
      message: 'Erro ao criar usuário',
      details: (error as Error).message,
    });
  }
}

/**
 * Autentica um usuário
 */
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        type: ERROR_TYPES.VALIDATION_ERROR,
        message: 'Email e senha são obrigatórios',
      });
    }

    // Verificar se o Supabase está disponível
    if (!supabase) {
      console.error('Supabase não está disponível para autenticação');
      return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
        type: ERROR_TYPES.SERVER_ERROR,
        message: 'Serviço de autenticação indisponível',
      });
    }

    console.log(`Tentando autenticar usuário ${email} no Supabase...`);
    let supabaseData = null;
    let supabaseUser = null;
    
    try {
      const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (supabaseError) {
        console.error('Erro ao autenticar no Supabase:', {
          message: supabaseError.message,
          status: supabaseError.status,
          code: supabaseError.code
        });
        
        // Se o usuário não existe no Supabase, verifica se existe no banco local
        if (supabaseError.status === 400 || supabaseError.message.includes('Invalid login credentials')) {
          console.log(`Usuário ${email} não encontrado no Supabase. Verificando banco local...`);
          
          // Busca o usuário pelo email no banco local
          const userRecord = await db.select().from(users).where(eq(users.email, email)).limit(1);
          
          if (userRecord.length === 0) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
              type: ERROR_TYPES.AUTH_ERROR,
              message: 'Email ou senha inválidos',
            });
          }
          
          const user = userRecord[0];
          
          // Verifica se o usuário está ativo
          if (!user.active) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
              type: ERROR_TYPES.AUTH_ERROR,
              message: 'Usuário desativado',
            });
          }
          
          // Verifica a senha no banco local
          const isPasswordValid = await bcrypt.compare(password, user.password);
          
          if (!isPasswordValid) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
              type: ERROR_TYPES.AUTH_ERROR,
              message: 'Email ou senha inválidos',
            });
          }
          
          // Se o usuário existe no banco local mas não no Supabase, tenta criá-lo no Supabase
          console.log(`Usuário ${email} autenticado localmente. Criando no Supabase...`);
          try {
            const { data, error } = await supabase.auth.admin.createUser({
              email,
              password, 
              user_metadata: { name: user.name },
              email_confirm: true
            });
            
            if (error) {
              console.error('Erro ao criar usuário via admin API:', {
                message: error.message,
                status: error.status,
                code: error.code
              });
              
              const { data: signUpData, error: createError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                  data: {
                    name: user.name,
                  },
                },
              });

              if (createError) {
                console.error('Erro ao criar usuário no Supabase:', {
                  message: createError.message,
                  status: createError.status,
                  code: createError.code
                });
              } else {
                console.log(`Usuário ${email} criado com sucesso no Supabase via signUp`);
                supabaseUser = signUpData.user;
                
                const { data: loginData } = await supabase.auth.signInWithPassword({
                  email,
                  password,
                });
                supabaseData = loginData;
              }
            } else {
              console.log(`Usuário ${email} criado com sucesso no Supabase via admin API`);
              supabaseUser = data.user;
              
              const { data: loginData } = await supabase.auth.signInWithPassword({
                email,
                password,
              });
              supabaseData = loginData;
            }
            
            // Atualiza o último login no banco local
            await db.update(users)
              .set({ lastLoginAt: new Date() })
              .where(eq(users.id, user.id));
            
            // Define o usuário na sessão
            if (req.session) {
              req.session.user = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
              };
              
              // Define a sessão do Supabase se disponível
              if (supabaseData && supabaseData.session) {
                try {
                  await supabase.auth.setSession({
                    access_token: supabaseData.session.access_token,
                    refresh_token: supabaseData.session.refresh_token
                  });
                  console.log("Sessão do Supabase definida com sucesso após login");
                } catch (sessionError) {
                  console.error("Erro ao definir sessão do Supabase após login:", sessionError);
                }
              }
              
              req.session.save((err) => {
                if (err) {
                  console.error('Erro ao salvar sessão após login:', err);
                }
                
                // Remove informações sensíveis
                const { password, ...userResponse } = user;
                
                return res.status(HTTP_STATUS.OK).json(userResponse);
              });
            } else {
              // Remove informações sensíveis
              const { password, ...userResponse } = user;
              
              return res.status(HTTP_STATUS.OK).json(userResponse);
            }
          } catch (createError: any) {
            console.error('Exceção ao criar usuário no Supabase:', createError?.message || createError);
            
            // Atualiza o último login no banco local
            await db.update(users)
              .set({ lastLoginAt: new Date() })
              .where(eq(users.id, user.id));
            
            // Define o usuário na sessão
            if (req.session) {
              req.session.user = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
              };
              
              req.session.save((err) => {
                if (err) {
                  console.error('Erro ao salvar sessão após login:', err);
                }
                
                // Remove informações sensíveis
                const { password, ...userResponse } = user;
                
                return res.status(HTTP_STATUS.OK).json(userResponse);
              });
            } else {
              // Remove informações sensíveis
              const { password, ...userResponse } = user;
              
              return res.status(HTTP_STATUS.OK).json(userResponse);
            }
          }
        } else {
          return res.status(HTTP_STATUS.UNAUTHORIZED).json({
            type: ERROR_TYPES.AUTH_ERROR,
            message: 'Falha na autenticação: ' + supabaseError.message,
          });
        }
      } else {
        console.log(`Usuário ${email} autenticado com sucesso no Supabase`);
        supabaseData = data;
        supabaseUser = data.user;
        
        // Verifica se o usuário existe no banco local
        const userRecord = await db.select().from(users).where(eq(users.email, email)).limit(1);
        
        if (userRecord.length === 0) {
          // Usuário existe no Supabase mas não no banco local, cria no banco local
          console.log(`Usuário ${email} não encontrado no banco local. Criando...`);
          
          // Cria o usuário no banco local
          const hashedPassword = await bcrypt.hash(password, 10);
          const newUser = await db.insert(users).values({
            email,
            name: supabaseUser?.user_metadata?.name || email.split('@')[0],
            password: hashedPassword,
            role: 'user',
            active: true,
            createdAt: new Date(),
            lastLoginAt: new Date(),
          }).returning();
          
          const user = newUser[0];
          
          // Define o usuário na sessão
          if (req.session) {
            req.session.user = {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            };
            
            // Define a sessão do Supabase
            if (supabaseData && supabaseData.session) {
              try {
                await supabase.auth.setSession({
                  access_token: supabaseData.session.access_token,
                  refresh_token: supabaseData.session.refresh_token
                });
                console.log("Sessão do Supabase definida com sucesso após login");
              } catch (sessionError) {
                console.error("Erro ao definir sessão do Supabase após login:", sessionError);
              }
            }
            
            req.session.save((err) => {
              if (err) {
                console.error('Erro ao salvar sessão após login:', err);
              }
              
              // Remove informações sensíveis
              const { password, ...userResponse } = user;
              
              return res.status(HTTP_STATUS.OK).json(userResponse);
            });
          } else {
            // Remove informações sensíveis
            const { password, ...userResponse } = user;
            
            return res.status(HTTP_STATUS.OK).json(userResponse);
          }
        } else {
          // Usuário existe tanto no Supabase quanto no banco local
          const user = userRecord[0];
          
          // Atualiza o último login
          await db.update(users)
            .set({ lastLoginAt: new Date() })
            .where(eq(users.id, user.id));
          
          // Define o usuário na sessão
          if (req.session) {
            req.session.user = {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            };
            
            // Define a sessão do Supabase
            if (supabaseData && supabaseData.session) {
              try {
                await supabase.auth.setSession({
                  access_token: supabaseData.session.access_token,
                  refresh_token: supabaseData.session.refresh_token
                });
                console.log("Sessão do Supabase definida com sucesso após login");
              } catch (sessionError) {
                console.error("Erro ao definir sessão do Supabase após login:", sessionError);
              }
            }
            
            req.session.save((err) => {
              if (err) {
                console.error('Erro ao salvar sessão após login:', err);
              }
              
              // Remove informações sensíveis
              const { password, ...userResponse } = user;
              
              return res.status(HTTP_STATUS.OK).json(userResponse);
            });
          } else {
            // Remove informações sensíveis
            const { password, ...userResponse } = user;
            
            return res.status(HTTP_STATUS.OK).json(userResponse);
          }
        }
      }
    } catch (error: any) {
      console.error('Exceção ao autenticar no Supabase:', error?.message || error);
      return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
        type: ERROR_TYPES.SERVER_ERROR,
        message: 'Erro ao autenticar usuário',
        details: error?.message || 'Erro desconhecido',
      });
    }
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      type: ERROR_TYPES.SERVER_ERROR,
      message: 'Erro ao autenticar usuário',
      details: (error as Error).message,
    });
  }
}

/**
 * Realiza o logout do usuário
 */
export async function logout(req: Request, res: Response) {
  try {
    // Logout do Supabase (se disponível)
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.warn('Erro ao fazer logout no Supabase:', error);
      }
    }

    // Limpa a sessão
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Erro ao destruir a sessão:', err);
          return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            type: ERROR_TYPES.SERVER_ERROR,
            message: 'Erro ao fazer logout',
            details: err.message,
          });
        }
        res.clearCookie('connect.sid');
        return res.status(HTTP_STATUS.OK).json({ message: 'Logout realizado com sucesso' });
      });
    } else {
      return res.status(HTTP_STATUS.OK).json({ message: 'Logout realizado com sucesso' });
    }
  } catch (error) {
    console.error('Erro no logout:', error);
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      type: ERROR_TYPES.SERVER_ERROR,
      message: 'Erro ao fazer logout',
      details: (error as Error).message,
    });
  }
}

/**
 * Obtém os dados do usuário autenticado
 */
export async function getCurrentUser(req: Request, res: Response) {
  try {
    if (!req.session?.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        type: ERROR_TYPES.AUTH_ERROR,
        message: 'Usuário não autenticado',
      });
    }

    const userId = req.session.user.id;

    // Busca o usuário no banco local
    const userRecord = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (userRecord.length === 0) {
      // Limpa a sessão se o usuário não existir mais
      req.session.destroy((err) => {
        if (err) console.error('Erro ao destruir a sessão:', err);
      });

      return res.status(HTTP_STATUS.NOT_FOUND).json({
        type: ERROR_TYPES.NOT_FOUND_ERROR,
        message: 'Usuário não encontrado',
      });
    }

    const user = userRecord[0];

    // Remove informações sensíveis
    const { password, ...userResponse } = user;

    return res.status(HTTP_STATUS.OK).json(userResponse);
  } catch (error) {
    console.error('Erro ao buscar usuário atual:', error);
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      type: ERROR_TYPES.SERVER_ERROR,
      message: 'Erro ao buscar usuário',
      details: (error as Error).message,
    });
  }
}

/**
 * Envia um email de recuperação de senha
 */
export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;

    // Verifica se o usuário existe
    const userRecord = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (userRecord.length === 0) {
      // Não informamos ao usuário que o email não existe por motivos de segurança
      return res.status(HTTP_STATUS.OK).json({
        message: 'Se o email existir, você receberá as instruções para redefinir sua senha',
      });
    }

    // Envia o email de recuperação pelo Supabase (se disponível)
    if (supabase) {
      try {
        const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/auth/reset-password`,
        });

        if (supabaseError) {
          console.warn('Erro ao enviar email de recuperação:', supabaseError);
          // Não informamos ao usuário que houve um erro por motivos de segurança
        }
      } catch (error) {
        console.warn('Exceção ao enviar email de recuperação:', error);
        // Continuamos mesmo com erro no Supabase
      }
    } else {
      console.warn('Supabase não disponível para envio de email de recuperação');
    }

    return res.status(HTTP_STATUS.OK).json({
      message: 'Email de recuperação enviado com sucesso',
    });
  } catch (error) {
    console.error('Erro na recuperação de senha:', error);
    // Não informamos ao usuário que houve um erro por motivos de segurança
    return res.status(HTTP_STATUS.OK).json({
      message: 'Se o email existir, você receberá as instruções para redefinir sua senha',
    });
  }
}

/**
 * Redefine a senha do usuário
 */
export async function resetPassword(req: Request, res: Response) {
  try {
    const { password, token } = req.body;

    if (!token) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        type: ERROR_TYPES.VALIDATION_ERROR,
        message: 'Token não fornecido',
      });
    }

    // Redefine a senha no Supabase
    const { data: supabaseUser, error: supabaseError } = await supabase.auth.updateUser({
      password,
    });

    if (supabaseError) {
      console.error('Erro ao redefinir senha no Supabase:', supabaseError);
      return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
        type: ERROR_TYPES.SERVER_ERROR,
        message: 'Erro ao redefinir senha',
        details: supabaseError.message,
      });
    }

    if (!supabaseUser.user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        type: ERROR_TYPES.NOT_FOUND_ERROR,
        message: 'Usuário não encontrado',
      });
    }

    // Busca o usuário pelo email no banco local
    const userRecord = await db.select().from(users).where(eq(users.email, supabaseUser.user.email!)).limit(1);

    if (userRecord.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        type: ERROR_TYPES.NOT_FOUND_ERROR,
        message: 'Usuário não encontrado',
      });
    }

    // Hash da nova senha para armazenamento no banco local
    const hashedPassword = await bcrypt.hash(password, 10);

    // Atualiza a senha no banco local
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userRecord[0].id));

    return res.status(HTTP_STATUS.OK).json({
      message: 'Senha redefinida com sucesso',
    });
  } catch (error) {
    console.error('Erro na redefinição de senha:', error);
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      type: ERROR_TYPES.SERVER_ERROR,
      message: 'Erro ao redefinir senha',
      details: (error as Error).message,
    });
  }
}

/**
 * Middleware para verificar se o usuário está autenticado
 */
export function isAuthenticated(req: Request, res: Response, next: Function) {
  if (!req.session?.user) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      type: ERROR_TYPES.AUTH_ERROR,
      message: 'Usuário não autenticado',
    });
  }
  next();
}

/**
 * Middleware para verificar se o usuário é admin
 */
export function isAdmin(req: Request, res: Response, next: Function) {
  if (!req.session?.user) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      type: ERROR_TYPES.AUTH_ERROR,
      message: 'Usuário não autenticado',
    });
  }

  if (req.session.user.role !== 'admin') {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      type: ERROR_TYPES.PERMISSION_ERROR,
      message: 'Acesso não autorizado',
    });
  }

  next();
}
