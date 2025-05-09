# Configuração do Nginx para ZapBan

Este documento contém a configuração recomendada do Nginx para o ZapBan, garantindo que as requisições API e WebSocket sejam corretamente encaminhadas para o servidor Node.js.

## Configuração Básica

```nginx
server {
    listen 80;
    server_name zapban.com www.zapban.com;
    
    # Redirecionar para HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name zapban.com www.zapban.com;
    
    # Configuração SSL
    ssl_certificate /etc/letsencrypt/live/zapban.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/zapban.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    
    # Configuração de segurança
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
    
    # Configuração de cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
    
    # Configuração para API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Importante: Garantir que o Content-Type seja preservado
        proxy_set_header Accept-Encoding "";
        
        # Aumentar timeout para operações longas
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
    # Configuração específica para WebSockets
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_read_timeout 86400; # 24 horas
    }
    
    # Configuração para o frontend
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Verificação da Configuração

Após aplicar a configuração, verifique se está correta:

```bash
sudo nginx -t
```

Se a configuração estiver correta, reinicie o Nginx:

```bash
sudo systemctl restart nginx
```

## Solução de Problemas

### Erro de API retornando HTML em vez de JSON

Se a API estiver retornando HTML em vez de JSON, verifique:

1. Se o servidor Node.js está rodando corretamente: `pm2 status zapban`
2. Se as rotas da API estão sendo corretamente encaminhadas: `curl -I http://localhost:5000/api/health`
3. Se o Nginx está configurado corretamente: `sudo nginx -t`
4. Se há erros nos logs do Nginx: `sudo tail -f /var/log/nginx/error.log`
5. Se há erros nos logs da aplicação: `pm2 logs zapban`

### Erro de WebSocket

Se a conexão WebSocket estiver falhando:

1. Verifique se o Nginx está configurado corretamente para WebSocket
2. Verifique os logs da aplicação: `pm2 logs zapban`
3. Teste a conexão WebSocket: `curl -I -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:5000/ws`
