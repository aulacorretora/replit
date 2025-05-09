# Instruções para Implantação na VPS

Este documento contém instruções detalhadas para implantar o sistema ZapBan na VPS, incluindo as melhorias de WebSocket e configuração do PM2.

## 1. Acesso à VPS

```bash
ssh root@212.85.22.36
# Senha: mDwjP$@"@UJnt7Q/
```

## 2. Preparação do Ambiente

### Instalar Dependências

```bash
apt update
apt install -y nodejs npm git nginx certbot python3-certbot-nginx
```

### Instalar Node.js 18 (LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
```

### Instalar PM2 Globalmente

```bash
npm install -g pm2
```

## 3. Configuração do Diretório da Aplicação

```bash
mkdir -p /var/www/zapban
mkdir -p /var/www/zapban/logs
mkdir -p /var/www/zapban/whatsapp-sessions
chmod -R 755 /var/www/zapban
```

## 4. Clonar e Configurar o Repositório

```bash
cd /var/www/zapban
git clone https://github.com/aulacorretora/replit.git .
npm install
npm run build
```

## 5. Configuração do PM2

O arquivo `ecosystem.config.js` já está configurado no repositório. Para iniciar a aplicação com PM2:

```bash
pm2 start ecosystem.config.js
```

Para configurar o PM2 para iniciar automaticamente na inicialização do sistema:

```bash
pm2 startup
pm2 save
```

## 6. Configuração do Nginx

Criar arquivo de configuração do Nginx:

```bash
nano /etc/nginx/sites-available/zapban.com
```

Adicionar a seguinte configuração:

```nginx
server {
    listen 80;
    server_name zapban.com www.zapban.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Configurações específicas para WebSocket
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 60s;
        proxy_buffering off;
    }
}
```

Ativar o site e configurar SSL:

```bash
ln -s /etc/nginx/sites-available/zapban.com /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
certbot --nginx -d zapban.com -d www.zapban.com
```

## 7. Configuração do Script de Verificação de Conectividade

Copiar o script de verificação para o diretório correto:

```bash
cp /var/www/zapban/scripts/check-whatsapp.sh /var/www/zapban/
chmod +x /var/www/zapban/check-whatsapp.sh
```

Configurar o cron para executar o script periodicamente:

```bash
crontab -e
```

Adicionar a linha:

```
*/15 * * * * /var/www/zapban/check-whatsapp.sh
```

## 8. Verificação da Implantação

Para verificar se a aplicação está funcionando corretamente:

```bash
# Verificar status do PM2
pm2 status

# Verificar logs da aplicação
pm2 logs zapban

# Verificar se o Nginx está funcionando
systemctl status nginx

# Testar a API
curl http://localhost:5000/api/health
```

## 9. Solução de Problemas

### Problema de Conexão WebSocket

Se a conexão WebSocket estiver falhando:

1. Verifique se o Nginx está configurado corretamente para WebSocket
2. Verifique os logs da aplicação: `pm2 logs zapban`
3. Verifique se as portas necessárias estão abertas no firewall

### Problema com Sessões do WhatsApp

Se as sessões do WhatsApp não estiverem sendo salvas corretamente:

1. Verifique as permissões do diretório: `chmod -R 755 /var/www/zapban/whatsapp-sessions`
2. Verifique se o diretório existe: `ls -la /var/www/zapban/whatsapp-sessions`
3. Verifique os logs para erros relacionados ao sistema de arquivos

### Problema com PM2

Se o PM2 não estiver gerenciando corretamente a aplicação:

1. Reinicie o PM2: `pm2 restart zapban`
2. Verifique a configuração: `cat /var/www/zapban/ecosystem.config.js`
3. Verifique os logs: `pm2 logs zapban`

## 10. Manutenção

Para atualizar a aplicação com novas versões:

```bash
cd /var/www/zapban
git pull
npm install
npm run build
pm2 restart zapban
```
