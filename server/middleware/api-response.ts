import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para garantir que todas as respostas da API sejam JSON
 * Isso resolve o problema de "Unexpected token '<'" no cliente
 */
export function ensureJsonResponse(req: Request, res: Response, next: NextFunction) {
  const originalSend = res.send;
  const originalEnd = res.end;
  const originalJson = res.json;

  if (req.path.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
  }

  res.send = function(body?: any): Response {
    if (req.path.startsWith('/api/')) {
      if (body && typeof body === 'string' && !body.trim().startsWith('{') && !body.trim().startsWith('[')) {
        try {
          JSON.parse(body);
        } catch (e) {
          body = JSON.stringify({ 
            error: true, 
            message: 'Resposta inválida convertida para JSON',
            originalBody: body.substring(0, 100) + (body.length > 100 ? '...' : ''),
            path: req.path
          });
          res.setHeader('Content-Type', 'application/json');
        }
      }
    }
    return originalSend.call(this, body);
  };

  res.json = function(body?: any): Response {
    res.setHeader('Content-Type', 'application/json');
    return originalJson.call(this, body);
  };

  res.end = function(chunk?: any, encoding?: BufferEncoding): Response {
    if (req.path.startsWith('/api/') && chunk && typeof chunk === 'string' && 
        !chunk.trim().startsWith('{') && !chunk.trim().startsWith('[')) {
      try {
        JSON.parse(chunk);
      } catch (e) {
        chunk = JSON.stringify({ 
          error: true, 
          message: 'Resposta inválida convertida para JSON',
          originalBody: chunk.substring(0, 100) + (chunk.length > 100 ? '...' : ''),
          path: req.path
        });
        res.setHeader('Content-Type', 'application/json');
      }
    }
    return originalEnd.call(this, chunk, encoding);
  };

  next();
}

/**
 * Middleware para tratar erros e garantir que sejam retornados como JSON
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Erro na API:', err);
  
  if (req.path.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
  }
  
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Erro interno no servidor";
  
  res.status(status).json({ 
    error: true,
    message,
    path: req.path,
    timestamp: new Date().toISOString()
  });
}
