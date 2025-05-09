import { Request, Response } from "express";
import { supabase } from "../supabase";

/**
 * Controlador para diagnóstico da API
 * Usado para verificar a configuração do servidor e ambiente
 */
export const diagnosticsController = {
  /**
   * Endpoint de diagnóstico para verificar a saúde da API
   */
  healthCheck: async (req: Request, res: Response) => {
    try {
      const { data: supabaseHealth, error: supabaseError } = await supabase
        .from('users')
        .select('count(*)', { count: 'exact' })
        .limit(1);

      const environment = {
        nodeEnv: process.env.NODE_ENV || 'development',
        supabaseUrl: process.env.SUPABASE_URL ? 'configurado' : 'não configurado',
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY ? 'configurado' : 'não configurado',
        supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY ? 'configurado' : 'não configurado',
        sessionSecret: process.env.SESSION_SECRET ? 'configurado' : 'não configurado',
        port: process.env.PORT || '5000',
        headers: {
          host: req.headers.host,
          userAgent: req.headers['user-agent'],
          contentType: req.headers['content-type'],
          accept: req.headers.accept,
          xForwardedFor: req.headers['x-forwarded-for'],
          xRealIp: req.headers['x-real-ip']
        }
      };

      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        supabase: {
          connected: !supabaseError,
          error: supabaseError ? supabaseError.message : null,
          data: supabaseHealth
        },
        environment,
        session: {
          id: req.sessionID || 'não disponível',
          authenticated: req.isAuthenticated ? req.isAuthenticated() : false,
          hasSession: !!req.session
        }
      });
    } catch (error: any) {
      res.status(500).json({
        status: 'error',
        message: error.message || 'Erro interno no servidor',
        timestamp: new Date().toISOString()
      });
    }
  },

  /**
   * Endpoint para verificar o status do WebSocket
   */
  wsStatus: (req: Request, res: Response) => {
    const wsSupported = req.headers.upgrade === 'websocket' || 
                        req.headers.connection?.includes('upgrade');

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      websocket: {
        supported: wsSupported,
        headers: {
          upgrade: req.headers.upgrade,
          connection: req.headers.connection
        }
      }
    });
  }
};
