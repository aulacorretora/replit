import './env.js';

import express, { type Request, Response, NextFunction } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { ensureJsonResponse, errorHandler } from "./middleware/api-response";

// Declarar o tipo da sessão para incluir o usuário
declare module 'express-session' {
  interface SessionData {
    user: any;
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(ensureJsonResponse);

// Diretorios para upload são configurados no módulo lib/upload
// Sessão é configurada em server/auth.ts

// Para desenvolvimento apenas, registra as sessões
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production' && req.path.startsWith('/api/auth/')) {
    console.log(`${req.method} ${req.path} - Session ID: ${req.sessionID || 'undefined'}`);
    
    // Verificar se req.session existe antes de acessá-lo
    if (req.session) {
      console.log('Session data:', req.session);
      if (req.session.user) {
        console.log('User in session:', req.session.user.id, req.session.user.email);
      }
    } else {
      console.log('Session data: undefined (session middleware ainda não foi inicializado)');
    }
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
