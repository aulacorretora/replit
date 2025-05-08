import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { users } from '@shared/schema';
import { createClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import { HTTP_STATUS, ERROR_TYPES } from '../lib/constants';

// Cria client do Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://gqjfbdqgcjvdnbvcupcf.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

// Verificação ampla para permitir o sistema funcionar mesmo sem Supabase configurado
let supabase: any = null;

try {
  if (supabaseKey) {
    console.log(`Inicializando Supabase client com URL: ${supabaseUrl}`);
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client inicializado com sucesso');
  } else {
    console.error('SUPABASE_SERVICE_KEY não está definido. Funcionalidades do Supabase estarão desabilitadas.');
  }
} catch (error) {
  console.error('Erro ao inicializar cliente Supabase:', error);
}

/**
 * Registra um novo usuário no sistema
 */
export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body;

    // Verifica se o usuário já existe
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (existingUser.length > 0) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        type: ERROR_TYPES.DUPLICATED_ERROR,
        message: 'Este email já está em uso',
      });
    }

    // Cria o usuário no Supabase (se disponível)
    if (supabase) {
      try {
        console.log(`Tentando criar usuário ${email} no Supabase...`);
        const { data: supabaseUser, error: supabaseError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
            },
          },
        });

        if (supabaseError) {
          console.error('Erro ao criar usuário no Supabase:', {
            message: supabaseError.message,
            status: supabaseError.status,
            code: supabaseError.code,
            details: supabaseError.details
          });
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
                code: error.code,
                details: error.details
              });
            } else {
              console.log(`Usuário ${email} criado com sucesso via admin API`);
            }
          } catch (adminError: any) {
            console.error('Exceção ao criar usuário via admin API:', adminError?.message || adminError);
          }
        } else {
          console.log(`Usuário ${email} criado com sucesso no Supabase`);
        }
      } catch (error: any) {
        console.error('Exceção ao criar usuário no Supabase:', error?.message || error);
        // Continuamos mesmo com erro no Supabase
      }
    }

    // Hash da senha para armazenamento no banco local
    const hashedPassword = await bcrypt.hash(password, 10);

    // Salva o usuário no banco local
    const newUser = await db.insert(users).values({
      email,
      password: hashedPassword,
      name,
      role: 'user',
      active: true,
      language: 'pt-BR',
      createdAt: new Date(),
    }).returning();

    // Define o usuário na sessão
    if (req.session) {
      req.session.user = {
        id: newUser[0].id,
        email: newUser[0].email,
        name: newUser[0].name,
        role: newUser[0].role,
      };
      
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

    // Busca o usuário no banco local
    const userRecord = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (userRecord.length === 0) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        type: ERROR_TYPES.AUTH_ERROR,
        message: 'Credenciais inválidas',
      });
    }

    const user = userRecord[0];

    // Verifica a senha
    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        type: ERROR_TYPES.AUTH_ERROR,
        message: 'Credenciais inválidas',
      });
    }

    // Autentica no Supabase (se disponível)
    let supabaseData = null;
    if (supabase) {
      try {
        console.log(`Tentando autenticar usuário ${email} no Supabase...`);
        const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        supabaseData = data;

        if (supabaseError) {
          console.error('Erro ao autenticar no Supabase:', {
            message: supabaseError.message,
            status: supabaseError.status,
            code: supabaseError.code,
            details: supabaseError.details
          });
          
          // Se o usuário existe no banco local mas não no Supabase, tenta criá-lo no Supabase
          if (supabaseError.status === 400) {
            console.log(`Usuário ${email} não encontrado no Supabase. Tentando criar...`);
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
                  code: error.code,
                  details: error.details
                });
                const { data: supabaseUser, error: createError } = await supabase.auth.signUp({
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
                    code: createError.code,
                    details: createError.details
                  });
                } else {
                  console.log(`Usuário ${email} criado com sucesso no Supabase`);
                  await supabase.auth.signInWithPassword({
                    email,
                    password,
                  });
                }
              } else {
                console.log(`Usuário ${email} criado com sucesso via admin API`);
                await supabase.auth.signInWithPassword({
                  email,
                  password,
                });
              }
            } catch (createError: any) {
              console.error('Exceção ao criar usuário no Supabase:', createError?.message || createError);
            }
          }
        } else {
          console.log(`Usuário ${email} autenticado com sucesso no Supabase`);
        }
      } catch (error: any) {
        console.error('Exceção ao autenticar no Supabase:', error?.message || error);
        // Continuamos mesmo com erro no Supabase
      }
    }

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
      
      // Define a sessão do Supabase se disponível
      if (supabase && supabaseData && supabaseData.session) {
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
