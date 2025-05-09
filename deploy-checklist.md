# Checklist de Migração para VPS - ZapBan

## Resumo Executivo
Este documento confirma a sequência de passos para migrar o sistema ZapBan do ambiente Replit para a VPS dedicada, garantindo a resolução do problema de conexão WebSocket com WhatsApp.

## Credenciais Confirmadas

**VPS (Servidor)**
- IP: 212.85.22.36
- Porta: 22
- Usuário: root
- Senha: [SENHA FORNECIDA]

**GitHub**
- Repositório: https://github.com/aulacorretora/replit.git
- Usuário: aulacorretora2023@gmail.com
- Senha: [SENHA FORNECIDA]

**Supabase**
- URL: https://gqjfbdqgcjvdnbvcupcf.supabase.co
- API Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxamZiZHFnY2p2ZG5idmN1cGNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MDAzNjksImV4cCI6MjA2MTk3NjM2OX0.x-hqQJYG2dcdmAxu6MGdWEdUFI3GjffxGBvzat2oAX4
- Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxamZiZHFnY2p2ZG5idmN1cGNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQwMDM2OSwiZXhwIjoyMDYxOTc2MzY5fQ.wI3QXmtlkUlNjBHsd-HPlbQfQF0fX0sysoNoOYviqHo

**Domínio**
- zapban.com (já configurado com DNS apontando para o IP)

## Etapas de Migração Detalhadas

### 1. 🧹 Limpeza da VPS

```bash
# Acessar a VPS
ssh root@212.85.22.36

# Verificar e parar serviços existentes
systemctl stop nginx
pm2 stop all

# Remover containers Docker (se houver)
docker stop $(docker ps -a -q) || true
docker rm $(docker ps -a -q) || true
docker rmi $(docker images -q) || true

# Limpar diretório de aplicação anterior
rm -rf /var/www/*

# Verificar processos usando portas relevantes
lsof -i :80
lsof -i :443
lsof -i :5000
```

### 2. 🧬 Configuração do Ambiente

```bash
# Instalar dependências essenciais
apt update && apt upgrade -y
apt install -y git curl wget nano vim build-essential nginx certbot python3-certbot-nginx

# Instalar Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verificar instalações
node -v
npm -v

# Instalar PM2 para gestão de processos
npm install -g pm2
```

### 3. 🧬 Clonagem do Repositório

```bash
# Criar diretório para aplicação
mkdir -p /var/www/zapban

# Clonar o repositório
cd /var/www/zapban
git clone https://github.com/aulacorretora/replit.git .

# Verificar os arquivos
ls -la
```

### 4. 🔐 Configuração de Variáveis de Ambiente

```bash
# Criar arquivo .env
cat > /var/www/zapban/.env << EOL
DATABASE_URL=postgres://postgres.gqjfbdqgcjvdnbvcupcf:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://gqjfbdqgcjvdnbvcupcf.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxamZiZHFnY2p2ZG5idmN1cGNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MDAzNjksImV4cCI6MjA2MTk3NjM2OX0.x-hqQJYG2dcdmAxu6MGdWEdUFI3GjffxGBvzat2oAX4
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxamZiZHFnY2p2ZG5idmN1cGNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQwMDM2OSwiZXhwIjoyMDYxOTc2MzY5fQ.wI3QXmtlkUlNjBHsd-HPlbQfQF0fX0sysoNoOYviqHo
SESSION_SECRET=zapban_session_secret_key_change_in_production
NODE_ENV=production
EOL

# Proteger o arquivo .env
chmod 600 /var/www/zapban/.env
```

### 5. 📦 Compilação e Instalação

```bash
# Instalar dependências
cd /var/www/zapban
npm install

# Criar diretórios para sessões e uploads
mkdir -p whatsapp-sessions
mkdir -p uploads
chmod 770 whatsapp-sessions
chmod 770 uploads

# Compilar a aplicação
npm run build
```

### 6. 🌐 Configuração Nginx e SSL

```bash
# Criar configuração para o site
cat > /etc/nginx/sites-available/zapban << EOL
server {
    listen 80;
    server_name zapban.com www.zapban.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Configuração específica para WebSockets
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_buffering off;
        proxy_read_timeout 86400;
    }
}
EOL

# Habilitar o site
ln -s /etc/nginx/sites-available/zapban /etc/nginx/sites-enabled/

# Verificar e remover o default se necessário
rm -f /etc/nginx/sites-enabled/default

# Testar configuração
nginx -t

# Reiniciar Nginx
systemctl restart nginx

# Obter certificado SSL
certbot --nginx -d zapban.com -d www.zapban.com

# Verificar renovação automática
certbot renew --dry-run
```

### 7. ✅ Iniciar a Aplicação

```bash
# Configurar ajustes específicos para resolver o problema do Baileys/WhatsApp
cd /var/www/zapban
nano server/services/baileys.ts
# [Aplicar os ajustes conforme detalhado em ajustes-conexao-whatsapp.md]

# Iniciar a aplicação com PM2
pm2 start npm --name "zapban" -- run start

# Configurar inicialização automática
pm2 startup
pm2 save

# Verificar status
pm2 status
```

### 8. ✅ Testes de Validação

1. Acessar https://zapban.com
2. Fazer login com as credenciais 
   - Email: wellnessa13@gmail.com
   - Senha: 12345678
3. Acessar a página de instâncias
4. Gerar QR Code
5. Escanear com um dispositivo real
6. **PONTO CRÍTICO**: Verificar se o estado "Logging in..." progride para "Conectado"
7. Testar envio de mensagem

### 9. 🔍 Monitoramento e Logs

```bash
# Monitoramento em tempo real
pm2 monit

# Verificar logs da aplicação
pm2 logs zapban

# Verificar logs específicos do Baileys (se implementado)
tail -f /var/www/zapban/logs/baileys-info.log
tail -f /var/www/zapban/logs/baileys-error.log
```

## Verificação Final

Confirmar que:

- [  ] Site está acessível via HTTPS (https://zapban.com)
- [  ] Login funciona corretamente
- [  ] QR Code é gerado adequadamente
- [  ] Conexão com WhatsApp é estabelecida completamente (superando o problema do "Logging in...")
- [  ] Envio e recebimento de mensagens funcionam
- [  ] Sistema reinicia automaticamente após reboot do servidor

## Contato para Suporte

Informar o resultado da migração assim que os testes estiverem concluídos.
