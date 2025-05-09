

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Iniciando correção de problemas de autenticação no ZapBan...${NC}"
echo "----------------------------------------"

echo -e "${YELLOW}Verificando configuração do Nginx...${NC}"
if [ -f /etc/nginx/sites-available/zapban.com ]; then
    echo -e "${GREEN}✓ Arquivo de configuração do Nginx encontrado${NC}"
    
    if grep -q "location /api/" /etc/nginx/sites-available/zapban.com; then
        echo -e "${GREEN}✓ Configuração de API encontrada no Nginx${NC}"
    else
        echo -e "${RED}✗ Configuração de API não encontrada no Nginx${NC}"
        echo "Atualizando configuração do Nginx..."
        
        sudo cp /etc/nginx/sites-available/zapban.com /etc/nginx/sites-available/zapban.com.bak
        
        sudo tee /etc/nginx/sites-available/zapban.com > /dev/null << 'EOL'
server {
    listen 80;
    server_name zapban.com www.zapban.com;
    
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name zapban.com www.zapban.com;
    
    ssl_certificate /etc/letsencrypt/live/zapban.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/zapban.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
    
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
        
        proxy_set_header Accept-Encoding "";
        
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
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
EOL
        
        sudo nginx -t
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Configuração do Nginx atualizada com sucesso${NC}"
            sudo systemctl restart nginx
            echo -e "${GREEN}✓ Nginx reiniciado${NC}"
        else
            echo -e "${RED}✗ Erro na configuração do Nginx${NC}"
            echo "Restaurando backup..."
            sudo cp /etc/nginx/sites-available/zapban.com.bak /etc/nginx/sites-available/zapban.com
            sudo systemctl restart nginx
        fi
    fi
else
    echo -e "${RED}✗ Arquivo de configuração do Nginx não encontrado${NC}"
    echo "Criando configuração do Nginx..."
    
    sudo tee /etc/nginx/sites-available/zapban.com > /dev/null << 'EOL'
server {
    listen 80;
    server_name zapban.com www.zapban.com;
    
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name zapban.com www.zapban.com;
    
    ssl_certificate /etc/letsencrypt/live/zapban.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/zapban.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
    
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
        
        proxy_set_header Accept-Encoding "";
        
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
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
EOL
    
    sudo ln -sf /etc/nginx/sites-available/zapban.com /etc/nginx/sites-enabled/
    
    sudo nginx -t
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Configuração do Nginx criada com sucesso${NC}"
        sudo systemctl restart nginx
        echo -e "${GREEN}✓ Nginx reiniciado${NC}"
    else
        echo -e "${RED}✗ Erro na configuração do Nginx${NC}"
    fi
fi

echo "----------------------------------------"

echo -e "${YELLOW}Verificando variáveis de ambiente...${NC}"
if [ -f /var/www/zapban/.env ]; then
    echo -e "${GREEN}✓ Arquivo .env encontrado${NC}"
    
    if grep -q "SUPABASE_URL" /var/www/zapban/.env && \
       grep -q "SUPABASE_ANON_KEY" /var/www/zapban/.env && \
       grep -q "SUPABASE_SERVICE_KEY" /var/www/zapban/.env; then
        echo -e "${GREEN}✓ Variáveis do Supabase encontradas no .env${NC}"
    else
        echo -e "${RED}✗ Variáveis do Supabase não encontradas no .env${NC}"
        echo "Atualizando arquivo .env..."
        
        cp /var/www/zapban/.env /var/www/zapban/.env.bak
        
        if ! grep -q "SUPABASE_URL" /var/www/zapban/.env; then
            echo "SUPABASE_URL=[INSIRA_URL_SUPABASE]" >> /var/www/zapban/.env
            echo "Por favor, substitua [INSIRA_URL_SUPABASE] pela URL real do Supabase"
        fi
        
        if ! grep -q "SUPABASE_ANON_KEY" /var/www/zapban/.env; then
            echo "SUPABASE_ANON_KEY=[INSIRA_ANON_KEY_SUPABASE]" >> /var/www/zapban/.env
            echo "Por favor, substitua [INSIRA_ANON_KEY_SUPABASE] pela chave anônima real do Supabase"
        fi
        
        if ! grep -q "SUPABASE_SERVICE_KEY" /var/www/zapban/.env; then
            echo "SUPABASE_SERVICE_KEY=[INSIRA_SERVICE_KEY_SUPABASE]" >> /var/www/zapban/.env
            echo "Por favor, substitua [INSIRA_SERVICE_KEY_SUPABASE] pela chave de serviço real do Supabase"
        fi
        
        echo -e "${GREEN}✓ Variáveis do Supabase adicionadas ao .env${NC}"
    fi
else
    echo -e "${RED}✗ Arquivo .env não encontrado${NC}"
    echo "Criando arquivo .env..."
    
    cat > /var/www/zapban/.env << EOL
SUPABASE_URL=[INSIRA_URL_SUPABASE]
SUPABASE_ANON_KEY=[INSIRA_ANON_KEY_SUPABASE]
SUPABASE_SERVICE_KEY=[INSIRA_SERVICE_KEY_SUPABASE]

DATABASE_URL=[INSIRA_DATABASE_URL]

NODE_ENV=production
PORT=5000
SESSION_SECRET=$(openssl rand -hex 32)

WHATSAPP_SESSIONS_DIR=/var/www/zapban/whatsapp-sessions
EOL
    
    echo -e "${GREEN}✓ Arquivo .env criado com sucesso${NC}"
    echo "Por favor, substitua os valores entre colchetes pelas credenciais reais do Supabase"
fi

echo "----------------------------------------"

echo -e "${YELLOW}Reiniciando a aplicação...${NC}"
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}✓ PM2 encontrado${NC}"
    
    if pm2 list | grep -q "zapban"; then
        echo -e "${GREEN}✓ Aplicação zapban encontrada no PM2${NC}"
        
        pm2 restart zapban
        echo -e "${GREEN}✓ Aplicação reiniciada${NC}"
    else
        echo -e "${RED}✗ Aplicação zapban não encontrada no PM2${NC}"
        echo "Iniciando a aplicação..."
        
        if [ -f /var/www/zapban/ecosystem.config.js ]; then
            cd /var/www/zapban
            pm2 start ecosystem.config.js
            echo -e "${GREEN}✓ Aplicação iniciada com ecosystem.config.js${NC}"
        else
            cd /var/www/zapban
            pm2 start dist/index.js --name zapban
            echo -e "${GREEN}✓ Aplicação iniciada${NC}"
        fi
        
        pm2 save
    fi
else
    echo -e "${RED}✗ PM2 não encontrado${NC}"
    echo "Instalando PM2..."
    npm install -g pm2
    
    cd /var/www/zapban
    if [ -f /var/www/zapban/ecosystem.config.js ]; then
        pm2 start ecosystem.config.js
    else
        pm2 start dist/index.js --name zapban
    fi
    
    pm2 save
    pm2 startup
    echo -e "${GREEN}✓ PM2 instalado e aplicação iniciada${NC}"
fi

echo "----------------------------------------"

echo -e "${YELLOW}Testando a API...${NC}"
echo "Aguardando a aplicação iniciar..."
sleep 5

echo -e "${YELLOW}Testando endpoint de saúde...${NC}"
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health)
if [ "$HEALTH_RESPONSE" == "200" ]; then
    echo -e "${GREEN}✓ Endpoint de saúde respondendo corretamente (200)${NC}"
    echo "Resposta completa:"
    curl -s http://localhost:5000/api/health | json_pp
else
    echo -e "${RED}✗ Endpoint de saúde falhou com código $HEALTH_RESPONSE${NC}"
    echo "Resposta de erro:"
    curl -s http://localhost:5000/api/health
fi

echo -e "${YELLOW}Testando endpoint de usuário...${NC}"
USER_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/auth/user)
if [ "$USER_RESPONSE" == "401" ] || [ "$USER_RESPONSE" == "403" ]; then
    echo -e "${GREEN}✓ Endpoint de usuário retornando código de não autenticado ($USER_RESPONSE) como esperado${NC}"
    CONTENT_TYPE=$(curl -s -I http://localhost:5000/api/auth/user | grep -i content-type)
    if [[ $CONTENT_TYPE == *"application/json"* ]]; then
        echo -e "${GREEN}✓ Resposta é do tipo application/json${NC}"
    else
        echo -e "${RED}✗ Resposta não é do tipo application/json: $CONTENT_TYPE${NC}"
    fi
    echo "Resposta completa:"
    curl -s http://localhost:5000/api/auth/user
else
    echo -e "${RED}✗ Endpoint de usuário retornou código inesperado: $USER_RESPONSE${NC}"
    echo "Resposta de erro:"
    curl -s http://localhost:5000/api/auth/user
fi

echo "----------------------------------------"

echo -e "${YELLOW}Verificando logs da aplicação...${NC}"
pm2 logs zapban --lines 20

echo "----------------------------------------"

echo -e "${GREEN}Correção de problemas de autenticação concluída!${NC}"
echo "Se ainda houver problemas, verifique os logs da aplicação com 'pm2 logs zapban'"
