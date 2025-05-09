# Instruções de Migração e Implantação do ZapBan

Este documento contém as etapas para migrar o projeto ZapBan da ambiente de desenvolvimento para o servidor de produção.

## Credenciais e Acessos

**VPS (Servidor)**
- IP: 212.85.22.36
- Porta: 22
- Usuário: root
- Senha: [REDACTED]

**GitHub**
- Repositório: https://github.com/aulacorretora/replit
- Usuário: aulacorretora2023@gmail.com
- Senha: [REDACTED]

**Supabase**
- Projeto: Devin ZapBan
- URL: [SUPABASE_URL]
- Usuário: seguewell@gmail.com
- Senha: [REDACTED]
- Anon Key: [SUPABASE_ANON_KEY]
- Service Role Key: [SUPABASE_SERVICE_KEY]
- Obs: As chaves reais devem ser obtidas do painel do Supabase e nunca armazenadas em arquivos de código

**Domínio**
- zapban.com

## Processo de Migração para a VPS

### 1. Acesso e Limpeza do Servidor

```bash
# Acesso SSH ao servidor
ssh root@212.85.22.36

# Verificar se existem containers Docker rodando
docker ps -a

# Parar e remover todos os containers (se houver)
docker stop $(docker ps -a -q)
docker rm $(docker ps -a -q)

# Limpar imagens Docker (se necessário)
docker rmi $(docker images -q)

# Limpar diretório web (com cuidado)
rm -rf /var/www/*
```

### 2. Instalação de Dependências no Servidor

```bash
# Atualizar o sistema
apt update && apt upgrade -y

# Instalar pacotes básicos
apt install -y git curl wget nano vim build-essential nginx certbot python3-certbot-nginx

# Instalar Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verificar instalação
node -v  # Deve mostrar v20.x.x
npm -v   # Deve mostrar 9.x.x ou superior

# Instalar PM2 para gerenciamento de processos
npm install -g pm2
```

### 3. Clonar o Repositório e Instalar Dependências

```bash
# Criar diretório para aplicação
mkdir -p /var/www/zapban

# Clonar o repositório
cd /var/www/zapban
git clone https://github.com/aulacorretora/replit .

# Instalar dependências
npm install

# Verificar se há necessidade de criar arquivos de configuração
```

### 4. Configuração do Banco de Dados

Configurar o arquivo de variáveis de ambiente para conectar ao Supabase:

```bash
# Criar arquivo .env (substitua os valores entre colchetes pelas credenciais reais)
cat > /var/www/zapban/.env << EOL
DATABASE_URL=postgres://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
SUPABASE_URL=[SUPABASE_URL]
SUPABASE_ANON_KEY=[SUPABASE_ANON_KEY]
SUPABASE_SERVICE_KEY=[SUPABASE_SERVICE_KEY]
SESSION_SECRET=$(openssl rand -hex 32)
EOL

# Ajustar permissões
chmod 600 /var/www/zapban/.env
```

### 5. Compilar e Construir a Aplicação

```bash
# Executar build da aplicação
cd /var/www/zapban
npm run build

# Verificar se o build foi concluído com sucesso
ls -la dist/
```

### 6. Configurar Nginx para o Domínio

```bash
# Criar configuração do site
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
    
    # Configuração especial para WebSockets
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
    }
}
EOL

# Habilitar o site
ln -s /etc/nginx/sites-available/zapban /etc/nginx/sites-enabled/

# Testar configuração do Nginx
nginx -t

# Reiniciar o Nginx
systemctl restart nginx
```

### 7. Configurar SSL com Let's Encrypt

```bash
# Obter certificado SSL
certbot --nginx -d zapban.com -d www.zapban.com

# Verificar renovação automática
certbot renew --dry-run
```

### 8. Iniciar a Aplicação com PM2

```bash
# Navegar até o diretório da aplicação
cd /var/www/zapban

# Iniciar a aplicação com PM2 (ajuste o comando conforme necessário)
pm2 start npm --name "zapban" -- run start

# Configurar para iniciar com o sistema
pm2 startup
pm2 save
```

### 9. Configuração de Diretórios para WhatsApp/Baileys

```bash
# Criar diretório para armazenar sessões do WhatsApp
mkdir -p /var/www/zapban/whatsapp-sessions
chmod 770 /var/www/zapban/whatsapp-sessions

# Criar diretório para uploads
mkdir -p /var/www/zapban/uploads
chmod 770 /var/www/zapban/uploads
```

### 10. Configurações de Firewall para WhatsApp/Baileys

```bash
# Instalar e configurar UFW (Uncomplicated Firewall)
apt install -y ufw

# Configurar regras básicas
ufw default deny incoming
ufw default allow outgoing

# Permitir SSH, HTTP, HTTPS
ufw allow ssh
ufw allow http
ufw allow https

# Permitir porta do aplicativo
ufw allow 5000

# Ativar firewall
ufw enable
```

### 11. Testar a Instalação

1. Acesse https://zapban.com
2. Verifique se consegue fazer login
3. Verifique se consegue criar instâncias e gerar QR codes
4. Teste a conexão do WhatsApp (escaneando o QR code)
5. Verifique os logs para garantir que não há erros

### 12. Monitoramento e Logs

```bash
# Verificar logs da aplicação
pm2 logs zapban

# Verificar status da aplicação
pm2 status

# Monitorar recursos
pm2 monit
```

## Resolução de Problemas com Baileys/WhatsApp

Se a conexão estiver travando em "Logging in..." após escanear o QR code:

1. Verifique permissões dos diretórios de sessão:
```bash
chmod -R 770 /var/www/zapban/whatsapp-sessions
```

2. Verifique logs específicos:
```bash
tail -f /var/www/zapban/logs/baileys-error.log
```

3. Teste regras de firewall para comunicação WebSocket:
```bash
# Verificar estado atual do firewall
ufw status

# Habilitar tráfego de WebSocket explicitamente
ufw allow out 443
```

4. Verificar se a porta 443 está realmente aberta e acessível:
```bash
nc -vz web.whatsapp.com 443
```

5. Se necessário, adicione o domínio do WhatsApp aos hosts conhecidos:
```bash
curl -v https://web.whatsapp.com/
```

## Manutenção Contínua

- Configure um cronjob para atualizar regularmente o SSL:
```bash
crontab -e
# Adicione a linha:
0 3 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
```

- Configure backup regular do banco de dados e arquivos críticos

## Verificação Final

1. Acessos administrativos estão funcionando
2. Todas as funcionalidades principais estão operacionais
3. WhatsApp está conectando corretamente
4. SSL está configurado e funcionando
5. Sistema inicia automaticamente após reinicialização do servidor

---

## Notas Adicionais para o Problema do WhatsApp

O problema do WhatsApp travar em "Logging in..." provavelmente está relacionado a:

1. Bloqueio de conexão WebSocket de longa duração no ambiente Replit
2. Necessidade de ajustar o makeWASocket com configuração específica para o ambiente de produção
3. Possível bloqueio de portas ou domínios necessários para o WhatsApp

No servidor VPS, essas limitações não devem ocorrer, pois temos controle total sobre o ambiente de rede.
