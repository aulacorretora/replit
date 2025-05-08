import { Express, Request, Response, NextFunction } from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "./db";
import { users, User } from "@shared/schema";
import { eq } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import bcrypt from "bcryptjs";

declare module 'express-session' {
  interface Session {
    passport?: {
      user?: number;
    };
    user?: Omit<User, 'password'>;
  }
}

// Extender a interface Express.User para usar nosso tipo User
declare global {
  namespace Express {
    interface User extends Omit<import('@shared/schema').User, 'password'> {}
  }
}

// Promisify a função scrypt para usar async/await
const scryptAsync = promisify(scrypt);

// Função para criptografar senhas
async function hashPassword(password: string): Promise<string> {
  // Usamos bcrypt para compatibilidade com senhas existentes
  return bcrypt.hashSync(password, 10);
}

// Função para comparar senhas
async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  if (!stored) {
    console.error("Senha armazenada é undefined ou vazia");
    return false;
  }
  
  console.log(`Comparando senha fornecida. Formato armazenado: ${stored.substring(0, 10)}...`);
  
  try {
    // Verificar se a senha está no formato bcrypt (começa com $2a$ ou $2b$)
    if (stored.startsWith("$2")) {
      console.log("Detectado formato bcrypt, usando bcrypt.compareSync");
      const result = bcrypt.compareSync(supplied, stored);
      console.log(`Resultado da comparação bcrypt: ${result}`);
      return result;
    }
    
    // Verificar se está no formato legacy (hash.salt)
    if (stored.includes(".")) {
      console.log("Detectado formato legacy hash.salt, usando scrypt");
      const [hashed, salt] = stored.split(".");
      
      if (!hashed || !salt) {
        console.error("Hash ou salt inválidos na senha armazenada");
        return false;
      }
      
      const hashedBuf = Buffer.from(hashed, "hex");
      const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
      const result = timingSafeEqual(hashedBuf, suppliedBuf);
      console.log(`Resultado da comparação scrypt: ${result}`);
      return result;
    }
    
    console.error("Formato de senha desconhecido:", stored);
    return false;
  } catch (error) {
    console.error("Erro ao comparar senhas:", error);
    return false;
  }
}

// Configurar a autenticação
export function setupAuth(app: Express) {
  console.log('Configurando autenticação e sessão...');
  
  // Usar armazenamento em memória para sessões para evitar problemas de conexão
  let sessionStore;
  
  console.log('Usando MemoryStore para armazenamento de sessões');
  
  // Em desenvolvimento, usar MemoryStore para simplificar
  const MemoryStore = session.MemoryStore;
  sessionStore = new MemoryStore();
  console.log('Usando MemoryStore para armazenamento de sessões');

  // Definir uma SESSION_SECRET constante para garantir persistência
  // Importante: Esta mesma chave secreta deve ser usada no ambiente de produção
  const SESSION_SECRET = "zapban-stable-prod-key-2025-05-07";
  
  // Configurar as opções de sessão
  const sessionOptions: session.SessionOptions = {
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true, // Manter true para compatibilidade com login
    rolling: true, // Renovar cookie a cada requisição
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
      sameSite: 'lax', // Adiciona compatibilidade melhor com navegadores
      httpOnly: true,
      path: '/'
    },
    store: sessionStore,
    name: 'connect.sid' // Usando o nome padrão para melhor compatibilidade
  };

  // Se em produção, confiar em proxies
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
    // Garantir que cookies sejam enviados apenas por HTTPS
    if (sessionOptions.cookie) {
      sessionOptions.cookie.secure = true;
    }
  }

  // Inicializar middleware de sessão - precisa ser feito ANTES do passport
  app.use(session(sessionOptions));
  
  // Inicializar Passport - com ordem correta
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Verificar se passport foi inicializado corretamente
  app.use((req, res, next) => {
    if (!req.session) {
      console.error('Erro crítico: req.session não está disponível para passport');
    } else if (!req.session.passport) {
      // Inicializar passport na sessão se não existir
      req.session.passport = {};
      console.log('Inicializando req.session.passport manualmente');
    }
    next();
  });
  
  // Log para confirmar a inicialização
  console.log('Autenticação configurada com sucesso');

  // Configurar a estratégia local (username/password)
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          console.log(`Tentativa de login: ${email}`);
          
          // Importar o módulo de autenticação mock
          const { findUserByEmail, verifyPassword, updateLastLogin } = await import('./mock-auth');
          
          // Buscar o usuário pelo email usando o mock
          const user = await findUserByEmail(email);
          
          if (!user) {
            console.log(`Usuário não encontrado: ${email}`);
            return done(null, false, { message: "Email ou senha incorretos" });
          }
          
          console.log(`Usuário encontrado: ${user.email} (ID: ${user.id})`);
          
          // Verificar senha
          const isPasswordValid = await verifyPassword(password, user.password);
          console.log(`Validação de senha: ${isPasswordValid ? 'sucesso' : 'falha'}`);
          
          if (!isPasswordValid) {
            return done(null, false, { message: "Email ou senha incorretos" });
          }
          
          // Atualizar a data do último login
          try {
            await updateLastLogin(user.id);
          } catch (updateErr) {
            console.warn(`Erro ao atualizar data de último login: ${updateErr}`);
          }
          
          console.log(`Login bem-sucedido: ${user.email} (ID: ${user.id})`);
          
          // Login bem-sucedido
          // Remover a senha antes de salvar na sessão
          const { password: _password, ...userWithoutPassword } = user;
          return done(null, userWithoutPassword as any);
        } catch (err) {
          console.error('Erro na autenticação:', err);
          return done(err);
        }
      }
    )
  );

  // Serializar usuário para a sessão
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserializar usuário da sessão
  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`Deserializando usuário com ID: ${id}`);
      // Importar o módulo de autenticação mock
      const { findUserById } = await import('./mock-auth');
      
      // Buscar o usuário pelo ID usando o mock
      const user = await findUserById(id);
      
      if (!user) {
        console.log(`Usuário não encontrado com ID: ${id}`);
        return done(null, false);
      }
      
      console.log(`Usuário deserializado: ${user.email} (ID: ${user.id})`);
      
      // Remover a senha antes de retornar
      const { password: _password, ...userWithoutPassword } = user;
      done(null, userWithoutPassword as any);
    } catch (err) {
      console.error('Erro ao deserializar usuário:', err);
      done(err);
    }
  });

  // Endpoint de registro
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      console.log(`Tentativa de registro: ${req.body.email}`);
      
      // Importar o módulo de autenticação mock
      const { findUserByEmail, createUser } = await import('./mock-auth');
      
      // Verificar se o usuário já existe
      const existingUser = await findUserByEmail(req.body.email);

      if (existingUser) {
        console.log(`Email já registrado: ${req.body.email}`);
        return res.status(400).json({ message: "Este email já está registrado" });
      }

      // Criar o novo usuário
      const hashedPassword = await hashPassword(req.body.password);
      const newUser = await createUser({
        email: req.body.email,
        name: req.body.name,
        password: hashedPassword,
        role: "user", // Por padrão, todos os novos usuários são "user"
        active: true,
        language: req.body.language || "pt-BR",
        createdAt: new Date(),
      });

      // Autenticar o usuário após o registro
      // Remover a senha antes de enviar para req.login
      const { password: _password, ...userWithoutPassword } = newUser;
      
      req.login(userWithoutPassword as Express.User, (err) => {
        if (err) return next(err);
        return res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Erro no registro:", error);
      res.status(500).json({ message: "Falha no registro. Tente novamente mais tarde." });
    }
  });

  // Endpoint de login - usar o caminho correto que o frontend espera
  app.post("/api/auth/login", (req, res, next) => {
    console.log("Tentativa de login - dados recebidos:", { email: req.body.email, password: req.body.password ? '[SENHA OCULTA]' : 'não fornecida' });
    
    if (!req.body.email || !req.body.password) {
      return res.status(400).json({ message: "Email e senha são obrigatórios" });
    }
    
    passport.authenticate("local", (err: any, user: User, info: any) => {
      if (err) {
        console.error("Erro durante a autenticação:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Falha na autenticação:", info?.message || "Credenciais inválidas");
        return res.status(401).json({ message: info?.message || "Email ou senha incorretos" });
      }
      
      console.log(`Autenticação bem-sucedida para: ${user.email} (ID: ${user.id}), chamando req.login`);
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Erro ao salvar sessão de login:", loginErr);
          return next(loginErr);
        }
        
        console.log(`Sessão de usuário salva com sucesso. ID da sessão: ${req.sessionID}`);
        
        // Verificar se a sessão está funcionando corretamente
        if (!req.user) {
          console.error("ALERTA: Usuário não foi salvo na sessão após req.login");
        } else {
          console.log(`Confirmando usuário na sessão: ${req.user.id}, ${req.user.email}`);
        }
        
        // Retirar a senha antes de enviar a resposta
        const { password, ...userWithoutPassword } = user;
        
        // Garantir que a sessão está sendo salva corretamente
        if (req.session) {
          if (!req.session.passport || !req.session.passport.user) {
            console.warn("ALERTA: req.session.passport.user não está definido após login");
            
            // Forçar a sessão a ser salva explicitamente
            req.session.passport = req.session.passport || {};
            req.session.passport.user = user.id;
            
            // Adicionar dados do usuário para reforçar
            req.session.user = userWithoutPassword;
            
            console.log("Dados de sessão forçados manualmente:", 
              { sessionID: req.sessionID, passportUser: req.session.passport.user });
            
            // Forçar salvamento da sessão antes de responder
            req.session.save((saveErr) => {
              if (saveErr) {
                console.error("Erro ao salvar sessão manualmente:", saveErr);
              } else {
                console.log("Sessão salva manualmente com sucesso");
              }
              
              // Responder ao cliente
              return res.json(userWithoutPassword);
            });
          } else {
            console.log("Dados do usuário confirmados na sessão passport:", req.session.passport.user);
            // Responder ao cliente diretamente
            return res.json(userWithoutPassword);
          }
        } else {
          console.error("ERRO CRÍTICO: req.session não está disponível");
          // Mesmo sem sessão, devolvemos o usuário para permitir a navegação local
          return res.json(userWithoutPassword);
        }
      });
    })(req, res, next);
  });

  // Endpoint de logout
  app.post("/api/auth/logout", (req, res, next) => {
    console.log("Tentativa de logout. Session ID:", req.sessionID);
    
    if (!req.isAuthenticated()) {
      console.log("Logout chamado para usuário não autenticado");
    } else {
      console.log(`Logout para usuário autenticado: ${req.user.id}, ${req.user.email}`);
    }
    
    req.logout((err) => {
      if (err) {
        console.error("Erro durante logout:", err);
        return next(err);
      }
      
      console.log("Usuário deslogado com sucesso, destruindo sessão...");
      
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error("Erro ao destruir sessão:", sessionErr);
          return next(sessionErr);
        }
        
        console.log("Sessão destruída com sucesso");
        
        // Limpar o cookie de sessão
        // Importante: O nome do cookie deve corresponder ao definido nas opções de sessão
        res.clearCookie("connect.sid", {
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax"
        });
        
        // Limpar também o cookie com nome antigo por compatibilidade
        res.clearCookie("zapban.sid", {
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax"
        });
        
        console.log("Cookies de sessão limpos");
        res.status(200).json({ message: "Logout realizado com sucesso" });
      });
    });
  });

  // Endpoint para recuperar informações do usuário atual
  app.get("/api/auth/user", (req, res) => {
    console.log(`GET /api/auth/user - Session ID: ${req.sessionID}`);
    console.log(`Session data: ${JSON.stringify(req.session)} (req.session)`);
    console.log(`Passport initialized: ${!!req.session?.passport}`);
    console.log(`Authenticated: ${req.isAuthenticated()}`);
    
    // Verificação completa do estado da sessão para diagnóstico
    if (req.session) {
      if (req.session.passport && req.session.passport.user) {
        console.log(`Passport user ID na sessão: ${req.session.passport.user}`);
      } else {
        console.log("Passport user não encontrado na sessão");
      }
      
      if (req.session.user) {
        console.log(`Dados de usuário armazenados na sessão: ${req.session.user.id}, ${req.session.user.email}`);
      }
    } else {
      console.log("Sessão não inicializada");
    }
    
    // Verificar primeiro se temos dados do usuário direto na sessão
    if (req.session && req.session.user) {
      console.log("Retornando usuário encontrado na sessão:", req.session.user.id, req.session.user.email);
      return res.json(req.session.user);
    }
    
    // Se não, verificar a autenticação do Passport
    if (req.isAuthenticated() && req.user) {
      console.log("Retornando usuário autenticado via passport:", req.user.id, req.user.email);
      
      // Verificar se a sessão existe e atualizar dados do usuário nela para futuras requisições
      if (req.session && !req.session.user) {
        const { password, ...userWithoutPassword } = req.user as (User & { password: string });
        req.session.user = userWithoutPassword;
        console.log("Atualizando dados do usuário na sessão para futuras requisições");
      }
      
      // Retirar a senha antes de enviar a resposta
      const { password, ...userWithoutPassword } = req.user as (User & { password: string });
      return res.json(userWithoutPassword);
    }
    
    // Tentativa final: se temos um ID de usuário na sessão do Passport mas não temos req.user
    if (req.session?.passport?.user && !req.user) {
      console.log(`Detectada inconsistência: ID ${req.session.passport.user} na sessão mas req.user ausente`);
      
      // Importar o módulo de autenticação mock e buscar o usuário
      import('./mock-auth').then(async ({ findUserById }) => {
        try {
          const userId = req.session?.passport?.user;
          if (!userId) {
            console.log("ID de usuário não encontrado na sessão");
            return res.status(401).json({ message: "Não autorizado" });
          }
          
          const user = await findUserById(userId);
          
          if (user) {
            console.log(`Usuário recuperado manualmente do mock: ${user.id}, ${user.email}`);
            
            // Atualizar a sessão
            const { password: _password, ...userWithoutPassword } = user;
            if (req.session) {
              req.session.user = userWithoutPassword;
            }
            
            return res.json(userWithoutPassword);
          } else {
            console.log("Usuário não encontrado no mock");
            return res.status(401).json({ message: "Não autorizado" });
          }
        } catch (error) {
          console.error("Erro ao buscar usuário pelo ID na sessão:", error);
          return res.status(401).json({ message: "Não autorizado" });
        }
      });
      
      return; // importante para evitar que a resposta seja enviada duas vezes
    }
    
    return res.status(401).json({ message: "Não autorizado" });
  });

  // Endpoint para atualizar o perfil do usuário
  app.put("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    try {
      // Se tentar alterar a senha, verificar a senha atual
      if (req.body.newPassword) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, req.user.id));

        const isPasswordValid = await comparePasswords(
          req.body.currentPassword,
          user.password
        );

        if (!isPasswordValid) {
          return res.status(400).json({ message: "Senha atual incorreta" });
        }

        // Atualizar o usuário com a nova senha
        const [updatedUser] = await db
          .update(users)
          .set({
            name: req.body.name || req.user.name,
            language: req.body.language || req.user.language,
            password: await hashPassword(req.body.newPassword),
          })
          .where(eq(users.id, req.user.id))
          .returning();

        // Retirar a senha antes de enviar a resposta
        const { password, ...userWithoutPassword } = updatedUser;
        return res.json(userWithoutPassword);
      }

      // Atualização sem alterar senha
      const [updatedUser] = await db
        .update(users)
        .set({
          name: req.body.name || req.user.name,
          language: req.body.language || req.user.language,
        })
        .where(eq(users.id, req.user.id))
        .returning();

      // Retirar a senha antes de enviar a resposta
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      res.status(500).json({ message: "Falha ao atualizar perfil" });
    }
  });

  // Middleware para verificar autenticação
  app.use("/api/*", (req, res, next) => {
    // Ignorar rotas públicas
    const publicPaths = [
      "/api/auth/login",
      "/api/auth/register",
      "/api/auth/logout",
      "/api/auth/forgot-password",
      "/api/auth/reset-password",
    ];
    
    if (publicPaths.includes(req.path) || req.isAuthenticated()) {
      return next();
    }
    
    res.status(401).json({ message: "Não autorizado" });
  });

  // Endpoint para recuperação de senha (envio de email)
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      // Verificar se o usuário existe
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      
      if (!user) {
        // Por razões de segurança, não revelar se o email existe ou não
        return res.status(200).json({
          message: "Se o email estiver registrado, você receberá instruções para recuperar sua senha."
        });
      }
      
      // Aqui implementaria o envio de email com token de recuperação
      // Para este projeto, podemos apenas retornar 200 como se tivesse funcionado
      
      res.status(200).json({
        message: "Se o email estiver registrado, você receberá instruções para recuperar sua senha."
      });
    } catch (error) {
      console.error("Erro na recuperação de senha:", error);
      res.status(500).json({ message: "Erro ao processar a solicitação" });
    }
  });

  // Endpoint para redefinir a senha
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      
      // Este endpoint seria implementado com um sistema de tokens
      // Para este projeto, podemos retornar um erro informando que é um mock
      
      res.status(501).json({
        message: "A funcionalidade de redefinição de senha ainda não está implementada."
      });
    } catch (error) {
      console.error("Erro na redefinição de senha:", error);
      res.status(500).json({ message: "Erro ao processar a solicitação" });
    }
  });
}
