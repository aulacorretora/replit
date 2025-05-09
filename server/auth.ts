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
import { supabase } from "./supabase"; // Importando o cliente Supabase
import bcrypt from "bcryptjs";

// Interface customizada para usuários
interface AppUser {
  id: number;
  email: string;
  name: string;
  password: string;
  role: string;
  active: boolean;
  language: string;
  createdAt: Date;
  lastLoginAt: Date | null;
}

// Estender a interface Express.User para usar nosso tipo customizado
declare global {
  namespace Express {
    interface User extends AppUser {}
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
  
  // Usar armazenamento em memória para sessões durante o desenvolvimento
  // e PostgreSQL em produção para persistência
  let sessionStore;
  
  // Devido às restrições de IP do Supabase, usamos MemoryStore em todos os ambientes
  // até conseguir configurar corretamente o acesso PostgreSQL direto
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
          
          // Buscar o usuário pelo email usando Supabase
          const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .limit(1);
          
          if (error) {
            console.error('Erro ao buscar usuário:', error);
            return done(error);
          }
          
          const user = users && users.length > 0 ? users[0] : null;
          
          if (!user) {
            console.log(`Usuário não encontrado: ${email}`);
            return done(null, false, { message: "Email ou senha incorretos" });
          }
          
          console.log(`Usuário encontrado: ${user.email} (ID: ${user.id})`);
          
          // Verificar senha
          const isPasswordValid = await comparePasswords(password, user.password);
          console.log(`Validação de senha: ${isPasswordValid ? 'sucesso' : 'falha'}`);
          
          if (!isPasswordValid) {
            return done(null, false, { message: "Email ou senha incorretos" });
          }
          
          // Atualizar a data do último login
          const { error: updateError } = await supabase
            .from('users')
            .update({ last_login_at: new Date() })
            .eq('id', user.id);
            
          if (updateError) {
            console.warn('Erro ao atualizar data de login:', updateError);
          }
          
          console.log(`Login bem-sucedido: ${user.email} (ID: ${user.id})`);
          
          // Login bem-sucedido
          return done(null, user);
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
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .limit(1);
      
      if (error) {
        console.error('Erro ao buscar usuário para deserialização:', error);
        return done(error);
      }
      
      const user = users && users.length > 0 ? users[0] : null;
      
      if (!user) {
        return done(null, false);
      }
      
      done(null, user);
    } catch (err) {
      console.error('Erro ao deserializar usuário:', err);
      done(err);
    }
  });

  // Endpoint de registro
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      console.log("Tentando registrar novo usuário:", { email: req.body.email, name: req.body.name });
      
      // Verificar se o usuário já existe
      const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('*')
        .eq('email', req.body.email)
        .limit(1);
      
      if (checkError) {
        console.error("Erro ao verificar usuário existente:", checkError);
        return res.status(500).json({ message: "Erro ao verificar email existente" });
      }
      
      if (existingUsers && existingUsers.length > 0) {
        console.log("Email já registrado:", req.body.email);
        return res.status(400).json({ message: "Este email já está registrado" });
      }
      
      // Criar o novo usuário
      const hashedPassword = await hashPassword(req.body.password);
      const now = new Date();
      
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          email: req.body.email,
          name: req.body.name,
          password: hashedPassword,
          role: "user", // Por padrão, todos os novos usuários são "user"
          active: true,
          language: req.body.language || "pt-BR",
          created_at: now.toISOString(),
        })
        .select()
        .single();
      
      if (insertError) {
        console.error("Erro ao criar usuário:", insertError);
        return res.status(500).json({ message: "Falha ao criar novo usuário" });
      }
      
      console.log("Usuário registrado com sucesso:", { id: newUser.id, email: newUser.email });
      
      // Mapear campos snake_case para camelCase para compatibilidade
      const userForLogin = {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        password: newUser.password,
        role: newUser.role,
        active: newUser.active,
        language: newUser.language,
        createdAt: new Date(newUser.created_at),
        lastLoginAt: newUser.last_login_at ? new Date(newUser.last_login_at) : null
      };
      
      // Autenticar o usuário após o registro
      req.login(userForLogin, (err) => {
        if (err) {
          console.error("Erro ao fazer login após registro:", err);
          return next(err);
        }
        
        // Retirar a senha antes de enviar a resposta
        const { password, ...userWithoutPassword } = userForLogin;
        console.log("Login após registro realizado com sucesso");
        return res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Erro não tratado no registro:", error);
      res.status(500).json({ message: "Falha no registro. Tente novamente mais tarde." });
    }
  });

  // Endpoint de login - usar o caminho correto que o frontend espera
  app.post("/api/auth/login", (req, res, next) => {
    console.log("Tentativa de login - dados recebidos:", { email: req.body.email, password: req.body.password ? '[SENHA OCULTA]' : 'não fornecida' });
    
    if (!req.body.email || !req.body.password) {
      return res.status(400).json({ message: "Email e senha são obrigatórios" });
    }
    
    passport.authenticate("local", (err, user, info) => {
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
        const { password, ...userWithoutPassword } = req.user;
        req.session.user = userWithoutPassword;
        console.log("Atualizando dados do usuário na sessão para futuras requisições");
      }
      
      // Retirar a senha antes de enviar a resposta
      const { password, ...userWithoutPassword } = req.user;
      return res.json(userWithoutPassword);
    }
    
    // Tentativa final: se temos um ID de usuário na sessão do Passport mas não temos req.user
    if (req.session?.passport?.user && !req.user) {
      console.log(`Detectada inconsistência: ID ${req.session.passport.user} na sessão mas req.user ausente`);
      
      // Buscar o usuário pelo ID no banco de dados usando Supabase
      supabase
        .from('users')
        .select('*')
        .eq('id', req.session.passport.user)
        .limit(1)
        .then(({ data: users, error }) => {
          if (error) {
            console.error("Erro ao buscar usuário pelo ID na sessão:", error);
            return res.status(401).json({ message: "Não autorizado" });
          }
          
          if (users && users.length > 0) {
            const user = users[0];
            console.log(`Usuário recuperado manualmente do banco: ${user.id}, ${user.email}`);
            
            // Converter para formato camelCase para frontend
            const formattedUser = {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              active: user.active,
              language: user.language,
              createdAt: new Date(user.created_at),
              lastLoginAt: user.last_login_at ? new Date(user.last_login_at) : null
            };
            
            // Atualizar a sessão
            if (req.session) {
              req.session.user = formattedUser;
            }
            
            return res.json(formattedUser);
          } else {
            console.log("Usuário não encontrado no banco");
            return res.status(401).json({ message: "Não autorizado" });
          }
        })
        .catch(error => {
          console.error("Erro não tratado ao buscar usuário pelo ID na sessão:", error);
          return res.status(401).json({ message: "Não autorizado" });
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
      console.log("Tentando atualizar perfil para usuário:", req.user.id);
      
      // Se tentar alterar a senha, verificar a senha atual
      if (req.body.newPassword) {
        // Buscar usuário atual
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', req.user.id)
          .single();
        
        if (userError) {
          console.error("Erro ao buscar usuário para verificação de senha:", userError);
          return res.status(500).json({ message: "Erro ao verificar usuário" });
        }
        
        const isPasswordValid = await comparePasswords(
          req.body.currentPassword,
          userData.password
        );

        if (!isPasswordValid) {
          return res.status(400).json({ message: "Senha atual incorreta" });
        }
        
        const hashedNewPassword = await hashPassword(req.body.newPassword);
        
        // Atualizar usuário com nova senha
        const { data: updatedData, error: updateError } = await supabase
          .from('users')
          .update({
            name: req.body.name || req.user.name,
            language: req.body.language || req.user.language,
            password: hashedNewPassword
          })
          .eq('id', req.user.id)
          .select()
          .single();
        
        if (updateError) {
          console.error("Erro ao atualizar usuário com nova senha:", updateError);
          return res.status(500).json({ message: "Erro ao atualizar senha" });
        }
        
        // Formatando usuário para retornar ao frontend
        const formattedUser = {
          id: updatedData.id,
          email: updatedData.email,
          name: updatedData.name,
          role: updatedData.role,
          active: updatedData.active,
          language: updatedData.language,
          createdAt: new Date(updatedData.created_at),
          lastLoginAt: updatedData.last_login_at ? new Date(updatedData.last_login_at) : null
        };
        
        console.log("Senha atualizada com sucesso para usuário:", req.user.id);
        return res.json(formattedUser);
      }

      // Atualização sem alterar senha
      const { data: updatedData, error: updateError } = await supabase
        .from('users')
        .update({
          name: req.body.name || req.user.name,
          language: req.body.language || req.user.language
        })
        .eq('id', req.user.id)
        .select()
        .single();
      
      if (updateError) {
        console.error("Erro ao atualizar perfil do usuário:", updateError);
        return res.status(500).json({ message: "Erro ao atualizar perfil" });
      }
      
      // Formatando usuário para retornar ao frontend
      const formattedUser = {
        id: updatedData.id,
        email: updatedData.email,
        name: updatedData.name,
        role: updatedData.role,
        active: updatedData.active,
        language: updatedData.language,
        createdAt: new Date(updatedData.created_at),
        lastLoginAt: updatedData.last_login_at ? new Date(updatedData.last_login_at) : null
      };
      
      console.log("Perfil atualizado com sucesso para usuário:", req.user.id);
      res.json(formattedUser);
    } catch (error) {
      console.error("Erro não tratado ao atualizar perfil:", error);
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
      console.log("Solicitação de recuperação de senha para:", email);
      
      // Verificar se o usuário existe usando Supabase
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .limit(1);
      
      if (error) {
        console.error("Erro ao verificar usuário para recuperação de senha:", error);
        return res.status(500).json({ message: "Ocorreu um erro ao processar sua solicitação" });
      }
      
      // Por razões de segurança, não revelar se o email existe ou não
      if (!users || users.length === 0) {
        console.log("Email não encontrado para recuperação de senha:", email);
        return res.status(200).json({
          message: "Se o email estiver registrado, você receberá instruções para recuperar sua senha."
        });
      }
      
      // Aqui implementaria o envio de email com token de recuperação
      // Para este projeto, registramos no log e retornamos sucesso como se tivesse funcionado
      console.log("Email de recuperação seria enviado para:", email);
      
      res.status(200).json({
        message: "Se o email estiver registrado, você receberá instruções para recuperar sua senha."
      });
    } catch (error) {
      console.error("Erro não tratado na recuperação de senha:", error);
      res.status(500).json({ message: "Erro ao processar a solicitação" });
    }
  });

  // Endpoint para redefinir a senha
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password, email } = req.body;
      
      if (!token || !password || !email) {
        return res.status(400).json({ 
          message: "Token, senha e email são obrigatórios" 
        });
      }
      
      console.log("Tentativa de redefinição de senha para:", email);
      
      // Verificar se o token é válido (simulado)
      // Em uma implementação real, verificaríamos o token em uma tabela de tokens de redefinição
      
      // Verificar se o usuário existe
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .limit(1);
      
      if (userError) {
        console.error("Erro ao verificar usuário para redefinição de senha:", userError);
        return res.status(500).json({ message: "Ocorreu um erro ao processar sua solicitação" });
      }
      
      if (!users || users.length === 0) {
        // Por segurança, não revelamos que o usuário não existe
        return res.status(400).json({ message: "Token inválido ou expirado" });
      }
      
      // Atualizar a senha do usuário
      const hashedPassword = await hashPassword(password);
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ password: hashedPassword })
        .eq('email', email);
      
      if (updateError) {
        console.error("Erro ao atualizar senha:", updateError);
        return res.status(500).json({ message: "Erro ao atualizar senha" });
      }
      
      console.log("Senha redefinida com sucesso para:", email);
      
      // Retornar sucesso
      res.status(200).json({
        message: "Senha atualizada com sucesso. Você já pode fazer login com sua nova senha."
      });
    } catch (error) {
      console.error("Erro não tratado na redefinição de senha:", error);
      res.status(500).json({ message: "Erro ao processar a solicitação" });
    }
  });
}